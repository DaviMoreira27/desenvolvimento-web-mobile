import { act, renderHook } from "@testing-library/react-native";
import { useRegister } from "../hooks/auth/useRegister";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockApiFetch = jest.fn();
jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockLogin = jest.fn();
jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router } = require("expo-router");

const payload = {
  nome: "João",
  email: "joao@test.com",
  senha: "password123",
  tipo: "paciente" as const,
};

describe("useRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with isLoading false and no error", async () => {
    const { result, unmount } = await renderHook(() => useRegister());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("calls login() and navigates to inicio on success", async () => {
    mockApiFetch.mockResolvedValueOnce({
      token: "jwt-token",
      usuario: { id: 1, nome: "João", email: "joao@test.com", tipo: "paciente" },
    });
    mockLogin.mockResolvedValueOnce(undefined);

    const { result, unmount } = await renderHook(() => useRegister());

    await act(async () => {
      await result.current.handleRegister(payload);
    });

    expect(mockLogin).toHaveBeenCalledWith("jwt-token", {
      id: 1,
      nome: "João",
      email: "joao@test.com",
      tipo: "paciente",
    });
    expect(router.replace).toHaveBeenCalledWith("/(app)/inicio");
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("posts to the correct endpoint with full payload", async () => {
    mockApiFetch.mockResolvedValueOnce({
      token: "jwt-token",
      usuario: { id: 1, nome: "João", email: "joao@test.com", tipo: "paciente" },
    });
    mockLogin.mockResolvedValueOnce(undefined);

    const { result, unmount } = await renderHook(() => useRegister());

    await act(async () => {
      await result.current.handleRegister(payload);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    unmount();
  });

  it("sets error and does not navigate on failure", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Email já cadastrado"));

    const { result, unmount } = await renderHook(() => useRegister());

    await act(async () => {
      await result.current.handleRegister(payload);
    });

    expect(result.current.error).toBe("Email já cadastrado");
    expect(router.replace).not.toHaveBeenCalled();
    unmount();
  });

  it("resets isLoading to false after error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Erro"));

    const { result, unmount } = await renderHook(() => useRegister());

    await act(async () => {
      await result.current.handleRegister(payload);
    });

    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it("uses generic error message when error is not an Error instance", async () => {
    mockApiFetch.mockRejectedValueOnce("string error");

    const { result, unmount } = await renderHook(() => useRegister());

    await act(async () => {
      await result.current.handleRegister(payload);
    });

    expect(result.current.error).toBe("Erro ao criar conta");
    unmount();
  });

  it("clears error before each new register attempt", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("First error"));

    const { result, unmount } = await renderHook(() => useRegister());

    await act(async () => {
      await result.current.handleRegister(payload);
    });

    expect(result.current.error).toBe("First error");

    mockApiFetch.mockResolvedValueOnce({
      token: "jwt-token",
      usuario: { id: 1, nome: "João", email: "joao@test.com", tipo: "paciente" },
    });
    mockLogin.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.handleRegister(payload);
    });

    expect(result.current.error).toBeNull();
    unmount();
  });
});
