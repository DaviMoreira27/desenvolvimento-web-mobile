import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import Consultas from "../app/(app)/consultas";

const mockPush = jest.fn();
const mockSetOpenModal = jest.fn();
const mockShowToast = jest.fn();
const mockConcluir = jest.fn(() => Promise.resolve());
const mockCancelar = jest.fn(() => Promise.resolve());

const mockConsultasState = {
  consultas: [] as object[],
  isLoading: false,
  error: null as string | null,
};

const mockAuthState = {
  usuario: null as { tipo: string } | null,
  token: "test-token" as string | null,
};

const mockProfileState = {
  profile: null as { googleConectado?: boolean } | null,
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../hooks/useConsultas", () => ({
  useConsultas: () => ({
    ...mockConsultasState,
    concluir: mockConcluir,
    cancelar: mockCancelar,
  }),
}));

jest.mock("../hooks/useModal", () => ({
  useModal: () => ({ setOpenModal: mockSetOpenModal }),
}));

jest.mock("../hooks/useToast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock("../hooks/auth/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

jest.mock("../hooks/useUserProfile", () => ({
  useUserProfile: () => mockProfileState,
}));

jest.mock("../hooks/useMetasPaciente", () => ({
  useMetasPaciente: () => ({ metas: [], isLoading: false }),
}));

jest.mock("../lib/api", () => ({
  apiFetch: jest.fn(),
  API_URL: "http://localhost:3000",
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  mockConsultasState.consultas = [];
  mockConsultasState.isLoading = false;
  mockConsultasState.error = null;
  mockAuthState.usuario = null;
  mockAuthState.token = "test-token";
  mockProfileState.profile = null;
});

describe("Consultas - loading and error states", () => {
  it("renders loading indicator while isLoading is true", async () => {
    mockConsultasState.isLoading = true;
    const { queryByText } = await render(<Consultas />);
    expect(queryByText("Nenhuma consulta agendada")).toBeNull();
    expect(queryByText("Erro ao carregar consultas")).toBeNull();
  });

  it("renders error message when error is set", async () => {
    mockConsultasState.error = "Falha ao carregar";
    const { getByText } = await render(<Consultas />);
    expect(getByText("Erro ao carregar consultas")).toBeTruthy();
  });
});

describe("Consultas - empty states", () => {
  it("renders empty state for paciente with no consultas", async () => {
    const { getByText } = await render(<Consultas />);
    expect(getByText("Nenhuma consulta agendada")).toBeTruthy();
  });

  it("renders no-result state when search term matches nothing", async () => {
    mockConsultasState.consultas = [
      {
        id: 1,
        dataHora: "2026-07-01T10:00:00.000Z",
        tipo: "presencial",
        status: "agendada",
        statusPagamento: "pendente",
        linkMeet: null,
        medico: { id: 3, nome: "Dr. Silva" },
        paciente: { id: 2, nome: "Ana" },
      },
    ];
    const { getByPlaceholderText, getByText } = await render(<Consultas />);
    fireEvent.changeText(getByPlaceholderText(/buscar/i), "xyzxyz");
    await waitFor(() => expect(getByText("Nenhum resultado")).toBeTruthy());
  });
});

describe("Consultas - paciente view", () => {
  beforeEach(() => {
    mockAuthState.usuario = null;
    mockConsultasState.consultas = [
      {
        id: 5,
        dataHora: "2026-07-10T14:00:00.000Z",
        tipo: "presencial",
        status: "agendada",
        statusPagamento: "pendente",
        linkMeet: null,
        medico: { id: 3, nome: "Dr. Lima" },
        paciente: null,
      },
    ];
  });

  it("renders cancelar button for paciente with agendada consulta", async () => {
    const { getByText } = await render(<Consultas />);
    expect(getByText("Cancelar")).toBeTruthy();
  });

  it("opens cancel confirmation modal when Cancelar is pressed", async () => {
    const { getByText } = await render(<Consultas />);
    fireEvent.press(getByText("Cancelar"));
    await waitFor(() => expect(getByText(/tem certeza/i)).toBeTruthy());
  });

  it("calls cancelar and shows success toast on confirmation", async () => {
    const { getByText, getAllByText } = await render(<Consultas />);
    fireEvent.press(getByText("Cancelar"));
    await waitFor(() => expect(getByText(/tem certeza/i)).toBeTruthy());
    const [, confirmBtn] = getAllByText("Cancelar consulta");
    fireEvent.press(confirmBtn);
    await waitFor(() => {
      expect(mockCancelar).toHaveBeenCalledWith(5);
      expect(mockShowToast).toHaveBeenCalledWith("success", "Consulta cancelada.");
    });
  });

  it("shows error toast when cancelar throws", async () => {
    mockCancelar.mockRejectedValueOnce(new Error("Erro"));
    const { getByText, getAllByText } = await render(<Consultas />);
    fireEvent.press(getByText("Cancelar"));
    await waitFor(() => expect(getByText(/tem certeza/i)).toBeTruthy());
    const [, confirmBtn] = getAllByText("Cancelar consulta");
    fireEvent.press(confirmBtn);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("error", "Erro ao cancelar consulta. Tente novamente.");
    });
  });

  it("closes cancel modal when Voltar is pressed", async () => {
    const { getByText, queryByText } = await render(<Consultas />);
    fireEvent.press(getByText("Cancelar"));
    await waitFor(() => expect(getByText(/tem certeza/i)).toBeTruthy());
    fireEvent.press(getByText("Voltar"));
    await waitFor(() => expect(queryByText(/tem certeza/i)).toBeNull());
  });

  it("shows pagar consulta badge when statusPagamento is pendente", async () => {
    const { getByText } = await render(<Consultas />);
    expect(getByText(/pagar consulta/i)).toBeTruthy();
  });
});

