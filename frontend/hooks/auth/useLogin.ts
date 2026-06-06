import { router } from "expo-router";
import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "./useAuth";
import { useToast } from "../useToast";

type LoginResponse = {
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    tipo: "paciente" | "medico";
  };
};

export function useLogin() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(email: string, senha: string) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });
      await login(data.token, data.usuario);
      showToast("success", "Login realizado com sucesso.");
      router.replace("/(app)/inicio");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login";
      setError(message);
      showToast("error", message);
    } finally {
      setIsLoading(false);
    }
  }

  return { handleLogin, isLoading, error };
}
