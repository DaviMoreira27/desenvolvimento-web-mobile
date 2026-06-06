import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Consultas from "../app/(app)/consultas";

const mockPush = jest.fn();

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock hooks used by consultas screen
jest.mock("../hooks/useConsultas", () => ({
  useConsultas: () => ({
    consultas: [
      {
        id: 7,
        dataHora: "2026-07-01T10:00:00.000Z",
        tipo: "presencial",
        status: "agendada",
        statusPagamento: "pendente",
        linkMeet: null,
        paciente: { id: 2, nome: "Paciente Test" },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock("../hooks/useModal", () => ({
  useModal: () => ({ setOpenModal: jest.fn() }),
}));

beforeEach(() => {
  mockPush.mockClear();
});

describe("Consultas - Ver documentos navigation", () => {
  it("calls router.push with /documentos/<id> when Ver documentos is pressed", async () => {
    const { getByText } = await render(<Consultas />);
    const docButton = getByText(/ver documentos/i);
    fireEvent.press(docButton);
    expect(mockPush).toHaveBeenCalledWith("/documentos/7");
  });
});
