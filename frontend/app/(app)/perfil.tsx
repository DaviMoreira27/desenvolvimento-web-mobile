import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useUpdateProfile } from "../../hooks/useUpdateProfile";
import { useMetas } from "../../hooks/useMetas";
import { useToast } from "../../hooks/useToast";
import { DisponibilidadePanel } from "../../components/DisponibilidadePanel";

type Tab = "dados" | "historico" | "metas";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Perfil() {
  const [tab, setTab] = useState<Tab>("dados");
  const { profile, isLoading, error, refetch } = useUserProfile();
  const { isLoading: isSaving, updateProfile } = useUpdateProfile();
  const { showToast } = useToast();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFields, setEditFields] = useState({
    nome: "",
    telefone: "",
    fotoUrl: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [disponibilidadePanelOpen, setDisponibilidadePanelOpen] = useState(false);

  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [goalFields, setGoalFields] = useState({ titulo: "", descricao: "" });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#19c10f" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Erro ao carregar perfil</Text>
      </View>
    );
  }

  const tipoLabel = profile.tipo === "paciente" ? "Paciente" : "Médico";
  const tipoEmoji = profile.tipo === "paciente" ? "🏃" : "🩺";

  const ALL_TABS: { key: Tab; label: string }[] = [
    { key: "dados", label: "Dados pessoais" },
    { key: "historico", label: "Histórico de saúde" },
    { key: "metas", label: "Metas" },
  ];

  const TABS =
    profile.tipo === "medico"
      ? ALL_TABS.filter((t) => t.key !== "metas" && t.key !== "historico")
      : ALL_TABS;

  function openEditModal() {
    setEditFields({
      nome: profile!.nome,
      telefone: profile!.telefone ?? "",
      fotoUrl: profile!.fotoUrl ?? "",
    });
    setEditError(null);
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditError(null);
  }

  async function handleSubmitEdit() {
    try {
      await updateProfile({
        nome: editFields.nome || undefined,
        telefone: editFields.telefone || undefined,
        fotoUrl: editFields.fotoUrl || undefined,
      });
      refetch();
      setEditModalOpen(false);
      showToast("success", "Perfil atualizado com sucesso!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao atualizar perfil";
      setEditError(msg);
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(profile.nome)}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile.nome}</Text>
          <View style={styles.tipoBadge}>
            <Text style={styles.tipoBadgeText}>
              {tipoEmoji} {tipoLabel}
            </Text>
          </View>
          <Text style={styles.email}>{profile.email}</Text>
        </View>
      </View>

      {/* Card com tabs */}
      <View style={styles.card}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text
                style={[styles.tabText, tab === key && styles.tabTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Conteúdo */}
        {tab === "dados" && (
          <View style={styles.tabContent}>
            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nome completo</Text>
                <Text style={styles.fieldValue}>{profile.nome}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tipo de conta</Text>
                <Text style={styles.fieldValue}>{tipoLabel}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>E-mail</Text>
                <Text style={styles.fieldValue}>{profile.email}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Telefone</Text>
                <Text style={styles.fieldValue}>
                  {profile.telefone || "Não informado"}
                </Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Membro desde</Text>
                <Text style={styles.fieldValue}>
                  {new Date(profile.criadoEm).toLocaleDateString("pt-BR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <Pressable style={styles.editButton} onPress={openEditModal}>
              <Text style={styles.editButtonText}>Editar</Text>
            </Pressable>

            {profile.tipo === "medico" && (
              <TouchableOpacity
                style={styles.availabilityButton}
                onPress={() => setDisponibilidadePanelOpen(true)}
              >
                <Text style={styles.availabilityButtonText}>Gerenciar Disponibilidade</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {tab === "historico" && (
          <View style={styles.emptyTab}>
            <Text style={styles.emptyEmoji}>🏥</Text>
            <Text style={styles.emptyTitle}>Em breve</Text>
            <Text style={styles.emptySubtitle}>
              O histórico de saúde estará disponível em breve.
            </Text>
          </View>
        )}

        {tab === "metas" && profile.tipo === "paciente" && (
          <MetasTab showToast={showToast} />
        )}
      </View>

      {profile.tipo === "medico" && (
        <DisponibilidadePanel
          visible={disponibilidadePanelOpen}
          onClose={() => setDisponibilidadePanelOpen(false)}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={editFields.nome}
              onChangeText={(v) => setEditFields((f) => ({ ...f, nome: v }))}
              placeholder="Nome completo"
            />

            <Text style={styles.inputLabel}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={editFields.telefone}
              onChangeText={(v) =>
                setEditFields((f) => ({ ...f, telefone: v }))
              }
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>URL da foto</Text>
            <TextInput
              style={styles.input}
              value={editFields.fotoUrl}
              onChangeText={(v) =>
                setEditFields((f) => ({ ...f, fotoUrl: v }))
              }
              placeholder="https://..."
              autoCapitalize="none"
            />

            {editError ? (
              <Text style={styles.inlineError}>{editError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={closeEditModal}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.submitButton, isSaving && styles.buttonDisabled]}
                onPress={handleSubmitEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function MetasTab({ showToast }: { showToast: (type: "success" | "error", msg: string) => void }) {
  const { metas, isLoading, createMeta, updateMeta, deleteMeta } = useMetas();
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [goalFields, setGoalFields] = useState({ titulo: "", descricao: "" });

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="large" color="#19c10f" />
      </View>
    );
  }

  async function handleCreateMeta() {
    if (!goalFields.titulo.trim()) return;
    try {
      await createMeta({
        titulo: goalFields.titulo,
        descricao: goalFields.descricao || undefined,
      });
      setGoalFields({ titulo: "", descricao: "" });
      setNewGoalOpen(false);
      showToast("success", "Meta criada com sucesso!");
    } catch {
      showToast("error", "Erro ao criar meta.");
    }
  }

  async function handleToggle(id: number, current: boolean) {
    try {
      await updateMeta(id, { concluida: !current });
    } catch {
      showToast("error", "Erro ao atualizar meta.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMeta(id);
    } catch {
      showToast("error", "Erro ao excluir meta.");
    }
  }

  return (
    <View style={styles.tabContent}>
      {metas.length === 0 && !newGoalOpen ? (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>Nenhuma meta ainda</Text>
          <Text style={styles.emptySubtitle}>
            Crie sua primeira meta de saúde!
          </Text>
        </View>
      ) : (
        metas.map((meta) => (
          <View key={meta.id} style={styles.metaItem}>
            <Pressable
              style={styles.metaCheckbox}
              onPress={() => handleToggle(meta.id, meta.concluida)}
            >
              <View
                style={[
                  styles.checkbox,
                  meta.concluida && styles.checkboxChecked,
                ]}
              >
                {meta.concluida && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </Pressable>

            <View style={styles.metaInfo}>
              <Text
                style={[
                  styles.metaTitulo,
                  meta.concluida && styles.metaTituloCompleted,
                ]}
              >
                {meta.titulo}
              </Text>
              {meta.descricao ? (
                <Text style={styles.metaDescricao}>{meta.descricao}</Text>
              ) : null}
            </View>

            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDelete(meta.id)}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </Pressable>
          </View>
        ))
      )}

      {newGoalOpen ? (
        <View style={styles.newGoalForm}>
          <TextInput
            style={styles.input}
            value={goalFields.titulo}
            onChangeText={(v) => setGoalFields((f) => ({ ...f, titulo: v }))}
            placeholder="Título da meta *"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={goalFields.descricao}
            onChangeText={(v) =>
              setGoalFields((f) => ({ ...f, descricao: v }))
            }
            placeholder="Descrição (opcional)"
            multiline
            numberOfLines={3}
          />
          <View style={styles.modalActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setNewGoalOpen(false);
                setGoalFields({ titulo: "", descricao: "" });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.submitButton} onPress={handleCreateMeta}>
              <Text style={styles.submitButtonText}>Criar</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.newGoalButton}
          onPress={() => setNewGoalOpen(true)}
        >
          <Text style={styles.newGoalButtonText}>+ Nova meta</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 24,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 16,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#19c10f",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 22,
  },

  headerInfo: {
    flex: 1,
    gap: 4,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },

  tipoBadge: {
    backgroundColor: "#f0fdf0",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },

  tipoBadgeText: {
    color: "#15803d",
    fontSize: 12,
    fontWeight: "600",
  },

  email: {
    color: "#64748b",
    fontSize: 13,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: "hidden",
  },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  tabActive: {
    borderBottomColor: "#19c10f",
  },

  tabText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "500",
  },

  tabTextActive: {
    color: "#19c10f",
    fontWeight: "700",
  },

  tabContent: {
    padding: 24,
    gap: 20,
  },

  fieldRow: {
    flexDirection: "row",
    gap: 16,
  },

  field: {
    flex: 1,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  fieldValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },

  emptyTab: {
    padding: 48,
    alignItems: "center",
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

  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
  },

  editButton: {
    marginTop: 8,
    backgroundColor: "#19c10f",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  editButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  availabilityButton: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#19c10f",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  availabilityButtonText: {
    color: "#19c10f",
    fontWeight: "700",
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    gap: 12,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },

  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },

  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },

  inlineError: {
    color: "#ef4444",
    fontSize: 13,
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 14,
  },

  submitButton: {
    flex: 1,
    backgroundColor: "#19c10f",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },

  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  metaCheckbox: {
    padding: 4,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    backgroundColor: "#19c10f",
    borderColor: "#19c10f",
  },

  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  metaInfo: {
    flex: 1,
    gap: 2,
  },

  metaTitulo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },

  metaTituloCompleted: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },

  metaDescricao: {
    fontSize: 12,
    color: "#64748b",
  },

  deleteButton: {
    padding: 8,
  },

  deleteButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "700",
  },

  newGoalButton: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#19c10f",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderStyle: "dashed",
  },

  newGoalButtonText: {
    color: "#19c10f",
    fontWeight: "700",
    fontSize: 14,
  },

  newGoalForm: {
    gap: 12,
    marginTop: 8,
  },
});
