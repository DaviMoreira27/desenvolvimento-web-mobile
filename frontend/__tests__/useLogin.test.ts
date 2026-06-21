import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { ToastProvider } from "../hooks/ToastContext";
import { useLogin } from "../hooks/auth/useLogin";

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
  useAuth: () => ({ login: mockLogin, token: null }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ToastProvider, null, children);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router } = require("expo-router");

describe("useLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with isLoading false and no error", async () => {
    const { result, unmount } = await renderHook(() => useLogin(), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("calls login() and navigates to inicio on success", async () => {
    mockApiFetch.mockResolvedValueOnce({
      token: "jwt-token",
      usuario: { id: 1, nome: "Test", email: "t@t.com", tipo: "paciente" },
    });
    mockLogin.mockResolvedValueOnce(undefined);

    const { result, unmount } = await renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.handleLogin("t@t.com", "pass");
    });

    expect(mockLogin).toHaveBeenCalledWith("jwt-token", {
      id: 1,
      nome: "Test",
      email: "t@t.com",
      tipo: "paciente",
    });
    expect(router.replace).toHaveBeenCalledWith("/(app)/inicio");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it("posts to the correct endpoint with email and senha", async () => {
    mockApiFetch.mockResolvedValueOnce({
      token: "jwt-token",
      usuario: { id: 1, nome: "Test", email: "t@t.com", tipo: "paciente" },
    });
    mockLogin.mockResolvedValueOnce(undefined);

    const { result, unmount } = await renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.handleLogin("t@t.com", "pass");
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "t@t.com", senha: "pass" }),
      })
    );
    unmount();
  });

  it("sets error and does not navigate on failure", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Credenciais inválidas"));

    const { result, unmount } = await renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.handleLogin("bad@bad.com", "wrong");
    });

    expect(result.current.error).toBe("Credenciais inválidas");
    expect(router.replace).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it("uses generic error message when error is not an Error instance", async () => {
    mockApiFetch.mockRejectedValueOnce("string error");

    const { result, unmount } = await renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.handleLogin("bad@bad.com", "wrong");
    });

    expect(result.current.error).toBe("Erro ao fazer login");
    unmount();
  });

  it("clears error before each new login attempt", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("First error"));

    const { result, unmount } = await renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.handleLogin("bad@bad.com", "wrong");
    });

    expect(result.current.error).toBe("First error");

    mockApiFetch.mockResolvedValueOnce({
      token: "jwt-token",
      usuario: { id: 1, nome: "Test", email: "t@t.com", tipo: "paciente" },
    });
    mockLogin.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.handleLogin("t@t.com", "pass");
    });

    expect(result.current.error).toBeNull();
    unmount();
  });

  it("resets isLoading to false after error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Erro"));

    const { result, unmount } = await renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.handleLogin("x@x.com", "pw");
    });

    expect(result.current.isLoading).toBe(false);
    unmount();
  });
});
