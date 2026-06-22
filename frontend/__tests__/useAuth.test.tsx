import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { AuthProvider } from "../hooks/auth/AuthContext";
import { useAuth } from "../hooks/auth/useAuth";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

describe("useAuth", () => {
  it("dado uso dentro de AuthProvider, retorna o contexto de autenticação", async () => {
    const { result, unmount } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.logout).toBe("function");
    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
    unmount();
  });

  it("dado AsyncStorage com dados salvos, retorna o token e usuário restaurados", async () => {
    const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
    const fakeToken = "stored-jwt";
    const fakeUser = { id: 1, nome: "Ana", email: "ana@test.com", tipo: "paciente" as const };

    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(fakeToken)
      .mockResolvedValueOnce(JSON.stringify(fakeUser));

    const { result, unmount } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBe(fakeToken);
    expect(result.current.usuario).toEqual(fakeUser);
    unmount();
  });
});
