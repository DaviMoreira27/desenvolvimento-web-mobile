import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/auth/useAuth";

type SlotLivre = {
  horarioInicio: string;
};

interface UseSlotsLivresReturn {
  slots: SlotLivre[];
  isLoading: boolean;
  error: string | null;
}

export function useSlotsLivres(
  medicoId: number | null,
  data: string | null
): UseSlotsLivresReturn {
  const { token } = useAuth();
  const [slots, setSlots] = useState<SlotLivre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (medicoId === null || data === null) {
      setSlots([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchSlots = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiFetch<SlotLivre[]>(
          `/api/disponibilidade/slots-livres?medicoId=${medicoId}&data=${data}`,
          { token: token ?? undefined }
        );
        if (!cancelled) {
          setSlots(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro desconhecido");
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSlots();

    return () => {
      cancelled = true;
    };
  }, [medicoId, data, token]);

  return { slots, isLoading, error };
}
