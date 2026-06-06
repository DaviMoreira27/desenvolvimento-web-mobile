import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDisponibilidade } from "@/hooks/useDisponibilidade";
import { VGTheme } from "@/constants/theme";

type DiaSemana =
  | "domingo"
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado";

const DIAS_SEMANA: DiaSemana[] = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 7; h <= 21; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  slots.push("22:00");
  return slots;
})();

const DIA_LABELS: Record<DiaSemana, string> = {
  domingo: "Domingo",
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
};

type DisponibilidadePanelProps = {
  visible: boolean;
  onClose: () => void;
};

export function DisponibilidadePanel({ visible, onClose }: DisponibilidadePanelProps) {
  const { slots, isLoading, error, addSlot, removeSlot } = useDisponibilidade();
  const [newDiaSemana, setNewDiaSemana] = useState<DiaSemana>("segunda");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const slotsByDay = DIAS_SEMANA.reduce<Record<DiaSemana, typeof slots>>(
    (acc, dia) => {
      acc[dia] = slots.filter((s) => s.diaSemana === dia);
      return acc;
    },
    {
      domingo: [],
      segunda: [],
      terca: [],
      quarta: [],
      quinta: [],
      sexta: [],
      sabado: [],
    }
  );

  const handleAddSlot = async () => {
    if (selectedTimes.length === 0) {
      setFormError("Selecione pelo menos um horário");
      return;
    }
    setFormError(null);
    setIsSaving(true);
    for (const time of selectedTimes) {
      await addSlot({ diaSemana: newDiaSemana, horarioInicio: time });
    }
    setIsSaving(false);
    setSelectedTimes([]);
  };

  const handleRemoveSlot = async (id: number) => {
    await removeSlot(id);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Minha Disponibilidade</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {(error || formError) ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError ?? error}</Text>
            </View>
          ) : null}

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Adicionar horário</Text>

            <View style={styles.pickerRow}>
              {DIAS_SEMANA.map((dia) => (
                <TouchableOpacity
                  key={dia}
                  style={[
                    styles.dayChip,
                    newDiaSemana === dia && styles.dayChipSelected,
                  ]}
                  onPress={() => { setNewDiaSemana(dia); setSelectedTimes([]); }}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      newDiaSemana === dia && styles.dayChipTextSelected,
                    ]}
                  >
                    {dia.slice(0, 3).charAt(0).toUpperCase() + dia.slice(1, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeSlotsGrid}>
              {TIME_SLOTS.filter(
                (time) => !slotsByDay[newDiaSemana].some((s) => s.horarioInicio === time)
              ).map((time) => {
                const isSelected = selectedTimes.includes(time);
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                    onPress={() => toggleTime(time)}
                  >
                    <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Pressable
              style={[styles.addButton, (isSaving || selectedTimes.length === 0) && styles.buttonDisabled]}
              onPress={handleAddSlot}
              disabled={isSaving || selectedTimes.length === 0}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={VGTheme.colors.surface} />
              ) : (
                <Text style={styles.addButtonText}>
                  + Adicionar{selectedTimes.length > 0 ? ` (${selectedTimes.length})` : ""}
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.slotsList} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={VGTheme.colors.primary}
                style={styles.loader}
              />
            ) : (
              DIAS_SEMANA.map((dia) => {
                const daySlots = slotsByDay[dia];
                if (daySlots.length === 0) return null;
                return (
                  <View key={dia} style={styles.daySection}>
                    <Text style={styles.dayLabel}>{DIA_LABELS[dia]}</Text>
                    {daySlots.map((slot) => (
                      <View key={slot.id} style={styles.slotRow}>
                        <Text style={styles.slotTime}>{slot.horarioInicio}</Text>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveSlot(slot.id)}
                        >
                          <Text style={styles.removeButtonText}>Remover</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                );
              })
            )}

            {!isLoading && slots.length === 0 && (
              <Text style={styles.emptyText}>
                Nenhum horário cadastrado. Adicione seus horários disponíveis acima.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  panel: {
    backgroundColor: VGTheme.colors.surface,
    borderTopLeftRadius: VGTheme.radius.xl,
    borderTopRightRadius: VGTheme.radius.xl,
    padding: 24,
    maxHeight: "85%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: VGTheme.colors.textPrimary,
  },

  closeButton: {
    padding: 4,
  },

  closeButtonText: {
    fontSize: 18,
    color: VGTheme.colors.textTertiary,
    fontWeight: "700",
  },

  errorContainer: {
    backgroundColor: VGTheme.colors.errorBg,
    borderRadius: VGTheme.radius.sm,
    padding: 12,
    marginBottom: 12,
  },

  errorText: {
    color: VGTheme.colors.error,
    fontSize: 13,
  },

  formSection: {
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: VGTheme.colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },

  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: VGTheme.radius.full,
    backgroundColor: VGTheme.colors.inputBg,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  dayChipSelected: {
    backgroundColor: VGTheme.colors.primaryLight,
    borderColor: VGTheme.colors.primary,
  },

  dayChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: VGTheme.colors.textSecondary,
  },

  dayChipTextSelected: {
    color: VGTheme.colors.successText,
    fontWeight: "700",
  },

  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: VGTheme.radius.sm,
    backgroundColor: VGTheme.colors.inputBg,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  timeChipSelected: {
    backgroundColor: VGTheme.colors.primaryLight,
    borderColor: VGTheme.colors.primary,
  },

  timeChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: VGTheme.colors.textSecondary,
  },

  timeChipTextSelected: {
    color: VGTheme.colors.successText,
    fontWeight: "700",
  },

  addButton: {
    backgroundColor: VGTheme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: VGTheme.radius.sm,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  addButtonText: {
    color: VGTheme.colors.surface,
    fontWeight: "700",
    fontSize: 14,
  },

  slotsList: {
    flex: 1,
  },

  loader: {
    marginTop: 24,
  },

  daySection: {
    marginBottom: 16,
  },

  dayLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: VGTheme.colors.textPrimary,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  slotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: VGTheme.colors.inputBg,
    borderRadius: VGTheme.radius.sm,
    marginBottom: 6,
  },

  slotTime: {
    fontSize: 15,
    fontWeight: "600",
    color: VGTheme.colors.textPrimary,
  },

  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: VGTheme.radius.sm,
    backgroundColor: VGTheme.colors.dangerBg,
  },

  removeButtonText: {
    color: VGTheme.colors.dangerText,
    fontSize: 12,
    fontWeight: "600",
  },

  emptyText: {
    textAlign: "center",
    color: VGTheme.colors.textTertiary,
    marginTop: 32,
    fontSize: 14,
    lineHeight: 20,
  },
});
