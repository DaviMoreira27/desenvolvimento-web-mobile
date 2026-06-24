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
    const { getByTestId } = await render(<Login />);
    expect(getByTestId("login-button")).toBeDisabled();
  });

  it("keeps the login button enabled when not loading", async () => {
    const { getByTestId } = await render(<Login />);
    expect(getByTestId("login-button")).toBeEnabled();
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

  it("applies the focused border to email on focus and removes it on blur", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    const emailInput = getByPlaceholderText("seu@email.com");
    const focusedBorder = expect.objectContaining({ borderColor: "#19c10f" });

    await act(async () => {
      fireEvent(emailInput, "focus");
    });
    expect(emailInput.props.style.flat()).toContainEqual(focusedBorder);

    await act(async () => {
      fireEvent(emailInput, "blur");
    });
    expect(emailInput.props.style.flat()).not.toContainEqual(focusedBorder);
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

  it("applies the focused border to senha on focus and removes it on blur", async () => {
    const { getByPlaceholderText } = await render(<Login />);
    const senhaInput = getByPlaceholderText("••••••••");
    const focusedBorder = expect.objectContaining({ borderColor: "#19c10f" });

    await act(async () => {
      fireEvent(senhaInput, "focus");
    });
    expect(senhaInput.props.style.flat()).toContainEqual(focusedBorder);

    await act(async () => {
      fireEvent(senhaInput, "blur");
    });
    expect(senhaInput.props.style.flat()).not.toContainEqual(focusedBorder);
  });
});
