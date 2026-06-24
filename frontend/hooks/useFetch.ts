import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export function useFetch<T>(
  endpoint: string | null,
  token: string | null,
  version = 0
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token) && endpoint !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || endpoint === null) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    apiFetch<T>(endpoint, { token })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [token, endpoint, version]);

  return { data, setData, isLoading, error };
}
