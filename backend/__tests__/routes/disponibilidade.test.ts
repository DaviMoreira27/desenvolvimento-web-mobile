import type { Request, Response, NextFunction } from "express";

type MockUser = { id: number; email: string; tipo: "paciente" | "medico" };
const mockUser: MockUser = { id: 1, email: "doctor@test.com", tipo: "medico" };
let currentMockUser: MockUser = { ...mockUser };

jest.mock("../../src/middlewares/auth", () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = currentMockUser;
    next();
  },
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();

jest.mock("../../src/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  },
}));

import express from "express";
import request from "supertest";
import disponibilidadeRouter from "../../src/routes/disponibilidade";

const app = express();
app.use(express.json());
app.use("/api/disponibilidade", disponibilidadeRouter);

function makeSelectChain(result: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(result),
      }),
    }),
  };
}

function makeSelectChainNoLimit(result: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(result),
    }),
  };
}

describe("GET /api/disponibilidade", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    currentMockUser = { ...mockUser };
  });

  it("returns 200 with the doctor's slots", async () => {
    const fakeSlot = {
      id: 1,
      medicoId: 1,
      diaSemana: "segunda",
      horarioInicio: "08:00",
      criadoEm: new Date().toISOString(),
    };
    mockSelect.mockReturnValueOnce(makeSelectChainNoLimit([fakeSlot]));

    const res = await request(app)
      .get("/api/disponibilidade")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].horarioInicio).toBe("08:00");
  });
});

