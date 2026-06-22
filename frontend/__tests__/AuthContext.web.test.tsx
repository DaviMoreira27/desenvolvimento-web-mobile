import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { Platform } from "react-native";
import { AuthProvider, AuthContext } from "../hooks/auth/AuthContext";
import { useContext } from "react";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockLocalStorage = {
  getItem: jest.fn(() => null as string | null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

const fakeToken = "web-jwt-token";
const fakeUser = { id: 1, nome: "Web User", email: "web@test.com", tipo: "paciente" as const };

describe("AuthContext (web platform)", () => {
  let originalOS: typeof Platform.OS;

  beforeAll(() => {
    originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it("reads token and user from localStorage on mount", async () => {
    mockLocalStorage.getItem
      .mockReturnValueOnce(fakeToken)
      .mockReturnValueOnce(JSON.stringify(fakeUser));

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBe(fakeToken);
    expect(result.current.usuario).toEqual(fakeUser);
    unmount();
  });

  it("starts with null token and user when localStorage is empty", async () => {
    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
    unmount();
  });

  it("login writes to localStorage", async () => {
    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login(fakeToken, fakeUser);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("vitalgoal_token", fakeToken);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("vitalgoal_usuario", JSON.stringify(fakeUser));
    unmount();
  });

  it("logout removes from localStorage", async () => {
    mockLocalStorage.getItem
      .mockReturnValueOnce(fakeToken)
      .mockReturnValueOnce(JSON.stringify(fakeUser));

    const { result, unmount } = await renderHook(() => useContext(AuthContext), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("vitalgoal_token");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("vitalgoal_usuario");
    unmount();
  });
});
