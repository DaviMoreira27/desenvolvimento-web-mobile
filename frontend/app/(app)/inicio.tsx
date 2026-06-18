import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../hooks/auth/useAuth";
import { useConsultas } from "../../hooks/useConsultas";
import { usePagamentos } from "../../hooks/usePagamentos";
import { useProtocolos } from "../../hooks/useProtocolos";

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
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function consultasNaSemana(consultas: { dataHora: string }[]) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return consultas.filter((c) => {
    const d = new Date(c.dataHora);
    return d >= monday && d <= sunday;
  }).length;
}

export default function Inicio() {
  const { usuario } = useAuth();
  const { consultas, isLoading: loadingConsultas, error: errorConsultas } = useConsultas();
  const { protocolos, isLoading: loadingProtocolos, error: errorProtocolos } = useProtocolos();
  const { pagamentos, isLoading: loadingPagamentos, error: errorPagamentos } = usePagamentos();

  const isLoading = loadingConsultas || loadingProtocolos || loadingPagamentos;
  const hasError = errorConsultas || errorProtocolos || errorPagamentos;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#19c10f" />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Erro ao carregar dados. Tente novamente.</Text>
      </View>
    );
  }

  const proximaConsulta = consultas[0];
  const isMedico = usuario?.tipo === "medico";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.greeting}>
        Olá, {usuario?.nome?.split(" ")[0]} 👋
      </Text>
      <Text style={styles.subGreeting}>Aqui está um resumo do seu histórico.</Text>

      {/* Cards */}
      <View style={styles.cardsContainer}>
        <View style={[styles.cardSmall, { borderTopColor: "#19c10f" }]}>
          <Text style={styles.cardEmoji}>📅</Text>
          <Text style={styles.cardTitle}>Próxima consulta</Text>
          <Text style={styles.cardValue}>
            {proximaConsulta
              ? new Date(proximaConsulta.dataHora).toLocaleDateString("pt-BR")
              : "—"}
          </Text>
          {proximaConsulta && (
            <Text style={styles.cardSubValue}>
              {new Date(proximaConsulta.dataHora).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </View>

        <View style={[styles.cardSmall, { borderTopColor: "#3b82f6" }]}>
          <Text style={styles.cardEmoji}>🔗</Text>
          <Text style={styles.cardTitle}>Link da consulta</Text>
          <Text style={styles.link}>
            {proximaConsulta?.linkMeet ? "Entrar na chamada" : "—"}
          </Text>
        </View>

        {isMedico ? (
          <View style={[styles.cardSmall, { borderTopColor: "#8b5cf6" }]}>
            <Text style={styles.cardEmoji}>📆</Text>
            <Text style={styles.cardTitle}>Consultas na semana</Text>
            <Text style={styles.cardValue}>{consultasNaSemana(consultas)}</Text>
          </View>
        ) : (
          <View style={[styles.cardSmall, { borderTopColor: "#f59e0b" }]}>
            <Text style={styles.cardEmoji}>📊</Text>
            <Text style={styles.cardTitle}>Protocolos ativos</Text>
            <Text style={styles.cardValue}>{protocolos.length}</Text>
          </View>
        )}
      </View>

      {/* Tabela de Consultas */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Consultas</Text>

        {consultas.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma consulta encontrada</Text>
        ) : (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.rowHeaderText}>Data</Text>
              <Text style={styles.rowHeaderText}>
                {isMedico ? "Paciente" : "Médico"}
              </Text>
              <Text style={styles.rowHeaderText}>Tipo</Text>
              <Text style={styles.rowHeaderText}>Status</Text>
            </View>

            {consultas.map((consulta) => (
              <View key={consulta.id} style={styles.row}>
                <Text style={styles.rowText}>
                  {new Date(consulta.dataHora).toLocaleDateString("pt-BR")}
                </Text>
                <Text style={styles.rowText}>
                  {isMedico
                    ? (consulta.paciente?.nome ?? "—")
                    : (consulta.medico?.nome ?? "—")}
                </Text>
                <View style={styles.rowCell}>
                  <View style={[badge.pill, { backgroundColor: "#f1f5f9" }]}>
                    <Text style={[badge.text, { color: "#475569" }]}>
                      {capitalize(consulta.tipo)}
                    </Text>
                  </View>
                </View>
                <View style={styles.rowCell}>
                  <StatusBadge status={consulta.status} />
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      {/* Tabela de Protocolos — apenas para pacientes */}
      {!isMedico && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Protocolos</Text>

          {protocolos.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum protocolo encontrado</Text>
          ) : (
            <>
              <View style={styles.rowHeader}>
                <Text style={styles.rowHeaderText}>Data</Text>
                <Text style={styles.rowHeaderText}>Médico</Text>
                <Text style={styles.rowHeaderText}>Versão</Text>
              </View>

              {protocolos.map((protocolo) => (
                <View key={protocolo.id} style={styles.row}>
                  <Text style={styles.rowText}>
                    {new Date(protocolo.criadoEm).toLocaleDateString("pt-BR")}
                  </Text>
                  <Text style={styles.rowText}>{protocolo.medico.nome}</Text>
                  <Text style={styles.rowText}>v{protocolo.versao}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Tabela de Pagamentos */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {isMedico ? "Pagamentos Recebidos" : "Histórico de Pagamentos"}
        </Text>

        {pagamentos.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum pagamento encontrado</Text>
        ) : (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.rowHeaderText}>Data</Text>
              <Text style={styles.rowHeaderText}>Descrição</Text>
              <Text style={styles.rowHeaderText}>Valor</Text>
              <Text style={styles.rowHeaderText}>Status</Text>
            </View>

            {pagamentos.map((pagamento) => (
              <View key={pagamento.id} style={styles.row}>
                <Text style={styles.rowText}>
                  {new Date(pagamento.criadoEm).toLocaleDateString("pt-BR")}
                </Text>
                <Text style={styles.rowText}>
                  {pagamento.descricao || "Consulta"}
                </Text>
                <Text style={styles.rowText}>
                  R$ {Number(pagamento.valor).toFixed(2)}
                </Text>
                <View style={styles.rowCell}>
                  <StatusBadge status={pagamento.status} />
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
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

  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },

  subGreeting: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
  },

  cardsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  cardSmall: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderTopWidth: 3,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  cardEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },

  cardTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },

  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },

  cardSubValue: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 2,
  },

  link: {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: 13,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },

  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  rowHeaderText: {
    fontWeight: "600",
    fontSize: 12,
    color: "#94a3b8",
    flex: 1,
    textTransform: "uppercase",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },

  rowText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },

  rowCell: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    paddingVertical: 24,
    fontSize: 14,
  },

  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
  },
});
