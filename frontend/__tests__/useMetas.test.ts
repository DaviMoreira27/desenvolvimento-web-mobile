import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useMetas } from "../hooks/useMetas";
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

describe("useMetas", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches metas on mount and exposes isLoading", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMeta]);

    const { result } = await renderHook(() => useMetas());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metas).toEqual([fakeMeta]);
    expect(result.current.error).toBeNull();
  });

  it("exposes createMeta, updateMeta, deleteMeta functions", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useMetas());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.createMeta).toBe("function");
    expect(typeof result.current.updateMeta).toBe("function");
    expect(typeof result.current.deleteMeta).toBe("function");
  });

  it("createMeta appends the new meta to the list on 201", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useMetas());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newMeta: Meta = { ...fakeMeta, id: 2, titulo: "Nova meta" };
    mockApiFetch.mockResolvedValueOnce(newMeta);

    await act(async () => {
      await result.current.createMeta({ titulo: "Nova meta" });
    });

    await waitFor(() => {
      expect(result.current.metas).toHaveLength(1);
      expect(result.current.metas[0]).toEqual(newMeta);
    });
  });

  it("updateMeta replaces the matching item on 200", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMeta]);

    const { result } = await renderHook(() => useMetas());

    await waitFor(() => {
      expect(result.current.metas).toHaveLength(1);
    });

    const updatedMeta: Meta = { ...fakeMeta, concluida: true };
    mockApiFetch.mockResolvedValueOnce(updatedMeta);

    await act(async () => {
      await result.current.updateMeta(1, { concluida: true });
    });

    await waitFor(() => {
      expect(result.current.metas[0].concluida).toBe(true);
    });
  });

  it("deleteMeta removes the matching item on 204", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMeta]);

    const { result } = await renderHook(() => useMetas());

    await waitFor(() => {
      expect(result.current.metas).toHaveLength(1);
    });

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.deleteMeta(1);
    });

    await waitFor(() => {
      expect(result.current.metas).toHaveLength(0);
    });
  });

  it("createMeta re-throws on API error", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useMetas());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockApiFetch.mockRejectedValueOnce(new Error("Título obrigatório"));

    await act(async () => {
      await expect(
        result.current.createMeta({ titulo: "" })
      ).rejects.toThrow("Título obrigatório");
    });
  });
});
