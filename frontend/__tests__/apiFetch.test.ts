import { apiFetch, API_URL } from "../lib/api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(options: {
  ok: boolean;
  status?: number;
  jsonFn?: () => Promise<unknown>;
}) {
  return {
    ok: options.ok,
    status: options.status ?? (options.ok ? 200 : 400),
    json: options.jsonFn ?? jest.fn().mockResolvedValue({}),
  };
}

describe("apiFetch", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends a request to the correct URL", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ ok: true, jsonFn: () => Promise.resolve({ data: 1 }) })
    );

    await apiFetch("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/api/test`,
      expect.any(Object)
    );
  });

  it("includes Content-Type: application/json header", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ ok: true, jsonFn: () => Promise.resolve({}) })
    );

    await apiFetch("/api/test");

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("adds Authorization Bearer header when token is provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ ok: true, jsonFn: () => Promise.resolve({}) })
    );

    await apiFetch("/api/protected", { token: "my-jwt" });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer my-jwt");
  });

  it("does not add Authorization header when no token is provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ ok: true, jsonFn: () => Promise.resolve({}) })
    );

    await apiFetch("/api/public");

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBeUndefined();
  });

  it("returns parsed JSON from a successful response", async () => {
    const body = { id: 1, nome: "Test" };
    mockFetch.mockResolvedValueOnce(
      makeResponse({ ok: true, jsonFn: () => Promise.resolve(body) })
    );

    const result = await apiFetch<typeof body>("/api/resource");
    expect(result).toEqual(body);
  });

  it("throws with the server error message on a non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        ok: false,
        status: 400,
        jsonFn: () => Promise.resolve({ message: "Email já cadastrado" }),
      })
    );

    await expect(apiFetch("/api/auth/register")).rejects.toThrow("Email já cadastrado");
  });

  it("throws Erro na requisição when server returns no message field", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        ok: false,
        status: 500,
        jsonFn: () => Promise.resolve({}),
      })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Erro na requisição");
  });

  it("throws Erro desconhecido when error response body is not valid JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("invalid json")),
    });

    await expect(apiFetch("/api/test")).rejects.toThrow("Erro desconhecido");
  });

  it("returns undefined for 204 No Content responses", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ ok: true, status: 204 })
    );

    const result = await apiFetch("/api/resource/1");
    expect(result).toBeUndefined();
  });

  it("forwards method and body to fetch", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ ok: true, jsonFn: () => Promise.resolve({ id: 1 }) })
    );

    const body = JSON.stringify({ nome: "Test" });
    await apiFetch("/api/create", { method: "POST", body, token: "tok" });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(body);
  });

  it("does not call .json() for 204 responses", async () => {
    const jsonSpy = jest.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: jsonSpy,
    });

    await apiFetch("/api/resource/1");
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});
