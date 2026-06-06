import { Stack } from "expo-router";
import { useState } from "react";
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

export default function AppLayout() {
  const { token, isLoading } = useAuth();
  const { openModal, setOpenModal, bumpConsultasVersion } = useModal();
  const { width, height } = useWindowDimensions();
  const modalWidth = Math.min(width - 32, 560);
  const isNarrow = width < 520;
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
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const selectedDoctor = medicos.find((m) => m.id === selectedDoctorId);

  const handleAgendar = async () => {
    if (!selectedDoctorId || !selectedDate || !selectedTime) {
      showToast("error", "Selecione médico, data e horário.");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const dataHora = new Date(selectedDate);
    dataHora.setHours(hours, minutes, 0, 0);

    try {
      await agendar({
        medicoId: selectedDoctorId,
        dataHora: dataHora.toISOString(),
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
      {/* Sidebar */}
      {openSidebar && <Sidebar />}

      <View style={styles.content}>
        {/* Toggle */}
        <TouchableOpacity
          onPress={() => setOpenSidebar(!openSidebar)}
          style={styles.toggle}
        >
          <Text>☰</Text>
        </TouchableOpacity>

        <Stack screenOptions={{ headerShown: false }} />
      </View>

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

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.datesContainer}
                    contentContainerStyle={styles.datesContent}
                  >
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
                  </ScrollView>

                  <Text style={styles.sectionLabel}>Horários disponíveis</Text>

                  <View style={styles.times}>
                    {["08:00", "10:00", "14:00", "16:00", "18:00"].map((time, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.timeButton,
                          selectedTime === time && styles.selectedTimeButton,
                        ]}
                        onPress={() => setSelectedTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            selectedTime === time && styles.selectedTimeButtonText,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

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
                      style={[styles.button, agendando && styles.buttonDisabled]}
                      onPress={handleAgendar}
                      disabled={agendando || !selectedDate || !selectedTime}
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
    marginTop: 0,
  },

  datesContent: {
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
});
