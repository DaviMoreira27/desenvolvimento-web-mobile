import { useAuth } from "./auth/useAuth";
import { apiFetch } from "../lib/api";
import { useFetch } from "./useFetch";

export type Pagamento = {
  id: number;
  valor: string;
  status: string;
  descricao: string | null;
  criadoEm: string;
  consulta: { id: number; dataHora: string; tipo: string };
  paciente: { id: number; nome: string } | null;
};

export function usePagamentos() {
  const { token } = useAuth();
  const { data, setData: setPagamentos, isLoading, error } = useFetch<Pagamento[]>(
    "/api/pagamentos",
    token
  );
  const pagamentos = data ?? [];

  async function confirmarPagamento(id: number) {
    if (!token) throw new Error("Não autenticado");
    await apiFetch(`/api/pagamentos/${id}/confirmar`, { method: "PATCH", token });
    setPagamentos((prev) =>
      (prev ?? []).map((p) => (p.id === id ? { ...p, status: "aprovado" } : p))
    );
  }

  return { pagamentos, isLoading, error, confirmarPagamento };
}
