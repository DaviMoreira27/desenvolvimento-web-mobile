import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useUserProfile } from "../hooks/useUserProfile";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

const fakeProfile = {
  id: 1,
  nome: "Maria",
  email: "maria@email.com",
  tipo: "paciente" as const,
  telefone: null,
  fotoUrl: null,
  criadoEm: "2026-01-01T00:00:00Z",
};

describe("useUserProfile", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("fetches and returns the user profile", async () => {
    mockApiFetch.mockResolvedValueOnce(fakeProfile);

    const { result } = await renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.profile).toEqual(fakeProfile);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("exposes a refetch function", async () => {
    mockApiFetch.mockResolvedValue(fakeProfile);

    const { result } = await renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(typeof result.current.refetch).toBe("function");
    });
  });

  it("re-fetches when refetch() is called", async () => {
    const profileV1 = { ...fakeProfile, nome: "Maria V1" };
    const profileV2 = { ...fakeProfile, nome: "Maria V2" };
    mockApiFetch.mockResolvedValueOnce(profileV1);
    mockApiFetch.mockResolvedValueOnce(profileV2);

    const { result } = await renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.profile?.nome).toBe("Maria V1");
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.profile?.nome).toBe("Maria V2");
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});