describe("Consultas - medico view", () => {
  beforeEach(() => {
    mockAuthState.usuario = { tipo: "medico" };
    mockConsultasState.consultas = [
      {
        id: 10,
        dataHora: "2026-07-15T09:00:00.000Z",
        tipo: "presencial",
        status: "agendada",
        statusPagamento: "pago",
        linkMeet: null,
        paciente: { id: 2, nome: "João" },
        medico: null,
      },
    ];
  });

  it("renders concluir button for medico with agendada consulta", async () => {
    const { getByText } = await render(<Consultas />);
    expect(getByText("Concluir")).toBeTruthy();
  });

  it("calls concluir and shows success toast", async () => {
    const { getByText } = await render(<Consultas />);
    fireEvent.press(getByText("Concluir"));
    await waitFor(() => {
      expect(mockConcluir).toHaveBeenCalledWith(10);
      expect(mockShowToast).toHaveBeenCalledWith("success", "Consulta concluída.");
    });
  });

  it("shows error toast when concluir throws", async () => {
    mockConcluir.mockRejectedValueOnce(new Error("Erro"));
    const { getByText } = await render(<Consultas />);
    fireEvent.press(getByText("Concluir"));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("error", "Erro ao concluir consulta.");
    });
  });

  it("renders ver metas button when paciente has id", async () => {
    const { getByText } = await render(<Consultas />);
    expect(getByText(/ver metas/i)).toBeTruthy();
  });

  it("opens MetasModal with empty metas when Ver metas is pressed", async () => {
    const { getByText } = await render(<Consultas />);
    fireEvent.press(getByText(/ver metas/i));
    await waitFor(() => expect(getByText("Metas de João")).toBeTruthy());
    expect(getByText("Nenhuma meta cadastrada.")).toBeTruthy();
  });

  it("closes MetasModal when Fechar is pressed", async () => {
    const { getByText, queryByText } = await render(<Consultas />);
    fireEvent.press(getByText(/ver metas/i));
    await waitFor(() => expect(getByText("Metas de João")).toBeTruthy());
    fireEvent.press(getByText("Fechar"));
    await waitFor(() => expect(queryByText("Metas de João")).toBeNull());
  });
});

describe("Consultas - teleconsulta", () => {
  beforeEach(() => {
    mockAuthState.usuario = { tipo: "medico" };
  });

  it("renders aguardando link when tipo is teleconsulta and no linkMeet with google connected", async () => {
    mockProfileState.profile = { googleConectado: true };
    mockConsultasState.consultas = [
      {
        id: 20,
        dataHora: "2026-07-20T10:00:00.000Z",
        tipo: "teleconsulta",
        status: "agendada",
        statusPagamento: "pago",
        linkMeet: null,
        paciente: { id: 2, nome: "Ana" },
        medico: null,
      },
    ];
    const { getByText } = await render(<Consultas />);
    expect(getByText(/aguardando link/i)).toBeTruthy();
  });

  it("renders meet button and calls Linking.openURL when linkMeet is set", async () => {
    mockProfileState.profile = { googleConectado: true };
    mockConsultasState.consultas = [
      {
        id: 21,
        dataHora: "2026-07-20T11:00:00.000Z",
        tipo: "teleconsulta",
        status: "agendada",
        statusPagamento: "pago",
        linkMeet: "https://meet.google.com/abc-def",
        paciente: { id: 2, nome: "Ana" },
        medico: null,
      },
    ];
    const { getByText } = await render(<Consultas />);
    fireEvent.press(getByText(/entrar via meet/i));
    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith("https://meet.google.com/abc-def")
    );
  });

  it("renders conectar google when medico has not connected google", async () => {
    mockProfileState.profile = { googleConectado: false };
    mockConsultasState.consultas = [
      {
        id: 22,
        dataHora: "2026-07-21T10:00:00.000Z",
        tipo: "teleconsulta",
        status: "agendada",
        statusPagamento: "pago",
        linkMeet: null,
        paciente: { id: 2, nome: "Ana" },
        medico: null,
      },
    ];
    const { getByText } = await render(<Consultas />);
    expect(getByText(/conectar google/i)).toBeTruthy();
  });
});

describe("Consultas - MetasModal with data", () => {
  it("renders pending and completed metas", async () => {
    mockAuthState.usuario = { tipo: "medico" };
    mockConsultasState.consultas = [
      {
        id: 30,
        dataHora: "2026-07-25T10:00:00.000Z",
        tipo: "presencial",
        status: "agendada",
        statusPagamento: "pago",
        linkMeet: null,
        paciente: { id: 5, nome: "Carlos" },
        medico: null,
      },
    ];

    jest.spyOn(require("../hooks/useMetasPaciente"), "useMetasPaciente").mockReturnValue({
      metas: [
        { id: 1, titulo: "Meta pendente", descricao: "Descrição A", concluida: false },
        { id: 2, titulo: "Meta concluída", descricao: null, concluida: true },
      ],
      isLoading: false,
    });

    const { getByText } = await render(<Consultas />);
    fireEvent.press(getByText(/ver metas/i));
    await waitFor(() => expect(getByText("Meta pendente")).toBeTruthy());
    expect(getByText("Concluídas")).toBeTruthy();
    expect(getByText("Meta concluída")).toBeTruthy();
  });
});
