import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useDisponibilidade, useDatasDisponiveis, type DisponibilidadeSlot } from "../hooks/useDisponibilidade";

const mockApiFetch = jest.fn();
const mockAuthState = { token: "test-token" as string | null };

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

const fakeSlot: DisponibilidadeSlot = {
  id: 1,
  medicoId: 42,
  diaSemana: "segunda",
  horarioInicio: "08:00",
  criadoEm: "2026-06-06T00:00:00Z",
};

describe("useDisponibilidade", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockAuthState.token = "test-token";
  });

  it("fetches slots on mount and populates the list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeSlot]);

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.slots).toEqual([fakeSlot]);
    expect(result.current.error).toBeNull();
  });

  it("addSlot appends the new slot to slots on success", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newSlot: DisponibilidadeSlot = { ...fakeSlot, id: 2, horarioInicio: "10:00" };
    mockApiFetch.mockResolvedValueOnce(newSlot);

    await act(async () => {
      await result.current.addSlot({ diaSemana: "segunda", horarioInicio: "10:00" });
    });

    await waitFor(() => {
      expect(result.current.slots).toHaveLength(1);
      expect(result.current.slots[0]).toEqual(newSlot);
    });
  });

  it("addSlot sets error on 409 and does not modify slots", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeSlot]);

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => {
      expect(result.current.slots).toHaveLength(1);
    });

    mockApiFetch.mockRejectedValueOnce(new Error("Horário já cadastrado para este dia."));

    await act(async () => {
      await result.current.addSlot({ diaSemana: "segunda", horarioInicio: "08:00" });
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Horário já cadastrado para este dia.");
      expect(result.current.slots).toHaveLength(1);
    });
  });

  it("addSlot clears error before each new call", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockApiFetch.mockRejectedValueOnce(new Error("First error"));

    await act(async () => {
      await result.current.addSlot({ diaSemana: "terca", horarioInicio: "09:00" });
    });

    await waitFor(() => {
      expect(result.current.error).toBe("First error");
    });

    const newSlot: DisponibilidadeSlot = { ...fakeSlot, id: 3 };
    mockApiFetch.mockResolvedValueOnce(newSlot);

    await act(async () => {
      await result.current.addSlot({ diaSemana: "terca", horarioInicio: "09:00" });
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it("removeSlot removes the slot from the list on success", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeSlot]);

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => {
      expect(result.current.slots).toHaveLength(1);
    });

    mockApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.removeSlot(1);
    });

    await waitFor(() => {
      expect(result.current.slots).toHaveLength(0);
    });
  });

  it("removeSlot sets error on failure and keeps the slot in the list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeSlot]);

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => {
      expect(result.current.slots).toHaveLength(1);
    });

    mockApiFetch.mockRejectedValueOnce(new Error("Acesso negado."));

    await act(async () => {
      await result.current.removeSlot(1);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Acesso negado.");
      expect(result.current.slots).toHaveLength(1);
    });
  });

  it("sets error when initial fetch throws", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Falha na rede"));

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Falha na rede");
    expect(result.current.slots).toHaveLength(0);
  });

  it("sets generic error message when thrown value is not an Error", async () => {
    mockApiFetch.mockRejectedValueOnce("string error");

    const { result } = await renderHook(() => useDisponibilidade());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Erro desconhecido");
  });
});

describe("useDatasDisponiveis", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockAuthState.token = "test-token";
  });

  it("returns empty datas and does not fetch when medicoId is null", async () => {
    const { result } = await renderHook(() => useDatasDisponiveis(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.datas.size).toBe(0);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("returns empty datas and does not fetch when token is null", async () => {
    mockAuthState.token = null;

    const { result } = await renderHook(() => useDatasDisponiveis(42));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.datas.size).toBe(0);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("fetches available dates when medicoId and token are provided", async () => {
    const fakeDates = ["2026-07-01", "2026-07-03", "2026-07-05"];
    mockApiFetch.mockResolvedValueOnce(fakeDates);

    const { result } = await renderHook(() => useDatasDisponiveis(42));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.datas).toEqual(new Set(fakeDates));
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("medicoId=42"),
      expect.objectContaining({ token: "test-token" })
    );
  });

  it("returns empty datas on fetch error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Servidor indisponível"));

    const { result } = await renderHook(() => useDatasDisponiveis(42));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.datas.size).toBe(0);
  });

  it("resets datas when medicoId changes to null", async () => {
    const fakeDates = ["2026-07-01"];
    mockApiFetch.mockResolvedValueOnce(fakeDates);

    let medicoId: number | null = 42;
    const { result, rerender } = await renderHook(() => useDatasDisponiveis(medicoId));

    await waitFor(() => expect(result.current.datas.size).toBe(1));

    medicoId = null;
    rerender({});

    await waitFor(() => expect(result.current.datas.size).toBe(0));
  });
});
