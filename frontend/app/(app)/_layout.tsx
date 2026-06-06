import { Stack } from "expo-router";
import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Sidebar from "../../components/sidebar";
import { useAuth } from "../../hooks/auth/useAuth";
import { useAgendarConsulta } from "../../hooks/useAgendarConsulta";
import { useMedicos } from "../../hooks/useMedicos";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../hooks/useToast";
import { useSlotsLivres } from "../../hooks/useSlotsLivres";

export default function AppLayout() {
  const { token, isLoading } = useAuth();
  const { openModal, setOpenModal, bumpConsultasVersion } = useModal();
  const { width, height } = useWindowDimensions();
  const modalWidth = Math.min(width - 32, 560);
  const isNarrow = width < 520;
  const isMobile = width < 768;
  const { medicos, isLoading: loadingMedicos } = useMedicos();
  const { agendar, isLoading: agendando } = useAgendarConsulta();
  const { showToast } = useToast();

  // modal
  const [openSidebar, setOpenSidebar] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<
    "presencial" | "teleconsulta"
  >("presencial");

  const formattedDate = useMemo(
    () => (selectedDate ? selectedDate.toISOString().split("T")[0]! : null),
    [selectedDate]
  );

  const {
    slots: availableSlots,
    isLoading: loadingSlots,
    error: slotsError,
  } = useSlotsLivres(selectedDoctorId, formattedDate);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#19c10f" />
      </View>
    );
  }

  // if (!token) {
  //   return <Redirect href="/login" />;
  // }

  const getNextDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const selectedDoctor = medicos.find((m) => m.id === selectedDoctorId);

  const handleAgendar = async () => {
    if (!selectedDoctorId || !formattedDate || !selectedTime) {
      showToast("error", "Selecione médico, data e horário.");
      return;
    }

    const dataHoraISO = `${formattedDate}T${selectedTime}:00.000Z`;

    try {
      await agendar({
        medicoId: selectedDoctorId,
        dataHora: dataHoraISO,
        tipo: selectedType,
      });

      setOpenModal(false);
      setStep(1);
      setSelectedDoctorId(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedType("presencial");
      bumpConsultasVersion();
      showToast("success", "Consulta agendada com sucesso!");
    } catch (error) {
      showToast("error", "Erro ao agendar consulta. Tente novamente.");
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setStep(1);
    setSelectedDoctorId(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedType("presencial");
  };

  return (
    <View style={styles.container}>
      {/* Desktop sidebar — flex sibling */}
      {!isMobile && openSidebar && <Sidebar />}

      <View style={styles.content}>
        {/* Toggle always visible in content header */}
        <TouchableOpacity
          onPress={() => setOpenSidebar(!openSidebar)}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>☰</Text>
        </TouchableOpacity>

        <Stack screenOptions={{ headerShown: false }} />
      </View>

      {/* Mobile sidebar — full-screen overlay */}
      {isMobile && openSidebar && (
        <View style={styles.mobileOverlay}>
          <Sidebar onClose={() => setOpenSidebar(false)} />
        </View>
      )}

      {/* MODAL GLOBAL */}
      <Modal visible={openModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: modalWidth, maxHeight: height * 0.88 }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* STEP 1 - Selecionar Médico */}
              {step === 1 && (
                <>
                  <Text style={styles.title}>Nova Consulta</Text>

                  {loadingMedicos ? (
                    <ActivityIndicator
                      size="large"
                      color="#19c10f"
                      style={{ marginTop: 20 }}
                    />
                  ) : medicos.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum médico disponível</Text>
                  ) : (
                    <View style={[styles.grid, isNarrow && styles.gridNarrow]}>
                      {medicos.map((medico) => (
                        <TouchableOpacity
                          key={medico.id}
                          style={[
                            styles.card,
                            isNarrow && styles.cardNarrow,
                            selectedDoctorId === medico.id && styles.selectedCard,
                          ]}
                          onPress={() => setSelectedDoctorId(medico.id)}
                        >
                          <Text style={styles.cardText}>{medico.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, !selectedDoctorId && styles.buttonDisabled]}
                      onPress={() => setStep(2)}
                      disabled={!selectedDoctorId}
                    >
                      <Text style={styles.buttonText}>Continuar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* STEP 2 - Selecionar Data, Hora e Tipo */}
              {step === 2 && (
                <>
                  <Text style={styles.title}>{selectedDoctor?.nome}</Text>

                  <Text style={styles.sectionLabel}>Selecione a data</Text>

                  <View style={styles.datesContainer}>
                    {getNextDays().map((date, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.dateButton,
                          selectedDate?.toDateString() === date.toDateString() &&
                            styles.selectedDateButton,
                        ]}
                        onPress={() => setSelectedDate(date)}
                      >
                        <Text
                          style={[
                            styles.dateButtonText,
                            selectedDate?.toDateString() === date.toDateString() &&
                              styles.selectedDateButtonText,
                          ]}
                        >
                          {date.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sectionLabel}>Horários disponíveis</Text>

                  {loadingSlots ? (
                    <ActivityIndicator
                      size="small"
                      color="#19c10f"
                      style={{ marginVertical: 16 }}
                    />
                  ) : slotsError ? (
                    <Text style={styles.slotErrorText}>{slotsError}</Text>
                  ) : !selectedDate ? (
                    <Text style={styles.emptyText}>Selecione uma data para ver os horários disponíveis</Text>
                  ) : availableSlots.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum horário disponível para esta data</Text>
                  ) : (
                    <View style={styles.times}>
                      {availableSlots.map((slot, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.timeButton,
                            selectedTime === slot.horarioInicio && styles.selectedTimeButton,
                          ]}
                          onPress={() => setSelectedTime(slot.horarioInicio)}
                        >
                          <Text
                            style={[
                              styles.timeButtonText,
                              selectedTime === slot.horarioInicio && styles.selectedTimeButtonText,
                            ]}
                          >
                            {slot.horarioInicio}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.sectionLabel}>Tipo de Consulta</Text>

                  <View style={styles.typeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedType === "presencial" && styles.selectedTypeButton,
                      ]}
                      onPress={() => setSelectedType("presencial")}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          selectedType === "presencial" && styles.selectedTypeButtonText,
                        ]}
                      >
                        Presencial
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        selectedType === "teleconsulta" && styles.selectedTypeButton,
                      ]}
                      onPress={() => setSelectedType("teleconsulta")}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          selectedType === "teleconsulta" && styles.selectedTypeButtonText,
                        ]}
                      >
                        Teleconsulta
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(1)}>
                      <Text style={styles.cancelBtnText}>Voltar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        (agendando || loadingSlots || !!slotsError) && styles.buttonDisabled,
                      ]}
                      onPress={handleAgendar}
                      disabled={agendando || loadingSlots || !!slotsError || !selectedDate || !selectedTime}
                    >
                      {agendando ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.buttonText}>Agendar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },

  content: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },

  toggle: {
    padding: 10,
    alignSelf: "flex-start",
  },

  toggleText: {
    fontSize: 18,
    color: "#374151",
  },

  mobileOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  modal: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },

  sectionLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 14,
    color: "#374151",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  gridNarrow: {
    flexDirection: "column",
  },

  card: {
    width: "47%",
    padding: 14,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  cardNarrow: {
    width: "100%",
  },

  cardText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  selectedCard: {
    backgroundColor: "#dcfce7",
    borderColor: "#19c10f",
  },

  datesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },

  dateButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  selectedDateButton: {
    backgroundColor: "#dcfce7",
    borderColor: "#19c10f",
  },

  dateButtonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "500",
  },

  selectedDateButtonText: {
    color: "#15803d",
    fontWeight: "700",
  },

  times: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },

  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  selectedTimeButton: {
    backgroundColor: "#dcfce7",
    borderColor: "#19c10f",
  },

  timeButtonText: {
    color: "#374151",
    fontWeight: "500",
    fontSize: 14,
  },

  selectedTimeButtonText: {
    color: "#15803d",
    fontWeight: "700",
  },

  typeContainer: {
    flexDirection: "row",
    gap: 10,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },

  selectedTypeButton: {
    backgroundColor: "#dcfce7",
    borderColor: "#19c10f",
  },

  typeButtonText: {
    color: "#374151",
    fontWeight: "500",
    fontSize: 14,
  },

  selectedTypeButtonText: {
    color: "#15803d",
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  cancelBtnText: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 14,
  },

  button: {
    backgroundColor: "#19c10f",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 110,
    alignItems: "center",
    shadowColor: "#19c10f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 20,
    fontSize: 14,
  },

  slotErrorText: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
});
