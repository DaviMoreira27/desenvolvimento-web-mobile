import { useAuth } from "./auth/useAuth";
import { useFetch } from "./useFetch";

export type Medico = {
  id: number;
  nome: string;
  email: string;
  tipo: "paciente" | "medico";
  googleConectado: boolean;
};

export function useMedicos() {
  const { token } = useAuth();
  const { data, isLoading, error } = useFetch<Medico[]>("/api/users/medicos", token);
  return { medicos: data ?? [], isLoading, error };
}
