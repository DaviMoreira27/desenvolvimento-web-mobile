import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { ToastProvider } from "../hooks/ToastContext";
import { useToast } from "../hooks/useToast";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe("useToast", () => {
  it("throws a descriptive error when consumed outside ToastProvider", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    let caughtError: Error | null = null;
    try {
      await renderHook(() => useToast());
    } catch (err) {
      caughtError = err as Error;
    }
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe("useToast must be used within ToastProvider");
    consoleSpy.mockRestore();
  });

  it("returns showToast and toasts when inside ToastProvider", async () => {
    const { result, unmount } = await renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.showToast).toBe("function");
    expect(Array.isArray(result.current.toasts)).toBe(true);
    unmount();
  });

  it("showToast appends a toast to the queue", async () => {
    const { result, unmount } = await renderHook(() => useToast(), { wrapper });
    expect(result.current.toasts).toHaveLength(0);
    await act(async () => {
      result.current.showToast("success", "Você saiu da sua conta.");
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Você saiu da sua conta.");
    unmount();
  });
});
