import { renderHook, waitFor } from "@testing-library/react-native";
import { useMedicos, type Medico } from "../hooks/useMedicos";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

const fakeMedico: Medico = {
  id: 3,
  nome: "Dr. Silva",
  email: "silva@clinic.com",
  tipo: "medico",
  googleConectado: true,
};

describe("useMedicos", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches medicos on mount and populates the list", async () => {
    mockApiFetch.mockResolvedValueOnce([fakeMedico]);

    const { result } = await renderHook(() => useMedicos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.medicos).toEqual([fakeMedico]);
    expect(result.current.error).toBeNull();
  });

  it("starts as loading and resolves to false", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useMedicos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("sets error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Unauthorized"));

    const { result } = await renderHook(() => useMedicos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Unauthorized");
    expect(result.current.medicos).toEqual([]);
  });

  it("fetches from the correct endpoint with token", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useMedicos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/users/medicos",
      expect.objectContaining({ token: "test-token" })
    );
  });

  it("returns an empty list when there are no medicos", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useMedicos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.medicos).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("handles multiple medicos correctly", async () => {
    const fakeMedico2: Medico = {
      id: 4,
      nome: "Dra. Costa",
      email: "costa@clinic.com",
      tipo: "medico",
      googleConectado: false,
    };
    mockApiFetch.mockResolvedValueOnce([fakeMedico, fakeMedico2]);

    const { result } = await renderHook(() => useMedicos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.medicos).toHaveLength(2);
    expect(result.current.medicos[1]).toEqual(fakeMedico2);
  });
});
