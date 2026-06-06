import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useUpdateProfile } from "../hooks/useUpdateProfile";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

describe("useUpdateProfile", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("starts with isLoading false and error null", async () => {
    const { result } = await renderHook(() => useUpdateProfile());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.updateProfile).toBe("function");
  });

  it("returns the updated UserProfile on success (200)", async () => {
    const fakeProfile = {
      id: 1,
      nome: "Novo Nome",
      email: "a@b.com",
      tipo: "paciente",
      telefone: null,
      fotoUrl: null,
      criadoEm: "2026-01-01T00:00:00Z",
    };
    mockApiFetch.mockResolvedValueOnce(fakeProfile);

    const { result } = await renderHook(() => useUpdateProfile());

    let returned: Awaited<ReturnType<typeof result.current.updateProfile>>;
    await act(async () => {
      returned = await result.current.updateProfile({ nome: "Novo Nome" });
    });

    expect(returned!).toEqual(fakeProfile);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error and re-throws on failure (400)", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Nome inválido"));

    const { result } = await renderHook(() => useUpdateProfile());

    await act(async () => {
      await expect(
        result.current.updateProfile({ nome: "" })
      ).rejects.toThrow("Nome inválido");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Nome inválido");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("calls apiFetch with method PUT and correct token", async () => {
    mockApiFetch.mockResolvedValueOnce({
      id: 1,
      nome: "Test",
      email: "a@b.com",
      tipo: "paciente",
      telefone: null,
      fotoUrl: null,
      criadoEm: "",
    });

    const { result } = await renderHook(() => useUpdateProfile());

    await act(async () => {
      await result.current.updateProfile({ nome: "Test" });
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/users/me",
      expect.objectContaining({
        method: "PUT",
        token: "test-token",
      })
    );
  });
});
