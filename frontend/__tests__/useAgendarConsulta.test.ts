import { renderHook, act } from "@testing-library/react-native";
import { useAgendarConsulta } from "../hooks/useAgendarConsulta";

const mockApiFetch = jest.fn();

jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

const payload = {
  medicoId: 5,
  dataHora: "2026-07-01T10:00:00.000Z",
  tipo: "teleconsulta" as const,
};

describe("useAgendarConsulta", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("starts with isLoading false and no error", async () => {
    const { result, unmount } = await renderHook(() => useAgendarConsulta());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("agendar posts to /api/consultas and returns the result", async () => {
    const fakeResult = { id: 99, ...payload };
    mockApiFetch.mockResolvedValueOnce(fakeResult);

    const { result, unmount } = await renderHook(() => useAgendarConsulta());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.agendar(payload);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/consultas",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        token: "test-token",
      })
    );
    expect(returned).toEqual(fakeResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("resets isLoading to false after success", async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 1 });

    const { result, unmount } = await renderHook(() => useAgendarConsulta());

    await act(async () => {
      await result.current.agendar(payload);
    });

    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it("sets error and re-throws on failure", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Horário indisponível"));

    const { result, unmount } = await renderHook(() => useAgendarConsulta());

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.agendar(payload);
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect(caughtError?.message).toBe("Horário indisponível");
    expect(result.current.error).toBe("Horário indisponível");
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it("uses generic error message when error is not an Error instance", async () => {
    mockApiFetch.mockRejectedValueOnce("string error");

    const { result, unmount } = await renderHook(() => useAgendarConsulta());

    await act(async () => {
      try {
        await result.current.agendar(payload);
      } catch {
        // expected re-throw
      }
    });

    expect(result.current.error).toBe("Erro ao agendar");
    unmount();
  });

  it("clears error before each new agendar call", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("First error"));

    const { result, unmount } = await renderHook(() => useAgendarConsulta());

    await act(async () => {
      try {
        await result.current.agendar(payload);
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("First error");

    mockApiFetch.mockResolvedValueOnce({ id: 2 });

    await act(async () => {
      await result.current.agendar(payload);
    });

    expect(result.current.error).toBeNull();
    unmount();
  });
});
