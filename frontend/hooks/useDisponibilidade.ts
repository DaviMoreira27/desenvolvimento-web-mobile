import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/auth/useAuth";

type DiaSemana =
  | "domingo"
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado";

export type DisponibilidadeSlot = {
  id: number;
  medicoId: number;
  diaSemana: DiaSemana;
  horarioInicio: string;
  criadoEm: string;
};

type AddSlotPayload = {
  diaSemana: DiaSemana;
  horarioInicio: string;
};

interface UseDisponibilidadeReturn {
  slots: DisponibilidadeSlot[];
  isLoading: boolean;
  error: string | null;
  addSlot: (payload: AddSlotPayload) => Promise<void>;
  removeSlot: (id: number) => Promise<void>;
}

export function useDisponibilidade(): UseDisponibilidadeReturn {
  const { token } = useAuth();
  const [slots, setSlots] = useState<DisponibilidadeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoading(true);
      try {
        const result = await apiFetch<DisponibilidadeSlot[]>(
          "/api/disponibilidade",
          { token: token ?? undefined }
        );
        setSlots(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlots();
  }, [token]);

  const addSlot = async (payload: AddSlotPayload): Promise<void> => {
    setError(null);
    try {
      const newSlot = await apiFetch<DisponibilidadeSlot>(
        "/api/disponibilidade",
        {
          method: "POST",
          body: JSON.stringify(payload),
          token: token ?? undefined,
        }
      );
      setSlots((prev) => [...prev, newSlot]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const removeSlot = async (id: number): Promise<void> => {
    setError(null);
    try {
      await apiFetch<void>(`/api/disponibilidade/${id}`, {
        method: "DELETE",
        token: token ?? undefined,
      });
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return { slots, isLoading, error, addSlot, removeSlot };
}
