import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { ToastProvider, ToastContext } from "../hooks/ToastContext";
import { useContext } from "react";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe("ToastContext", () => {
  it("starts with an empty toasts array", async () => {
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    expect(result.current!.toasts).toEqual([]);
    unmount();
  });

  it("addToast appends a toast item to the queue", async () => {
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    await act(async () => {
      result.current!.addToast("success", "Login realizado com sucesso.");
    });
    expect(result.current!.toasts).toHaveLength(1);
    expect(result.current!.toasts[0].type).toBe("success");
    expect(result.current!.toasts[0].message).toBe("Login realizado com sucesso.");
    expect(typeof result.current!.toasts[0].id).toBe("string");
    unmount();
  });

  it("addToast assigns a unique id to each toast", async () => {
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    await act(async () => {
      result.current!.addToast("success", "First");
      result.current!.addToast("error", "Second");
    });
    expect(result.current!.toasts).toHaveLength(2);
    expect(result.current!.toasts[0].id).not.toBe(result.current!.toasts[1].id);
    unmount();
  });

  it("removeToast removes a toast by id", async () => {
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    await act(async () => {
      result.current!.addToast("error", "Erro ao fazer login");
    });
    const id = result.current!.toasts[0].id;
    await act(async () => {
      result.current!.removeToast(id);
    });
    expect(result.current!.toasts).toHaveLength(0);
    unmount();
  });

  it("auto-dismiss fires removeToast after 3000 ms", async () => {
    jest.useFakeTimers();
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    await act(async () => {
      result.current!.addToast("success", "Consulta agendada com sucesso!");
    });
    expect(result.current!.toasts).toHaveLength(1);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current!.toasts).toHaveLength(0);
    unmount();
    jest.useRealTimers();
  });

  it("does not auto-dismiss before 3000 ms", async () => {
    jest.useFakeTimers();
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    await act(async () => {
      result.current!.addToast("success", "Documento enviado com sucesso.");
    });
    await act(async () => {
      jest.advanceTimersByTime(2999);
    });
    expect(result.current!.toasts).toHaveLength(1);
    unmount();
    jest.useRealTimers();
  });

  it("two toasts added at different times have independent timers", async () => {
    jest.useFakeTimers();
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    await act(async () => {
      result.current!.addToast("success", "First");
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      result.current!.addToast("error", "Second");
    });
    expect(result.current!.toasts).toHaveLength(2);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current!.toasts).toHaveLength(1);
    expect(result.current!.toasts[0].message).toBe("Second");

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current!.toasts).toHaveLength(0);
    unmount();
    jest.useRealTimers();
  });

  it("removeToast does not throw for an unknown id", async () => {
    const { result, unmount } = await renderHook(() => useContext(ToastContext), { wrapper });
    await expect(async () => {
      await act(async () => {
        result.current!.removeToast("nonexistent-id");
      });
    }).not.toThrow();
    unmount();
  });
});
