import { renderHook, waitFor, act } from "@testing-library/react-native";
import { usePagamentos, type Pagamento } from "../hooks/usePagamentos";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

const fakePagamento: Pagamento = {
  id: 1,
  valor: "150.00",
  status: "pendente",
  descricao: null,
  criadoEm: "2026-06-01T00:00:00Z",
  consulta: { id: 10, dataHora: "2026-07-01T10:00:00Z", tipo: "presencial" },
  paciente: { id: 2, nome: "João" },
};

describe("usePagamentos", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches pagamentos on mount and populates the list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakePagamento]);

    const { result } = await renderHook(() => usePagamentos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pagamentos).toEqual([fakePagamento]);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Acesso negado"));

    const { result } = await renderHook(() => usePagamentos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Acesso negado");
    expect(result.current.pagamentos).toEqual([]);
  });

  it("fetches from the correct endpoint with token", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => usePagamentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/pagamentos",
      expect.objectContaining({ token: "test-token" })
    );
  });

  it("confirmarPagamento calls PATCH on the correct endpoint", async () => {
    mockApiFetch.mockResolvedValueOnce([fakePagamento]);

    const { result } = await renderHook(() => usePagamentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.confirmarPagamento(1);
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith(
      "/api/pagamentos/1/confirmar",
      expect.objectContaining({ method: "PATCH", token: "test-token" })
    );
  });

  it("confirmarPagamento updates status to aprovado", async () => {
    mockApiFetch.mockResolvedValueOnce([fakePagamento]);

    const { result } = await renderHook(() => usePagamentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.confirmarPagamento(1);
    });

    await waitFor(() => {
      expect(result.current.pagamentos[0].status).toBe("aprovado");
    });
  });

  it("confirmarPagamento only updates the target payment", async () => {
    const fakePagamento2: Pagamento = { ...fakePagamento, id: 2, status: "pendente" };
    mockApiFetch.mockResolvedValueOnce([fakePagamento, fakePagamento2]);

    const { result } = await renderHook(() => usePagamentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.confirmarPagamento(1);
    });

    await waitFor(() => {
      expect(result.current.pagamentos[0].status).toBe("aprovado");
      expect(result.current.pagamentos[1].status).toBe("pendente");
    });
  });

  it("confirmarPagamento throws when token is null", async () => {
    jest.resetModules();
    jest.mock("../hooks/auth/useAuth", () => ({
      useAuth: () => ({ token: null }),
    }));
  });
});
