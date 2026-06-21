import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useProtocolos, type Protocolo } from "../hooks/useProtocolos";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

const fakeProtocolo: Protocolo = {
  id: 1,
  titulo: "Protocolo Cardio",
  tipo: "exercicio",
  caloriasTotal: 500,
  versao: 1,
  criadoEm: "2026-06-01T00:00:00Z",
  conteudoExercicios: [],
  conteudoDieta: null,
  medico: { id: 3, nome: "Dr. Silva" },
  paciente: { id: 2, nome: "João" },
};

describe("useProtocolos", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches protocolos on mount and populates the list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeProtocolo]);

    const { result } = await renderHook(() => useProtocolos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.protocolos).toEqual([fakeProtocolo]);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Erro de servidor"));

    const { result } = await renderHook(() => useProtocolos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Erro de servidor");
    expect(result.current.protocolos).toEqual([]);
  });

  it("fetches from the correct endpoint", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useProtocolos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/protocolos",
      expect.objectContaining({ token: "test-token" })
    );
  });

  it("createProtocolo posts to /api/protocolos and appends the result", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useProtocolos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newProtocolo: Protocolo = { ...fakeProtocolo, id: 2, titulo: "Novo Protocolo" };
    mockApiFetch.mockResolvedValueOnce(newProtocolo);

    const createPayload = { pacienteId: 2, titulo: "Novo Protocolo" };

    await act(async () => {
      await result.current.createProtocolo(createPayload);
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith(
      "/api/protocolos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(createPayload),
        token: "test-token",
      })
    );

    await waitFor(() => {
      expect(result.current.protocolos).toHaveLength(1);
      expect(result.current.protocolos[0]).toEqual(newProtocolo);
    });
  });

  it("createProtocolo appends to an existing list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeProtocolo]);

    const { result } = await renderHook(() => useProtocolos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const secondProtocolo: Protocolo = { ...fakeProtocolo, id: 2, titulo: "Segundo Protocolo" };
    mockApiFetch.mockResolvedValueOnce(secondProtocolo);

    await act(async () => {
      await result.current.createProtocolo({ pacienteId: 2, titulo: "Segundo Protocolo" });
    });

    await waitFor(() => {
      expect(result.current.protocolos).toHaveLength(2);
      expect(result.current.protocolos[1]).toEqual(secondProtocolo);
    });
  });

  it("createProtocolo re-throws on API error", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useProtocolos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockRejectedValueOnce(new Error("Paciente não encontrado"));

    await act(async () => {
      await expect(
        result.current.createProtocolo({ pacienteId: 999, titulo: "Teste" })
      ).rejects.toThrow("Paciente não encontrado");
    });

    expect(result.current.protocolos).toHaveLength(0);
  });
});
