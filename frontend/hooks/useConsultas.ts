import { useAuth } from "./auth/useAuth";
import { useModal } from "./useModal";
import { apiFetch } from "../lib/api";
import { useFetch } from "./useFetch";

export type Consulta = {
  id: number;
  dataHora: string;
  tipo: string;
  status: string;
  statusPagamento: string;
  linkMeet: string | null;
  paciente: { id: number; nome: string } | null;
  medico: { id: number; nome: string } | null;
};

export function useConsultas() {
  const { token } = useAuth();
  const { consultasVersion } = useModal();
  const { data, setData: setConsultas, isLoading, error } = useFetch<Consulta[]>(
    "/api/consultas",
    token,
    consultasVersion
  );
  const consultas = data ?? [];

  async function concluir(consultaId: number) {
    if (!token) throw new Error("Não autenticado");
    await apiFetch(`/api/consultas/${consultaId}/concluir`, { method: "PATCH", token });
    setConsultas((prev) =>
      (prev ?? []).map((c) => (c.id === consultaId ? { ...c, status: "concluida" } : c))
    );
  }

  async function cancelar(consultaId: number) {
    if (!token) throw new Error("Não autenticado");
    await apiFetch(`/api/consultas/${consultaId}/cancelar`, { method: "PATCH", token });
    setConsultas((prev) =>
      (prev ?? []).map((c) =>
        c.id === consultaId
          ? { ...c, status: "cancelada", statusPagamento: "cancelado" }
          : c
      )
    );
  }

  return { consultas, isLoading, error, concluir, cancelar };
}
