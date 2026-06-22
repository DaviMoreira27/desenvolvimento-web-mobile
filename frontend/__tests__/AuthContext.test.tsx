import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { AuthProvider, AuthContext } from "../hooks/auth/AuthContext";
import { useContext } from "react";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

const fakeToken = "jwt-token-123";
const fakeUser = {
  id: 1,
  nome: "Maria",
  email: "maria@test.com",
  tipo: "paciente" as const,
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts as loading, then resolves with null when no stored auth", async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
    unmount();
  });

  it("restores token and user from SecureStore on mount", async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(fakeToken)
      .mockResolvedValueOnce(JSON.stringify(fakeUser));

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.token).toBe(fakeToken);
    expect(result.current.usuario).toEqual(fakeUser);
    unmount();
  });

  it("does not restore if only token is stored (no user)", async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(fakeToken)
      .mockResolvedValueOnce(null);

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
    unmount();
  });

  it("login saves token and user to SecureStore", async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login(fakeToken, fakeUser);
    });

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "vitalgoal_token",
      fakeToken
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "vitalgoal_usuario",
      JSON.stringify(fakeUser)
    );
    unmount();
  });

  it("login updates token and usuario in state", async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login(fakeToken, fakeUser);
    });

    expect(result.current.token).toBe(fakeToken);
    expect(result.current.usuario).toEqual(fakeUser);
    unmount();
  });

  it("logout removes token and user from SecureStore", async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(fakeToken)
      .mockResolvedValueOnce(JSON.stringify(fakeUser));

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("vitalgoal_token");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("vitalgoal_usuario");
    unmount();
  });

  it("logout clears token and usuario from state", async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(fakeToken)
      .mockResolvedValueOnce(JSON.stringify(fakeUser));

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
    unmount();
  });
});
