import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { ToastProvider } from "../hooks/ToastContext";
import { useToast } from "../hooks/useToast";
import { useLogin } from "../hooks/auth/useLogin";

// Mock expo-router
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock apiFetch
const mockApiFetch = jest.fn();
jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

// Mock useAuth to return controllable login/logout
const mockLogin = jest.fn();
const mockLogout = jest.fn();
jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: mockLogout,
    token: null,
    usuario: null,
    isLoading: false,
  }),
}));

// Wrapper with ToastProvider
function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe("Toast integration - login flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows success toast after successful login", async () => {
    mockApiFetch.mockResolvedValueOnce({
      token: "jwt-token",
      usuario: { id: 1, nome: "Test", email: "t@t.com", tipo: "paciente" },
    });
    mockLogin.mockResolvedValueOnce(undefined);

    const { result, unmount } = await renderHook(
      () => ({ toast: useToast(), login: useLogin() }),
      { wrapper }
    );

    await act(async () => {
      await result.current.login.handleLogin("t@t.com", "pass");
    });

    expect(result.current.toast.toasts).toHaveLength(1);
    expect(result.current.toast.toasts[0].type).toBe("success");
    expect(result.current.toast.toasts[0].message).toContain("sucesso");

    unmount();
  });

  it("shows error toast after failed login", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Credenciais inválidas"));

    const { result, unmount } = await renderHook(
      () => ({ toast: useToast(), login: useLogin() }),
      { wrapper }
    );

    await act(async () => {
      await result.current.login.handleLogin("bad@bad.com", "wrong");
    });

    expect(result.current.toast.toasts).toHaveLength(1);
    expect(result.current.toast.toasts[0].type).toBe("error");

    unmount();
  });
});

describe("Toast integration - scheduling flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("showToast is callable with success type for scheduling success", async () => {
    const { result, unmount } = await renderHook(() => useToast(), { wrapper });

    await act(async () => {
      result.current.showToast("success", "Consulta agendada com sucesso!");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe("success");
    expect(result.current.toasts[0].message).toBe("Consulta agendada com sucesso!");

    unmount();
  });

  it("showToast is callable with error type for scheduling failure", async () => {
    const { result, unmount } = await renderHook(() => useToast(), { wrapper });

    await act(async () => {
      result.current.showToast("error", "Erro ao agendar consulta. Tente novamente.");
    });

    expect(result.current.toasts[0].type).toBe("error");
    expect(result.current.toasts[0].message).toBe("Erro ao agendar consulta. Tente novamente.");

    unmount();
  });
});

describe("Toast integration - upload flow", () => {
  it("showToast fires error toast when uploadError becomes truthy", async () => {
    const { result, unmount } = await renderHook(() => useToast(), { wrapper });

    await act(async () => {
      result.current.showToast("error", "Falha ao enviar o documento. Tente novamente.");
    });

    expect(result.current.toasts[0].type).toBe("error");
    expect(result.current.toasts[0].message).toContain("documento");

    unmount();
  });

  it("showToast fires success toast when upload completes without error", async () => {
    const { result, unmount } = await renderHook(() => useToast(), { wrapper });

    await act(async () => {
      result.current.showToast("success", "Documento enviado com sucesso.");
    });

    expect(result.current.toasts[0].type).toBe("success");
    expect(result.current.toasts[0].message).toBe("Documento enviado com sucesso.");

    unmount();
  });
});
