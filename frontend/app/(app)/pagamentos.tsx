import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../hooks/auth/useAuth";
import { usePagamentos } from "../../hooks/usePagamentos";
import { useToast } from "../../hooks/useToast";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    aprovado: { bg: "#dcfce7", text: "#15803d" },
    aprovada: { bg: "#dcfce7", text: "#15803d" },
    pendente: { bg: "#fef3c7", text: "#b45309" },
    cancelado: { bg: "#fee2e2", text: "#b91c1c" },
    cancelada: { bg: "#fee2e2", text: "#b91c1c" },
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
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "600" },
});

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Pagamentos() {
  const { pagamentos, isLoading, error, confirmarPagamento } = usePagamentos();
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const isMedico = usuario?.tipo === "medico";

  async function handleConfirmarPagamento(id: number) {
    setConfirmandoId(id);
    try {
      await confirmarPagamento(id);
      showToast("success", "Pagamento confirmado.");
    } catch {
      showToast("error", "Erro ao confirmar pagamento. Tente novamente.");
    } finally {
      setConfirmandoId(null);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#19c10f" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao carregar pagamentos</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{isMedico ? "Recebimentos" : "Pagamentos"}</Text>

      {pagamentos.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>💳</Text>
          <Text style={styles.emptyTitle}>Nenhum pagamento encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Os pagamentos das suas consultas aparecerão aqui.
          </Text>
        </View>
      ) : (
        pagamentos.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.valor}>{formatCurrency(p.valor)}</Text>
              <StatusBadge status={p.status} />
            </View>

            {p.descricao ? (
              <Text style={styles.descricao}>{p.descricao}</Text>
            ) : null}

            <View style={styles.infoRow}>
              {isMedico && p.paciente && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Paciente</Text>
                  <Text style={styles.infoValue}>{p.paciente.nome}</Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Consulta</Text>
                <Text style={styles.infoValue}>
                  {new Date(p.consulta.dataHora).toLocaleDateString("pt-BR", { timeZone: "UTC" })} —{" "}
                  {p.consulta.tipo.charAt(0).toUpperCase() + p.consulta.tipo.slice(1)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Data do pagamento</Text>
                <Text style={styles.infoValue}>
                  {new Date(p.criadoEm).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </Text>
              </View>
            </View>

            {isMedico && p.status.toLowerCase() === "pendente" && (
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  pressed && { opacity: 0.85 },
                  confirmandoId === p.id && styles.buttonDisabled,
                ]}
                onPress={() => handleConfirmarPagamento(p.id)}
                disabled={confirmandoId === p.id}
              >
                {confirmandoId === p.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirmar pagamento</Text>
                )}
              </Pressable>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
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
    alignItems: "center",
    marginBottom: 10,
  },

  valor: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },

  descricao: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },

  infoItem: {
    flex: 1,
  },

  infoLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },

  confirmBtn: {
    backgroundColor: "#19c10f",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#19c10f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  confirmBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
});
