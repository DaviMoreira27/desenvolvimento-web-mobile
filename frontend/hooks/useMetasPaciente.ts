import { useAuth } from "./auth/useAuth";
import { useFetch } from "./useFetch";
import type { Meta } from "./useMetas";

export function useMetasPaciente(pacienteId: number | null) {
  const { token } = useAuth();
  const endpoint = pacienteId !== null ? `/api/metas/paciente/${pacienteId}` : null;
  const { data, isLoading, error } = useFetch<Meta[]>(endpoint, token);
  return { metas: data ?? [], isLoading, error };
}
