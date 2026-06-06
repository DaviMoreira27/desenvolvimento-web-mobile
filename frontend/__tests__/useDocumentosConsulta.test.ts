import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useDocumentosConsulta } from "../hooks/useDocumentosConsulta";

// Mock useAuth
jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

// Mock apiFetch
const mockApiFetch = jest.fn();
jest.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  API_URL: "http://localhost:3000",
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock expo-document-picker
const mockGetDocumentAsync = jest.fn();
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

const fakeDocuments = [
  {
    id: 1,
    consultaId: 42,
    nomeArquivo: "laudo.pdf",
    tipoMime: "application/pdf",
    criadoEm: "2026-06-01T00:00:00.000Z",
    url: "https://storage.example.com/blob?sas=token",
  },
];

describe("useDocumentosConsulta", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockFetch.mockClear();
    mockGetDocumentAsync.mockClear();
  });

  it("starts with isLoading true and fetches documents on mount", async () => {
    mockApiFetch.mockResolvedValueOnce(fakeDocuments);

    const { result } = await renderHook(() => useDocumentosConsulta(42));

    await waitFor(() => {
      expect(result.current?.isLoading).toBe(false);
    });

    expect(result.current?.documents).toEqual(fakeDocuments);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/consultas/42/documentos", {
      token: "test-token",
    });
  });

  it("sets error when fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = await renderHook(() => useDocumentosConsulta(42));

    await waitFor(() => {
      expect(result.current?.isLoading).toBe(false);
    });

    expect(result.current?.error).toBe("Network error");
    expect(result.current?.documents).toEqual([]);
  });

  it("sets uploadError when upload fails", async () => {
    mockApiFetch.mockResolvedValueOnce(fakeDocuments);

    const { result } = await renderHook(() => useDocumentosConsulta(42));

    await waitFor(() => expect(result.current?.isLoading).toBe(false));

    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "file:///path/to/file.pdf",
          name: "file.pdf",
          mimeType: "application/pdf",
        },
      ],
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Upload failed" }),
    });

    await act(async () => {
      await result.current?.pickAndUpload();
    });

    expect(result.current?.uploadError).toBeTruthy();
  });

  it("calls fetchDocuments after a successful upload", async () => {
    const uploadedDoc = { ...fakeDocuments[0], id: 2, nomeArquivo: "new.pdf" };
    mockApiFetch
      .mockResolvedValueOnce(fakeDocuments)
      .mockResolvedValueOnce([...fakeDocuments, uploadedDoc]);

    const { result } = await renderHook(() => useDocumentosConsulta(42));

    await waitFor(() => expect(result.current?.isLoading).toBe(false));

    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "file:///path/to/new.pdf",
          name: "new.pdf",
          mimeType: "application/pdf",
        },
      ],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => uploadedDoc,
    });

    await act(async () => {
      await result.current?.pickAndUpload();
    });

    await waitFor(() => {
      expect(result.current?.documents).toHaveLength(2);
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it("does not call fetch when picker is canceled", async () => {
    mockApiFetch.mockResolvedValueOnce(fakeDocuments);
    mockGetDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    const { result } = await renderHook(() => useDocumentosConsulta(42));

    await waitFor(() => expect(result.current?.isLoading).toBe(false));

    await act(async () => {
      await result.current?.pickAndUpload();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current?.uploadError).toBeNull();
  });

  it("prevents concurrent upload submissions via isUploading guard", async () => {
    mockApiFetch.mockResolvedValueOnce(fakeDocuments);

    let resolveFetch!: (value: unknown) => void;
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///path/to/file.pdf", name: "file.pdf", mimeType: "application/pdf" }],
    });

    // First call returns a pending promise; second should be blocked by the ref guard
    mockFetch.mockReturnValueOnce(pendingFetch);

    const { result } = await renderHook(() => useDocumentosConsulta(42));

    await waitFor(() => expect(result.current?.isLoading).toBe(false));

    // Start first upload inside act to capture synchronous state updates
    // (setIsUploading, setUploadError), but don't await its completion so
    // the pending fetch remains in-flight
    let firstUpload: Promise<void> | undefined;
    await act(async () => {
      firstUpload = result.current?.pickAndUpload();
    });

    // Immediately attempt a second upload - the ref guard should block it
    await act(async () => {
      await result.current?.pickAndUpload();
    });

    // fetch should only have been called once because the second call was blocked by uploadingRef
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Resolve the pending first upload
    resolveFetch({ ok: true, json: async () => fakeDocuments[0] });
    await act(async () => { await firstUpload; });
  });
});
