import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, AuthContext } from "../hooks/auth/AuthContext";
import { useContext } from "react";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

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
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
    unmount();
  });

  it("restores token and user from AsyncStorage on mount", async () => {
    mockAsyncStorage.getItem
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
    mockAsyncStorage.getItem
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

  it("login saves token and user to AsyncStorage", async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login(fakeToken, fakeUser);
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      "@vitalgoal:token",
      fakeToken
    );
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      "@vitalgoal:usuario",
      JSON.stringify(fakeUser)
    );
    unmount();
  });

  it("login updates token and usuario in state", async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login(fakeToken, fakeUser);
    });

    expect(result.current.token).toBe(fakeToken);
    expect(result.current.usuario).toEqual(fakeUser);
    unmount();
  });

  it("logout removes token and user from AsyncStorage", async () => {
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(fakeToken)
      .mockResolvedValueOnce(JSON.stringify(fakeUser));

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("@vitalgoal:token");
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("@vitalgoal:usuario");
    unmount();
  });

  it("logout clears token and usuario from state", async () => {
    mockAsyncStorage.getItem
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
