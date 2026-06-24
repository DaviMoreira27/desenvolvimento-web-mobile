import { useState } from "react";
import { useAuth } from "./auth/useAuth";
import { useFetch } from "./useFetch";

export type UserProfile = {
  id: number;
  nome: string;
  email: string;
  tipo: "paciente" | "medico";
  telefone: string | null;
  fotoUrl: string | null;
  criadoEm: string;
  googleConectado: boolean;
};

export function useUserProfile() {
  const { token } = useAuth();
  const [version, setVersion] = useState(0);
  const { data: profile, isLoading, error } = useFetch<UserProfile>(
    "/api/users/me",
    token,
    version
  );

  function refetch() {
    setVersion((v) => v + 1);
  }

  return { profile, isLoading, error, refetch };
}
