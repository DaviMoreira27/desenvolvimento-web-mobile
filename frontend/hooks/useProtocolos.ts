import { useAuth } from "./auth/useAuth";
import { apiFetch } from "../lib/api";
import { useFetch } from "./useFetch";

export type Protocolo = {
  id: number;
  titulo: string;
  tipo: string | null;
  caloriasTotal: number | null;
  versao: number;
  criadoEm: string;
  conteudoExercicios?: string | any[] | null;
  conteudoDieta?: string | any[] | null;
  medico: { id: number; nome: string };
  paciente: { id: number; nome: string };
};

export type ExercicioItem = {
  nome: string;
  series?: string;
  duracao?: string;
  frequencia?: string;
  carga?: string;
};

export type DietaItem = {
  refeicao: string;
  descricao?: string;
};

export type CriarProtocoloPayload = {
  pacienteId: number;
  titulo: string;
  tipo?: string;
  caloriasTotal?: number;
  conteudoExercicios?: ExercicioItem[];
  conteudoDieta?: DietaItem[];
};

export function useProtocolos() {
  const { token } = useAuth();
  const { data, setData: setProtocolos, isLoading, error } = useFetch<Protocolo[]>(
    "/api/protocolos",
    token
  );
  const protocolos = data ?? [];

  const createProtocolo = async (payload: CriarProtocoloPayload): Promise<void> => {
    const created = await apiFetch<Protocolo>("/api/protocolos", {
      token: token!,
      method: "POST",
      body: JSON.stringify(payload),
    });
    setProtocolos((prev) => [...(prev ?? []), created]);
  };

  return { protocolos, isLoading, error, createProtocolo };
}
