import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useConsultas, type Consulta } from "../hooks/useConsultas";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

jest.mock("../hooks/useModal", () => ({
  useModal: () => ({ consultasVersion: 0 }),
}));

const fakeConsulta: Consulta = {
  id: 1,
  dataHora: "2026-07-01T10:00:00.000Z",
  tipo: "presencial",
  status: "agendada",
  statusPagamento: "pendente",
  linkMeet: null,
  paciente: { id: 2, nome: "João" },
  medico: { id: 3, nome: "Dr. Silva" },
};

describe("useConsultas", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches consultas on mount and populates the list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeConsulta]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.consultas).toEqual([fakeConsulta]);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Falha na rede"));

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Falha na rede");
    expect(result.current.consultas).toEqual([]);
  });

  it("starts as loading and resolves to false", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("concluir calls PATCH on the correct endpoint", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeConsulta]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.concluir(1);
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith(
      "/api/consultas/1/concluir",
      expect.objectContaining({ method: "PATCH", token: "test-token" })
    );
  });

  it("concluir updates the consulta status to concluida", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeConsulta]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.concluir(1);
    });

    await waitFor(() => {
      expect(result.current.consultas[0].status).toBe("concluida");
    });
  });

  it("concluir only updates the target consulta, leaving others unchanged", async () => {
    const fakeConsulta2: Consulta = { ...fakeConsulta, id: 2, status: "agendada" };
    mockApiFetch.mockResolvedValueOnce([fakeConsulta, fakeConsulta2]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.concluir(1);
    });

    await waitFor(() => {
      expect(result.current.consultas[0].status).toBe("concluida");
      expect(result.current.consultas[1].status).toBe("agendada");
    });
  });

  it("cancelar calls PATCH on the correct endpoint", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeConsulta]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.cancelar(1);
    });

    expect(mockApiFetch).toHaveBeenLastCalledWith(
      "/api/consultas/1/cancelar",
      expect.objectContaining({ method: "PATCH", token: "test-token" })
    );
  });

  it("cancelar updates status to cancelada and statusPagamento to cancelado", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeConsulta]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.cancelar(1);
    });

    await waitFor(() => {
      expect(result.current.consultas[0].status).toBe("cancelada");
      expect(result.current.consultas[0].statusPagamento).toBe("cancelado");
    });
  });

  it("cancelar only updates the target consulta", async () => {
    const fakeConsulta2: Consulta = {
      ...fakeConsulta,
      id: 2,
      status: "agendada",
      statusPagamento: "pendente",
    };
    mockApiFetch.mockResolvedValueOnce([fakeConsulta, fakeConsulta2]);

    const { result } = await renderHook(() => useConsultas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.cancelar(1);
    });

    await waitFor(() => {
      expect(result.current.consultas[0].status).toBe("cancelada");
      expect(result.current.consultas[1].status).toBe("agendada");
      expect(result.current.consultas[1].statusPagamento).toBe("pendente");
    });
  });
});
