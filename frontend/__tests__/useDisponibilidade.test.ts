import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useDisponibilidade, type DisponibilidadeSlot } from "../hooks/useDisponibilidade";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
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
});
