import { useEffect, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { useModal } from "./useModal";
import { apiFetch } from "../lib/api";

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
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiFetch<Consulta[]>("/api/consultas", { token })
      .then(setConsultas)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [token, consultasVersion]);

  return { consultas, isLoading, error };
}
