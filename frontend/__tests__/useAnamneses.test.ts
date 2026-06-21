import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useAnamneses,
  usePacienteAnamnese,
  type AnamneseMedico,
  type AnamnesePaciente,
} from "../hooks/useAnamneses";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

const fakeAnamneseMedico: AnamneseMedico = {
  id: 1,
  pacienteId: 2,
  pacienteNome: "João",
  idade: 30,
  peso: "70",
  altura: "175",
  bmi: "22.9",
  condicoesSaude: ["hipertensão"],
  alergias: "penicilina",
  horasSono: "7",
  nivelAtividade: "moderado",
  tipoAlimentacao: ["onivoro"],
  habitos: ["exercício"],
  objetivo: "perder peso",
  criadoEm: "2026-06-01T00:00:00Z",
  atualizadoEm: "2026-06-01T00:00:00Z",
};

const fakeAnamnesePaciente: AnamnesePaciente = {
  id: 1,
  pacienteId: 2,
  idade: 30,
  peso: "70",
  altura: "175",
  bmi: "22.9",
  condicoesSaude: ["hipertensão"],
  alergias: "penicilina",
  horasSono: "7",
  nivelAtividade: "moderado",
  tipoAlimentacao: ["onivoro"],
  habitos: ["exercício"],
  objetivo: "perder peso",
  criadoEm: "2026-06-01T00:00:00Z",
  atualizadoEm: "2026-06-01T00:00:00Z",
};

describe("useAnamneses", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches anamneses on mount and populates the list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeAnamneseMedico]);

    const { result } = await renderHook(() => useAnamneses());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.anamneses).toEqual([fakeAnamneseMedico]);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Acesso negado"));

    const { result } = await renderHook(() => useAnamneses());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Acesso negado");
    expect(result.current.anamneses).toEqual([]);
  });

  it("fetches from the correct endpoint", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useAnamneses());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/anamneses",
      expect.objectContaining({ token: "test-token" })
    );
  });
});

describe("usePacienteAnamnese", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches existing anamnese on mount", async () => {
    mockApiFetch.mockResolvedValueOnce(fakeAnamnesePaciente);

    const { result } = await renderHook(() => usePacienteAnamnese());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.anamnese).toEqual(fakeAnamnesePaciente);
  });

  it("starts with null anamnese when server returns null", async () => {
    mockApiFetch.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => usePacienteAnamnese());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.anamnese).toBeNull();
  });

  it("silently handles fetch errors and leaves anamnese as null", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = await renderHook(() => usePacienteAnamnese());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.anamnese).toBeNull();
  });

  it("salvar creates a new anamnese via POST when none exists", async () => {
    mockApiFetch.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => usePacienteAnamnese());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newAnamnese: AnamnesePaciente = { ...fakeAnamnesePaciente, id: 2 };
    mockApiFetch.mockResolvedValueOnce(newAnamnese);

    const input = { idade: 30, peso: "70", objetivo: "perder peso" };

    await act(async () => {
      await result.current.salvar(input);
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith(
      "/api/anamneses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
        token: "test-token",
      })
    );

    await waitFor(() => {
      expect(result.current.anamnese).toEqual(newAnamnese);
    });
  });

  it("salvar updates existing anamnese via PUT when one exists", async () => {
    mockApiFetch.mockResolvedValueOnce(fakeAnamnesePaciente);

    const { result } = await renderHook(() => usePacienteAnamnese());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updatedAnamnese: AnamnesePaciente = {
      ...fakeAnamnesePaciente,
      objetivo: "ganhar massa",
    };
    mockApiFetch.mockResolvedValueOnce(updatedAnamnese);

    const input = { objetivo: "ganhar massa" };

    await act(async () => {
      await result.current.salvar(input);
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith(
      `/api/anamneses/${fakeAnamnesePaciente.id}`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(input),
        token: "test-token",
      })
    );

    await waitFor(() => {
      expect(result.current.anamnese!.objetivo).toBe("ganhar massa");
    });
  });

  it("resets isSaving to false after successful save", async () => {
    mockApiFetch.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => usePacienteAnamnese());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(fakeAnamnesePaciente);

    await act(async () => {
      await result.current.salvar({ objetivo: "teste" });
    });

    expect(result.current.isSaving).toBe(false);
  });

  it("resets isSaving to false even when salvar throws", async () => {
    mockApiFetch.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => usePacienteAnamnese());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockRejectedValueOnce(new Error("Erro ao salvar"));

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.salvar({ objetivo: "teste" });
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect(caughtError?.message).toBe("Erro ao salvar");
    expect(result.current.isSaving).toBe(false);
  });
});
