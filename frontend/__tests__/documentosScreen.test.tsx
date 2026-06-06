import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import * as ExpoLinking from "expo-linking";
import { ToastProvider } from "../hooks/ToastContext";

// Mock expo-router
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ consultaId: "42" }),
  useRouter: () => ({ push: jest.fn() }),
  Stack: {
    Screen: () => null,
  },
}));

// Mock expo-linking
jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));

// Mock the hook
jest.mock("../hooks/useDocumentosConsulta", () => ({
  useDocumentosConsulta: jest.fn(),
}));

import { useDocumentosConsulta } from "../hooks/useDocumentosConsulta";
import DocumentosScreen from "../app/(app)/documentos/[consultaId]";

const mockUseDocumentosConsulta = useDocumentosConsulta as jest.Mock;
const mockOpenURL = ExpoLinking.openURL as jest.Mock;

const mockFetchDocuments = jest.fn();
const mockPickAndUpload = jest.fn();

const defaultHookReturn = {
  documents: [],
  isLoading: false,
  error: null,
  isUploading: false,
  uploadError: null,
  fetchDocuments: mockFetchDocuments,
  pickAndUpload: mockPickAndUpload,
};

beforeEach(() => {
  mockUseDocumentosConsulta.mockReturnValue(defaultHookReturn);
  mockFetchDocuments.mockClear();
  mockPickAndUpload.mockClear();
  mockOpenURL.mockClear();
});

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("DocumentosScreen", () => {
  it("renders loading indicator when isLoading is true", async () => {
    mockUseDocumentosConsulta.mockReturnValue({ ...defaultHookReturn, isLoading: true });
    const { getByTestId } = await renderWithToast(<DocumentosScreen />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("renders error message and retry button when error is set", async () => {
    mockUseDocumentosConsulta.mockReturnValue({ ...defaultHookReturn, error: "Failed to load" });
    const { getByText } = await renderWithToast(<DocumentosScreen />);
    expect(getByText(/Failed to load/)).toBeTruthy();
    expect(getByText(/retry|tentar novamente/i)).toBeTruthy();
  });

  it("calls fetchDocuments when retry button is pressed", async () => {
    mockUseDocumentosConsulta.mockReturnValue({ ...defaultHookReturn, error: "Failed to load" });
    const { getByText } = await renderWithToast(<DocumentosScreen />);
    fireEvent.press(getByText(/retry|tentar novamente/i));
    expect(mockFetchDocuments).toHaveBeenCalledTimes(1);
  });

  it("renders empty state when documents array is empty", async () => {
    mockUseDocumentosConsulta.mockReturnValue({ ...defaultHookReturn, documents: [], isLoading: false });
    const { getByText } = await renderWithToast(<DocumentosScreen />);
    expect(getByText(/no documents|nenhum documento/i)).toBeTruthy();
  });

  it("renders document list with filename", async () => {
    mockUseDocumentosConsulta.mockReturnValue({
      ...defaultHookReturn,
      documents: [
        {
          id: 1,
          consultaId: 42,
          nomeArquivo: "laudo.pdf",
          tipoMime: "application/pdf",
          criadoEm: "2026-06-01T00:00:00.000Z",
          url: "https://storage.example.com/blob?sas=token",
        },
      ],
    });
    const { getByText } = await renderWithToast(<DocumentosScreen />);
    expect(getByText("laudo.pdf")).toBeTruthy();
  });

  it("opens SAS URL when filename is pressed", async () => {
    mockUseDocumentosConsulta.mockReturnValue({
      ...defaultHookReturn,
      documents: [
        {
          id: 1,
          consultaId: 42,
          nomeArquivo: "laudo.pdf",
          tipoMime: "application/pdf",
          criadoEm: "2026-06-01T00:00:00.000Z",
          url: "https://storage.example.com/blob?sas=token",
        },
      ],
    });
    const { getByText } = await renderWithToast(<DocumentosScreen />);
    fireEvent.press(getByText("laudo.pdf"));
    expect(mockOpenURL).toHaveBeenCalledWith("https://storage.example.com/blob?sas=token");
  });

  it("calls pickAndUpload when upload button is pressed", async () => {
    mockUseDocumentosConsulta.mockReturnValue(defaultHookReturn);
    const { getByTestId } = await renderWithToast(<DocumentosScreen />);
    fireEvent.press(getByTestId("upload-button"));
    expect(mockPickAndUpload).toHaveBeenCalledTimes(1);
  });

  it("disables upload button when isUploading is true", async () => {
    mockUseDocumentosConsulta.mockReturnValue({ ...defaultHookReturn, isUploading: true });
    const { getByTestId } = await renderWithToast(<DocumentosScreen />);
    const button = getByTestId("upload-button");
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it("shows uploadError below the upload button", async () => {
    mockUseDocumentosConsulta.mockReturnValue({ ...defaultHookReturn, uploadError: "Upload failed with 502" });
    const { getByText } = await renderWithToast(<DocumentosScreen />);
    expect(getByText(/Upload failed with 502/)).toBeTruthy();
  });
});
