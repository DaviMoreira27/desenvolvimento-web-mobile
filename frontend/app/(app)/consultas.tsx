import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/auth/useAuth";
import { useConsultas } from "../../hooks/useConsultas";
import { useMetasPaciente } from "../../hooks/useMetasPaciente";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../hooks/useToast";
import { useUserProfile } from "../../hooks/useUserProfile";
import { API_URL } from "../../lib/api";

function MetasModal({
  pacienteId,
  pacienteNome,
  onClose,
}: {
  pacienteId: number | null;
  pacienteNome: string;
  onClose: () => void;
}) {
  const { metas, isLoading } = useMetasPaciente(pacienteId);

  const pendentes = metas.filter((m) => !m.concluida);
  const concluidas = metas.filter((m) => m.concluida);

  return (
    <Modal
      visible={pacienteId !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.confirmOverlay}>
        <View style={[styles.confirmBox, { maxHeight: "80%" }]}>
          <Text style={styles.confirmTitle}>Metas de {pacienteNome}</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color="#19c10f" style={{ marginVertical: 24 }} />
          ) : metas.length === 0 ? (
            <Text style={styles.metasEmpty}>Nenhuma meta cadastrada.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {pendentes.map((meta) => (
                <View key={meta.id} style={styles.metaRow}>
                  <View style={styles.metaCircle} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaTitulo}>{meta.titulo}</Text>
                    {meta.descricao ? (
                      <Text style={styles.metaDescricao}>{meta.descricao}</Text>
                    ) : null}
                  </View>
                </View>
              ))}

              {concluidas.length > 0 && (
                <>
                  <Text style={styles.metasSectionLabel}>Concluídas</Text>
                  {concluidas.map((meta) => (
                    <View key={meta.id} style={styles.metaRow}>
                      <View style={[styles.metaCircle, styles.metaCircleDone]}>
                        <Text style={styles.metaCheckmark}>✓</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.metaTitulo, styles.metaTituloDone]}>
                          {meta.titulo}
                        </Text>
                        {meta.descricao ? (
                          <Text style={styles.metaDescricao}>{meta.descricao}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          <View style={[styles.confirmActions, { marginTop: 16 }]}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtnSecondary, pressed && { opacity: 0.75 }]}
              onPress={onClose}
            >
              <Text style={styles.confirmBtnSecondaryText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    concluído: { bg: "#dcfce7", text: "#15803d" },
    concluido: { bg: "#dcfce7", text: "#15803d" },
    concluida: { bg: "#dcfce7", text: "#15803d" },
    pendente: { bg: "#fef3c7", text: "#b45309" },
    agendado: { bg: "#dbeafe", text: "#1d4ed8" },
    agendada: { bg: "#dbeafe", text: "#1d4ed8" },
    cancelado: { bg: "#fee2e2", text: "#b91c1c" },
    cancelada: { bg: "#fee2e2", text: "#b91c1c" },
    aprovado: { bg: "#dcfce7", text: "#15803d" },
    aprovada: { bg: "#dcfce7", text: "#15803d" },
  };
  const key = status.toLowerCase();
  const style = map[key] ?? { bg: "#f1f5f9", text: "#475569" };
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return (
    <View style={[badge.pill, { backgroundColor: style.bg }]}>
      <Text style={[badge.text, { color: style.text }]}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "600" },
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function Consultas() {
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [metasPacienteId, setMetasPacienteId] = useState<number | null>(null);
  const [metasPacienteNome, setMetasPacienteNome] = useState<string>("");
  const { setOpenModal } = useModal();
  const { consultas, isLoading, error, concluir, cancelar } = useConsultas();
  const { showToast } = useToast();
  const { usuario, token } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isMedico = usuario?.tipo === "medico";
  const isNarrow = width < 560;
  const isVeryNarrow = width < 380;

  function handleConnectGoogle() {
    if (!token) return;

    const url = `${API_URL}/oauth/google/auth?token=${encodeURIComponent(token)}`;

    if (Platform.OS === "web") {
      window.location.href = url;
    } else {
      Linking.openURL(url);
    }
  }

  async function confirmarCancelamento() {
    if (cancelandoId === null) return;
    const id = cancelandoId;
    setCancelandoId(null);
    try {
      await cancelar(id);
      showToast("success", "Consulta cancelada.");
    } catch {
      showToast("error", "Erro ao cancelar consulta. Tente novamente.");
    }
  }

  const consultasFiltradas = consultas.filter((consulta) => {
    const q = searchText.toLowerCase();
    const pessoa = isMedico
      ? consulta.paciente?.nome ?? ""
      : consulta.medico?.nome ?? "";
    return (
      pessoa.toLowerCase().includes(q) ||
      consulta.status.toLowerCase().includes(q) ||
      consulta.tipo.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#19c10f" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Erro ao carregar consultas</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={[styles.container, isNarrow && styles.containerNarrow]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={isNarrow && !isMedico ? { paddingBottom: 88 } : undefined}
    >
      {/* Título + contexto do papel */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, isNarrow && styles.titleNarrow]}>
            Minhas consultas
        </Text>
      </View>

      {/* Barra de ações */}
      <View style={[styles.topBar, isNarrow && styles.topBarNarrow]}>
        <TextInput
          placeholder={
            isMedico
              ? "Buscar por paciente, tipo ou status..."
              : "Buscar por médico, tipo ou status..."
          }
          placeholderTextColor="#94a3b8"
          style={[styles.search, searchFocused && styles.searchFocused]}
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />

        {!isMedico && !isNarrow && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
            onPress={() => setOpenModal(true)}
          >
            <Text style={styles.buttonText}>＋ Agendar</Text>
          </Pressable>
        )}
      </View>

      {/* Lista */}
      {consultas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyTitle}>Nenhuma consulta agendada</Text>
          {!isMedico && (
            <Text style={styles.emptySubtitle}>
              Clique em &quot;＋ Agendar&quot; para criar sua primeira consulta.
            </Text>
          )}
        </View>
      ) : consultasFiltradas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Nenhum resultado</Text>
          <Text style={styles.emptySubtitle}>Tente outro termo de busca.</Text>
        </View>
      ) : (
        consultasFiltradas.map((consulta) => {
          const pessoa = isMedico
            ? consulta.paciente?.nome ?? "—"
            : consulta.medico?.nome ?? "—";
          const pessoaLabel = isMedico ? "Paciente" : "Médico";
          const pessoaColor = isMedico ? "#1d4ed8" : "#15803d";
          const pessoaBg = isMedico ? "#dbeafe" : "#dcfce7";

          return (
            <View key={consulta.id} style={styles.card}>
              {/* Header: nome + etiqueta de papel + badge de status */}
              <View style={styles.cardHeader}>
                <View style={styles.cardPessoa}>
                  <View style={[styles.pessoaTag, { backgroundColor: pessoaBg }]}>
                    <Text style={[styles.pessoaTagText, { color: pessoaColor }]}>
                      {pessoaLabel}
                    </Text>
                  </View>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {pessoa}
                  </Text>
                </View>
                <StatusBadge status={consulta.status} />
              </View>

              {/* Info grid */}
              <View style={[styles.infoGrid, isNarrow && styles.infoGridNarrow]}>
                <View style={isNarrow ? styles.infoItemFull : styles.infoItem}>
                  <Text style={styles.infoLabel}>Data / Horário</Text>
                  <Text style={styles.infoValue}>
                    {new Date(consulta.dataHora).toLocaleDateString("pt-BR", { timeZone: "UTC" })} •{" "}
                    {new Date(consulta.dataHora).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                    })}
                  </Text>
                </View>

                <View style={isNarrow ? styles.infoItemHalf : styles.infoItem}>
                  <Text style={styles.infoLabel}>Tipo</Text>
                  <Text style={styles.infoValue}>{capitalize(consulta.tipo)}</Text>
                </View>

                <View style={isNarrow ? styles.infoItemHalf : styles.infoItem}>
                  <Text style={styles.infoLabel}>Pagamento</Text>
                  <StatusBadge status={consulta.statusPagamento} />
                </View>
              </View>

              {/* Footer */}
              <View style={[styles.cardFooter, isNarrow && styles.cardFooterNarrow]}>
                <Pressable
                  style={({ pressed }) => [styles.docBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => router.push(`/documentos/${consulta.id}`)}
                >
                  <Text style={styles.docBtnText}>📄 Ver documentos</Text>
                </Pressable>

                {!isMedico && consulta.statusPagamento.toLowerCase() === "pendente" && (
                  <View style={styles.payBtn}>
                    <Text style={styles.payBtnText}>💳 Pagar consulta</Text>
                  </View>
                )}

                {isMedico && consulta.paciente?.id != null && (
                  <Pressable
                    style={({ pressed }) => [styles.docBtn, pressed && { opacity: 0.75 }]}
                    onPress={() => {
                      setMetasPacienteId(consulta.paciente!.id);
                      setMetasPacienteNome(consulta.paciente?.nome ?? "paciente");
                    }}
                  >
                    <Text style={styles.docBtnText}>🎯 Ver metas</Text>
                  </Pressable>
                )}

                {consulta.tipo === "teleconsulta" && (
                  isMedico && !profile?.googleConectado ? (
                    <Pressable
                      style={({ pressed }) => [styles.meetBtn, pressed && { opacity: 0.85 }]}
                      onPress={handleConnectGoogle}
                    >
                      <Text style={styles.meetBtnText}>🔗 Conectar Google</Text>
                    </Pressable>
                  ) : consulta.linkMeet ? (
                    <Pressable
                      style={({ pressed }) => [styles.meetBtn, pressed && { opacity: 0.85 }]}
                      onPress={() => Linking.openURL(consulta.linkMeet!)}
                    >
                      <Text style={styles.meetBtnText}>🎥 Entrar via meet</Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.meetBtn, styles.meetBtnDisabled]}>
                      <Text style={[styles.meetBtnText, styles.meetBtnTextDisabled]}>
                        🎥 Aguardando link...
                      </Text>
                    </View>
                  )
                )}

                {isMedico && consulta.status === "agendada" && (
                  <Pressable
                    style={({ pressed }) => [styles.concludeBtn, pressed && { opacity: 0.75 }]}
                    onPress={async () => {
                      try {
                        await concluir(consulta.id);
                        showToast("success", "Consulta concluída.");
                      } catch {
                        showToast("error", "Erro ao concluir consulta.");
                      }
                    }}
                  >
                    <Text style={styles.concludeBtnText}>Concluir</Text>
                  </Pressable>
                )}

                {!isMedico && consulta.status === "agendada" && (
                  <Pressable
                    style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
                    onPress={() => setCancelandoId(consulta.id)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>

    {!isMedico && isNarrow && (
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => setOpenModal(true)}
      >
        <Text style={styles.fabText}>＋ Agendar</Text>
      </Pressable>
    )}

    <MetasModal
      pacienteId={metasPacienteId}
      pacienteNome={metasPacienteNome}
      onClose={() => setMetasPacienteId(null)}
    />

    <Modal visible={cancelandoId !== null} transparent animationType="fade" onRequestClose={() => setCancelandoId(null)}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Cancelar consulta</Text>
          <Text style={styles.confirmMessage}>
            Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtnSecondary, pressed && { opacity: 0.75 }]}
              onPress={() => setCancelandoId(null)}
            >
              <Text style={styles.confirmBtnSecondaryText}>Voltar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.confirmBtnDanger, pressed && { opacity: 0.75 }]}
              onPress={confirmarCancelamento}
            >
              <Text style={styles.confirmBtnDangerText}>Cancelar consulta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
  },

  containerNarrow: {
    padding: 16,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },

  titleNarrow: {
    fontSize: 20,
  },

  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },

  rolePillMedico: {
    backgroundColor: "#ede9fe",
  },

  rolePillPaciente: {
    backgroundColor: "#dcfce7",
  },

  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },

  roleTextMedico: {
    color: "#7c3aed",
  },

  roleTextPaciente: {
    color: "#15803d",
  },

  topBar: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    alignItems: "center",
  },

  topBarNarrow: {
    marginBottom: 14,
  },

  search: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    color: "#0f172a",
  },

  searchFocused: {
    borderColor: "#19c10f",
  },

  button: {
    backgroundColor: "#19c10f",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: "#19c10f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  fab: {
    position: "absolute",
    bottom: 28,
    left: 20,
    backgroundColor: "#19c10f",
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 50,
    shadowColor: "#19c10f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },

  fabText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  emptyCard: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
  },

  cardPessoa: {
    flex: 1,
    gap: 4,
  },

  pessoaTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },

  pessoaTagText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  cardName: {
    fontWeight: "700",
    fontSize: 16,
    color: "#0f172a",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },

  infoGridNarrow: {
    gap: 12,
  },

  infoItem: {
    flex: 1,
    minWidth: 120,
  },

  infoItemFull: {
    width: "100%",
  },

  infoItemHalf: {
    flex: 1,
    minWidth: 0,
  },

  infoLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  cardFooter: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 14,
    flexWrap: "wrap",
  },

  cardFooterNarrow: {
    gap: 8,
  },

  docBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },

  docBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
  },

  payBtn: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },

  payBtnText: {
    color: "#b45309",
    fontSize: 13,
    fontWeight: "600",
  },

  meetBtn: {
    backgroundColor: "#19c10f",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: "#19c10f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  meetBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  meetBtnDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
    elevation: 0,
  },

  meetBtnTextDisabled: {
    color: "#64748b",
  },

  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
  },

  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  confirmBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },

  confirmTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },

  confirmMessage: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
    marginBottom: 24,
  },

  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  confirmBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },

  confirmBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },

  confirmBtnDanger: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#ef4444",
  },

  confirmBtnDangerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },

  concludeBtn: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: "auto",
  },

  concludeBtnText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "600",
  },

  cancelBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: "auto",
  },

  cancelBtnText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
  },

  metasEmpty: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginVertical: 24,
  },

  metasSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  metaCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  metaCircleDone: {
    backgroundColor: "#19c10f",
    borderColor: "#19c10f",
  },

  metaCheckmark: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  metaTitulo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },

  metaTituloDone: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },

  metaDescricao: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
});
