import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useSlotsLivres } from "../hooks/useSlotsLivres";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

describe("useSlotsLivres", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("returns empty slots and does not fetch when medicoId is null", async () => {
    const { result } = await renderHook(() => useSlotsLivres(null, "2026-06-10"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.slots).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("returns empty slots and does not fetch when data is null", async () => {
    const { result } = await renderHook(() => useSlotsLivres(1, null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.slots).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("returns empty slots and does not fetch when both are null", async () => {
    const { result } = await renderHook(() => useSlotsLivres(null, null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.slots).toEqual([]);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("populates slots with API response on successful fetch", async () => {
    const fakeSlots = [{ horarioInicio: "08:00" }, { horarioInicio: "10:00" }];
    mockApiFetch.mockResolvedValueOnce(fakeSlots);

    const { result } = await renderHook(() => useSlotsLivres(1, "2026-06-10"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.slots).toEqual(fakeSlots);
    expect(result.current.error).toBeNull();
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/disponibilidade/slots-livres?medicoId=1&data=2026-06-10",
      expect.objectContaining({ token: "test-token" })
    );
  });

  it("sets error and keeps slots empty on fetch failure", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Servidor indisponível"));

    const { result } = await renderHook(() => useSlotsLivres(1, "2026-06-10"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.slots).toEqual([]);
    expect(result.current.error).toBe("Servidor indisponível");
  });

  it("resets slots to empty when medicoId becomes null", async () => {
    const fakeSlots = [{ horarioInicio: "08:00" }];
    mockApiFetch.mockResolvedValueOnce(fakeSlots);

    const { result, rerender } = await renderHook(
      ({ medicoId, data }: { medicoId: number | null; data: string | null }) =>
        useSlotsLivres(medicoId, data),
      { initialProps: { medicoId: 1, data: "2026-06-10" } }
    );

    await waitFor(() => {
      expect(result.current.slots).toHaveLength(1);
    });

    rerender({ medicoId: null, data: "2026-06-10" });

    await waitFor(() => {
      expect(result.current.slots).toEqual([]);
    });
  });

  it("triggers a new fetch when medicoId changes", async () => {
    const slotsForDoctor1 = [{ horarioInicio: "08:00" }];
    const slotsForDoctor2 = [{ horarioInicio: "14:00" }];
    mockApiFetch
      .mockResolvedValueOnce(slotsForDoctor1)
      .mockResolvedValueOnce(slotsForDoctor2);

    const { result, rerender } = await renderHook(
      ({ medicoId, data }: { medicoId: number | null; data: string | null }) =>
        useSlotsLivres(medicoId, data),
      { initialProps: { medicoId: 1, data: "2026-06-10" } }
    );

    await waitFor(() => {
      expect(result.current.slots).toEqual(slotsForDoctor1);
    });

    rerender({ medicoId: 2, data: "2026-06-10" });

    await waitFor(() => {
      expect(result.current.slots).toEqual(slotsForDoctor2);
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});