describe("POST /api/disponibilidade", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockInsert.mockReset();
    currentMockUser = { ...mockUser };
  });

  it("returns 201 with the created slot for a medico", async () => {
    const newSlot = {
      id: 2,
      medicoId: 1,
      diaSemana: "terca",
      horarioInicio: "10:00",
      criadoEm: new Date().toISOString(),
    };
    const mockReturning = jest.fn().mockResolvedValue([newSlot]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    const res = await request(app)
      .post("/api/disponibilidade")
      .set("Authorization", "Bearer valid-token")
      .send({ diaSemana: "terca", horarioInicio: "10:00" });

    expect(res.status).toBe(201);
    expect(res.body.diaSemana).toBe("terca");
    expect(res.body.horarioInicio).toBe("10:00");
  });

  it("returns 400 when body is invalid", async () => {
    const res = await request(app)
      .post("/api/disponibilidade")
      .set("Authorization", "Bearer valid-token")
      .send({ diaSemana: "monday", horarioInicio: "8:00" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("returns 403 when user is a paciente", async () => {
    currentMockUser = { id: 5, email: "patient@test.com", tipo: "paciente" };

    const res = await request(app)
      .post("/api/disponibilidade")
      .set("Authorization", "Bearer valid-token")
      .send({ diaSemana: "segunda", horarioInicio: "08:00" });

    expect(res.status).toBe(403);
  });

  it("returns 409 on duplicate day+time for same doctor", async () => {
    const dbError = new Error("duplicate key value violates unique constraint");
    (dbError as any).code = "23505";

    const mockReturning = jest.fn().mockRejectedValue(dbError);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    const res = await request(app)
      .post("/api/disponibilidade")
      .set("Authorization", "Bearer valid-token")
      .send({ diaSemana: "segunda", horarioInicio: "08:00" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBeDefined();
  });
});

describe("DELETE /api/disponibilidade/:id", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockDelete.mockReset();
    currentMockUser = { ...mockUser };
  });

  it("returns 204 on successful delete by owning doctor", async () => {
    const existingSlot = {
      id: 3,
      medicoId: 1,
      diaSemana: "quarta",
      horarioInicio: "14:00",
      criadoEm: new Date().toISOString(),
    };
    mockSelect.mockReturnValueOnce(makeSelectChain([existingSlot]));

    const mockWhere = jest.fn().mockResolvedValue(undefined);
    mockDelete.mockReturnValue({
      where: mockWhere,
    });

    const res = await request(app)
      .delete("/api/disponibilidade/3")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(204);
  });

  it("returns 404 when slot does not exist", async () => {
    mockSelect.mockReturnValueOnce(makeSelectChain([]));

    const res = await request(app)
      .delete("/api/disponibilidade/999")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
  });

  it("returns 403 when paciente tries to delete", async () => {
    currentMockUser = { id: 5, email: "patient@test.com", tipo: "paciente" };

    const res = await request(app)
      .delete("/api/disponibilidade/3")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
  });

  it("returns 403 when doctor tries to delete another doctor's slot", async () => {
    const otherDoctorSlot = {
      id: 5,
      medicoId: 99,
      diaSemana: "sexta",
      horarioInicio: "16:00",
      criadoEm: new Date().toISOString(),
    };
    mockSelect.mockReturnValueOnce(makeSelectChain([otherDoctorSlot]));

    const res = await request(app)
      .delete("/api/disponibilidade/5")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
  });
});

describe("GET /api/disponibilidade/slots-livres", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    currentMockUser = { ...mockUser };
  });

  it("returns 400 when data param is missing", async () => {
    const res = await request(app)
      .get("/api/disponibilidade/slots-livres?medicoId=1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(400);
  });

  it("returns 400 when medicoId is not a number", async () => {
    const res = await request(app)
      .get("/api/disponibilidade/slots-livres?medicoId=abc&data=2026-06-09")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(400);
  });

  it("returns 200 with only unbooked slots", async () => {
    const configuredSlots = [
      { id: 1, medicoId: 1, diaSemana: "terca", horarioInicio: "08:00", criadoEm: new Date().toISOString() },
      { id: 2, medicoId: 1, diaSemana: "terca", horarioInicio: "10:00", criadoEm: new Date().toISOString() },
    ];
    const bookedConsultas = [{ dataHora: new Date("2026-06-09T08:00:00.000Z") }];

    mockSelect
      .mockReturnValueOnce(makeSelectChainNoLimit(configuredSlots))
      .mockReturnValueOnce(makeSelectChainNoLimit(bookedConsultas));

    const res = await request(app)
      .get("/api/disponibilidade/slots-livres?medicoId=1&data=2026-06-09")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].horarioInicio).toBe("10:00");
  });

  it("returns 200 with empty array when all slots are booked", async () => {
    const configuredSlots = [
      { id: 1, medicoId: 1, diaSemana: "terca", horarioInicio: "08:00", criadoEm: new Date().toISOString() },
    ];
    const bookedConsultas = [{ dataHora: new Date("2026-06-09T08:00:00.000Z") }];

    mockSelect
      .mockReturnValueOnce(makeSelectChainNoLimit(configuredSlots))
      .mockReturnValueOnce(makeSelectChainNoLimit(bookedConsultas));

    const res = await request(app)
      .get("/api/disponibilidade/slots-livres?medicoId=1&data=2026-06-09")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 200 with empty array when doctor has no configured slots", async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChainNoLimit([]))
      .mockReturnValueOnce(makeSelectChainNoLimit([]));

    const res = await request(app)
      .get("/api/disponibilidade/slots-livres?medicoId=99&data=2026-06-09")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/disponibilidade/datas-disponiveis", () => {
  const BASE = "/api/disponibilidade/datas-disponiveis";

  // 2026-06-23 = terca, 2026-06-24 = quarta, 2026-06-25 = quinta, 2026-06-30 = terca
  const slotTerca = { id: 1, medicoId: 5, diaSemana: "terca", horarioInicio: "08:00", criadoEm: new Date().toISOString() };

  beforeEach(() => {
    mockSelect.mockReset();
    currentMockUser = { ...mockUser };
  });

  it("dado ausência de medicoId, retorna 400", async () => {
    const res = await request(app)
      .get(`${BASE}?inicio=2026-06-23&fim=2026-06-25`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(400);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("dado ausência de inicio, retorna 400", async () => {
    const res = await request(app)
      .get(`${BASE}?medicoId=5&fim=2026-06-25`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(400);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("dado ausência de fim, retorna 400", async () => {
    const res = await request(app)
      .get(`${BASE}?medicoId=5&inicio=2026-06-23`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(400);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("dado um médico sem slots configurados, retorna array vazio sem consultar consultas", async () => {
    mockSelect.mockReturnValueOnce(makeSelectChainNoLimit([]));

    const res = await request(app)
      .get(`${BASE}?medicoId=5&inicio=2026-06-23&fim=2026-06-25`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it("dado slots configurados, retorna datas com ao menos um slot livre no intervalo", async () => {
    // terca tem 08:00 e 10:00; 08:00 está reservado em 2026-06-23, mas 10:00 está livre
    const slots = [
      slotTerca,
      { id: 2, medicoId: 5, diaSemana: "terca", horarioInicio: "10:00", criadoEm: new Date().toISOString() },
    ];
    const booked = [{ dataHora: new Date("2026-06-23T08:00:00.000Z") }];

    mockSelect
      .mockReturnValueOnce(makeSelectChainNoLimit(slots))
      .mockReturnValueOnce(makeSelectChainNoLimit(booked));

    const res = await request(app)
      .get(`${BASE}?medicoId=5&inicio=2026-06-23&fim=2026-06-25`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toContain("2026-06-23");
    // quarta e quinta não têm slots configurados
    expect(res.body).toHaveLength(1);
  });

  it("dado todas as datas do intervalo completamente reservadas, retorna array vazio", async () => {
    // terca tem apenas 08:00, que está reservado em 2026-06-23
    const booked = [{ dataHora: new Date("2026-06-23T08:00:00.000Z") }];

    mockSelect
      .mockReturnValueOnce(makeSelectChainNoLimit([slotTerca]))
      .mockReturnValueOnce(makeSelectChainNoLimit(booked));

    const res = await request(app)
      .get(`${BASE}?medicoId=5&inicio=2026-06-23&fim=2026-06-25`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("datas fora do intervalo solicitado não aparecem no resultado", async () => {
    // 2026-06-23 (terca) está dentro do intervalo; 2026-06-30 (terca) está fora (fim=2026-06-26)
    mockSelect
      .mockReturnValueOnce(makeSelectChainNoLimit([slotTerca]))
      .mockReturnValueOnce(makeSelectChainNoLimit([]));

    const res = await request(app)
      .get(`${BASE}?medicoId=5&inicio=2026-06-23&fim=2026-06-26`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["2026-06-23"]);
    expect(res.body).not.toContain("2026-06-30");
  });
});
