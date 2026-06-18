import { useEffect, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { apiFetch } from "../lib/api";

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
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiFetch<Pagamento[]>("/api/pagamentos", { token })
      .then(setPagamentos)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  async function confirmarPagamento(id: number) {
    if (!token) throw new Error("Não autenticado");
    await apiFetch(`/api/pagamentos/${id}/confirmar`, { method: "PATCH", token });
    setPagamentos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "aprovado" } : p))
    );
  }

  return { pagamentos, isLoading, error, confirmarPagamento };
}
