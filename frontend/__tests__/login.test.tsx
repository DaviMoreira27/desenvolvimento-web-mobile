import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Platform } from "react-native";
import Login from "../app/login";

const mockRouterPush = jest.fn();
const mockHandleLogin = jest.fn();

const mockLoginState = {
  handleLogin: mockHandleLogin,
  isLoading: false,
  error: null as string | null,
};

jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

jest.mock("../hooks/auth/useLogin", () => ({
  useLogin: () => mockLoginState,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockLoginState.isLoading = false;
  mockLoginState.error = null;
  mockHandleLogin.mockResolvedValue(undefined);
});

describe("Login screen", () => {
  it("renders email and password inputs", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    expect(getByPlaceholderText("seu@email.com")).toBeTruthy();
    expect(getByPlaceholderText("••••••••")).toBeTruthy();
  });

  it("renders the login button", async () => {
    const { getByText } = await render(<Login />);
    expect(getByText("Entrar")).toBeTruthy();
  });

  it("renders criar conta link", async () => {
    const { getByText } = await render(<Login />);
    expect(getByText("Criar conta")).toBeTruthy();
  });

  it("updates email state on change", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    fireEvent.changeText(getByPlaceholderText("seu@email.com"), "test@example.com");
    await waitFor(() => {
      expect(getByPlaceholderText("seu@email.com").props.value).toBe("test@example.com");
    });
  });

  it("updates senha state on change", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    fireEvent.changeText(getByPlaceholderText("••••••••"), "senha123");
    await waitFor(() => {
      expect(getByPlaceholderText("••••••••").props.value).toBe("senha123");
    });
  });

  it("calls handleLogin with email and senha on press", async () => {
    const { getByPlaceholderText, getByText } = await render(<Login />);
    fireEvent.changeText(getByPlaceholderText("seu@email.com"), "u@u.com");
    await waitFor(() =>
      expect(getByPlaceholderText("seu@email.com").props.value).toBe("u@u.com")
    );
    fireEvent.changeText(getByPlaceholderText("••••••••"), "pass");
    await waitFor(() =>
      expect(getByPlaceholderText("••••••••").props.value).toBe("pass")
    );
    fireEvent.press(getByText("Entrar"));
    await waitFor(() => {
      expect(mockHandleLogin).toHaveBeenCalledWith("u@u.com", "pass");
    });
  });

  it("toggles password visibility on Mostrar press", async () => {
    const { getByPlaceholderText, getByText } = await render(<Login />);
    expect(getByPlaceholderText("••••••••").props.secureTextEntry).toBe(true);
    fireEvent.press(getByText("Mostrar"));
    await waitFor(() => {
      expect(getByPlaceholderText("••••••••").props.secureTextEntry).toBe(false);
    });
  });

  it("shows Ocultar text after toggling visibility", async () => {
    const { getByText } = await render(<Login />);
    fireEvent.press(getByText("Mostrar"));
    await waitFor(() => expect(getByText("Ocultar")).toBeTruthy());
  });

  it("shows ActivityIndicator and hides Entrar text when isLoading", async () => {
    mockLoginState.isLoading = true;
    const { queryByText } = await render(<Login />);
    expect(queryByText("Entrar")).toBeNull();
  });

  it("disables the login button when isLoading", async () => {
    mockLoginState.isLoading = true;
    const { getByTestId, queryByText } = await render(<Login />);
    expect(queryByText("Entrar")).toBeNull();
  });

  it("displays error message when error is set", async () => {
    mockLoginState.error = "Credenciais inválidas";
    const { getByText } = await render(<Login />);
    expect(getByText("Credenciais inválidas")).toBeTruthy();
  });

  it("does not render error box when error is null", async () => {
    mockLoginState.error = null;
    const { queryByText } = await render(<Login />);
    expect(queryByText("Credenciais inválidas")).toBeNull();
  });

  it("navigates to /register when criar conta is pressed", async () => {
    const { getByText } = await render(<Login />);
    fireEvent.press(getByText("Criar conta"));
    expect(mockRouterPush).toHaveBeenCalledWith("/register");
  });

  it("sets focusedField on email input focus and clears on blur", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    const emailInput = getByPlaceholderText("seu@email.com");
    await act(async () => {
      fireEvent(emailInput, "focus");
      fireEvent(emailInput, "blur");
    });
  });

  it("applies focused style while a field stays focused", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    const emailInput = getByPlaceholderText("seu@email.com");
    await act(async () => {
      fireEvent(emailInput, "focus");
    });
    const style = emailInput.props.style.flat();
    expect(style).toContainEqual(
      expect.objectContaining({ borderColor: "#19c10f" })
    );
  });

  it("uses height behavior on non-iOS platforms", async () => {
    const original = Platform.OS;
    Platform.OS = "android";
    try {
      const { getByText } = await render(<Login />);
      expect(getByText("Entrar")).toBeTruthy();
    } finally {
      Platform.OS = original;
    }
  });

  it("sets focusedField on senha input focus and clears on blur", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    const senhaInput = getByPlaceholderText("••••••••");
    await act(async () => {
      fireEvent(senhaInput, "focus");
      fireEvent(senhaInput, "blur");
    });
  });
});
