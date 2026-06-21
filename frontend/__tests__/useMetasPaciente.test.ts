import { renderHook, waitFor } from "@testing-library/react-native";
import { useMetasPaciente } from "../hooks/useMetasPaciente";
import type { Meta } from "../hooks/useMetas";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

const fakeMeta: Meta = {
  id: 1,
  pacienteId: 42,
  titulo: "Caminhar 30 min",
  descricao: null,
  concluida: false,
  criadoEm: "2026-06-01T00:00:00Z",
  atualizadoEm: "2026-06-01T00:00:00Z",
};

describe("useMetasPaciente", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches metas for the given pacienteId", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMeta]);

    const { result } = await renderHook(() => useMetasPaciente(42));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metas).toEqual([fakeMeta]);
    expect(result.current.error).toBeNull();
  });

  it("fetches from the correct endpoint with token", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMeta]);

    const { result } = await renderHook(() => useMetasPaciente(42));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/metas/paciente/42",
      expect.objectContaining({ token: "test-token" })
    );
  });

  it("returns empty metas and does not fetch when pacienteId is null", async () => {
    const { result } = await renderHook(() => useMetasPaciente(null));

    expect(result.current.metas).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("sets error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Paciente não encontrado"));

    const { result } = await renderHook(() => useMetasPaciente(99));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Paciente não encontrado");
    expect(result.current.metas).toEqual([]);
  });

  it("re-fetches when pacienteId changes", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMeta]);

    const { result, rerender } = await renderHook(
      ({ id }: { id: number | null }) => useMetasPaciente(id),
      { initialProps: { id: 42 } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.metas).toEqual([fakeMeta]);

    const anotherMeta: Meta = {
      ...fakeMeta,
      id: 2,
      pacienteId: 55,
      titulo: "Outra meta",
    };
    mockApiFetch.mockResolvedValueOnce([anotherMeta]);

    rerender({ id: 55 });

    await waitFor(() => {
      expect(result.current.metas).toEqual([anotherMeta]);
    });
  });

  it("clears metas when pacienteId changes to null", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMeta]);

    const { result, rerender } = await renderHook(
      ({ id }: { id: number | null }) => useMetasPaciente(id),
      { initialProps: { id: 42 as number | null } }
    );

    await waitFor(() => expect(result.current.metas).toEqual([fakeMeta]));

    rerender({ id: null });

    await waitFor(() => {
      expect(result.current.metas).toEqual([]);
    });
  });
});
