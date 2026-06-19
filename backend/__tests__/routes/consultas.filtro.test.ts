import type { Request, Response, NextFunction } from "express";

const pacienteUser = { id: 10, email: "patient@test.com", tipo: "paciente" as const };
const medicoUser = { id: 20, email: "doctor@test.com", tipo: "medico" as const };
let currentMockUser: typeof pacienteUser | typeof medicoUser = { ...pacienteUser };

jest.mock("../../src/middlewares/auth", () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = currentMockUser;
    next();
  },
}));

jest.mock("../../src/services/azureStorage", () => ({
  azureStorage: {
    uploadBlob: jest.fn(),
    generateSasUrl: jest.fn(),
  },
}));

jest.mock("../../src/services/googleMeet", () => ({
  createMeetEvent: jest.fn(),
}));

const mockSelect = jest.fn();
const mockSelectDistinct = jest.fn();

jest.mock("../../src/db", () => ({
  db: {
    select: mockSelect,
    selectDistinct: mockSelectDistinct,
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
}));

import express from "express";
import request from "supertest";
import consultasRouter from "../../src/routes/consultas";

const app = express();
app.use(express.json());
app.use("/api/consultas", consultasRouter);

function makeGetConsultasChain(result: unknown[]) {
  const whereFn = jest.fn().mockResolvedValue(result);
  const secondLeftJoin = jest.fn().mockReturnValue({ where: whereFn });
  const firstLeftJoin = jest.fn().mockReturnValue({ leftJoin: secondLeftJoin });
  mockSelect.mockReturnValueOnce({
    from: jest.fn().mockReturnValue({ leftJoin: firstLeftJoin }),
  });
  return { whereFn };
}

function makeGetByIdChain(result: unknown[]) {
  const whereFn = jest.fn().mockResolvedValue(result);
  mockSelect.mockReturnValueOnce({
    from: jest.fn().mockReturnValue({ where: whereFn }),
  });
  return { whereFn };
}

function makeGetPacientesChain(result: unknown[]) {
  const whereFn = jest.fn().mockResolvedValue(result);
  mockSelectDistinct.mockReturnValueOnce({
    from: jest.fn().mockReturnValue({
      leftJoin: jest.fn().mockReturnValue({ where: whereFn }),
    }),
  });
  return { whereFn };
}

describe("GET /api/consultas — user filter", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockSelectDistinct.mockReset();
    currentMockUser = { ...pacienteUser };
  });

  it("dado um paciente autenticado, retorna apenas as consultas onde ele é o paciente", async () => {
    currentMockUser = { ...pacienteUser };

    const fakeRows = [
      {
        id: 1,
        dataHora: "2026-06-20T10:00:00.000Z",
        tipo: "presencial",
        status: "agendada",
        statusPagamento: "pendente",
        linkMeet: null,
        paciente: { id: 10, nome: "João" },
        medico: { id: 20, nome: "Dr. Silva" },
      },
    ];

    const { whereFn } = makeGetConsultasChain(fakeRows);

    const res = await request(app)
      .get("/api/consultas")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeRows);
    expect(whereFn).toHaveBeenCalledTimes(1);
  });

  it("dado um médico autenticado, retorna apenas as consultas onde ele é o médico", async () => {
    currentMockUser = { ...medicoUser };

    const fakeRows = [
      {
        id: 2,
        dataHora: "2026-06-21T14:00:00.000Z",
        tipo: "teleconsulta",
        status: "agendada",
        statusPagamento: "pendente",
        linkMeet: "https://meet.google.com/abc-xyz",
        paciente: { id: 10, nome: "João" },
        medico: { id: 20, nome: "Dr. Silva" },
      },
    ];

    const { whereFn } = makeGetConsultasChain(fakeRows);

    const res = await request(app)
      .get("/api/consultas")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeRows);
    expect(whereFn).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/consultas/:id", () => {
  const fakeConsulta = {
    id: 1,
    pacienteId: 10,
    medicoId: 20,
    dataHora: new Date("2026-06-20T10:00:00.000Z"),
    tipo: "presencial",
    status: "agendada",
    statusPagamento: "pendente",
    linkMeet: null,
    googleEventId: null,
    criadoEm: new Date("2026-06-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    mockSelect.mockReset();
    mockSelectDistinct.mockReset();
    currentMockUser = { ...pacienteUser };
  });

  it("dado um ID inexistente, retorna 404", async () => {
    makeGetByIdChain([]);

    const res = await request(app)
      .get("/api/consultas/999")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: expect.any(String) });
  });

  it("dado um usuário que não é paciente nem médico da consulta, retorna 403", async () => {
    currentMockUser = { id: 99, email: "other@test.com", tipo: "paciente" as const };
    makeGetByIdChain([fakeConsulta]);

    const res = await request(app)
      .get("/api/consultas/1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
  });

  it("dado o paciente dono da consulta, retorna 200 com os dados", async () => {
    currentMockUser = { ...pacienteUser };
    makeGetByIdChain([fakeConsulta]);

    const res = await request(app)
      .get("/api/consultas/1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, pacienteId: 10, medicoId: 20 });
  });

  it("dado o médico dono da consulta, retorna 200 com os dados", async () => {
    currentMockUser = { ...medicoUser };
    makeGetByIdChain([fakeConsulta]);

    const res = await request(app)
      .get("/api/consultas/1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, pacienteId: 10, medicoId: 20 });
  });
});

describe("GET /api/consultas/pacientes", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockSelectDistinct.mockReset();
    currentMockUser = { ...pacienteUser };
  });

  it("dado um usuário com tipo paciente, retorna 403", async () => {
    currentMockUser = { ...pacienteUser };

    const res = await request(app)
      .get("/api/consultas/pacientes")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
    expect(mockSelectDistinct).not.toHaveBeenCalled();
  });

  it("dado um médico autenticado, retorna a lista de pacientes distintos", async () => {
    currentMockUser = { ...medicoUser };

    const fakePacientes = [
      { id: 10, nome: "João" },
      { id: 11, nome: "Maria" },
    ];

    const { whereFn } = makeGetPacientesChain(fakePacientes);

    const res = await request(app)
      .get("/api/consultas/pacientes")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakePacientes);
    expect(whereFn).toHaveBeenCalledTimes(1);
  });
});
