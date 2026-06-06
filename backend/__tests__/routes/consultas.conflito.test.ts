import type { Request, Response, NextFunction } from "express";

const pacienteUser = { id: 10, email: "patient@test.com", tipo: "paciente" as const };
let currentMockUser = { ...pacienteUser };

jest.mock("../../src/middlewares/auth", () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = currentMockUser;
    next();
  },
}));

jest.mock("../../src/services/azureStorage", () => ({
  azureStorage: {
    uploadBlob: jest.fn().mockResolvedValue(undefined),
    generateSasUrl: jest.fn().mockResolvedValue("https://example.com/blob?sas=token"),
  },
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../../src/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    transaction: mockTransaction,
  },
}));

import express from "express";
import request from "supertest";
import consultasRouter from "../../src/routes/consultas";

const app = express();
app.use(express.json());
app.use("/api/consultas", consultasRouter);

describe("POST /api/consultas — conflict guard", () => {
  const validBody = {
    medicoId: 5,
    dataHora: "2026-06-10T08:00:00.000Z",
    tipo: "presencial",
  };

  beforeEach(() => {
    mockSelect.mockReset();
    mockInsert.mockReset();
    mockTransaction.mockReset();
    currentMockUser = { ...pacienteUser };
  });

  it("returns 422 when the requested slot is not in the doctor's schedule", async () => {
    mockSelect.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 5 }]),
      }),
    });

    mockTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
        insert: jest.fn(),
      };
      return fn(tx);
    });

    const res = await request(app)
      .post("/api/consultas")
      .set("Authorization", "Bearer valid-token")
      .send(validBody);

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/agenda/i);
  });

  it("returns 409 when an agendada appointment already exists for the same slot", async () => {
    mockSelect.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 5 }]),
      }),
    });

    mockTransaction.mockImplementation(async (fn: Function) => {
      const txSelect = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 1 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 99 }]),
          }),
        });

      const tx = { select: txSelect, insert: jest.fn() };
      return fn(tx);
    });

    const res = await request(app)
      .post("/api/consultas")
      .set("Authorization", "Bearer valid-token")
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ocupado/i);
  });

  it("returns 201 when availability exists and no conflict", async () => {
    mockSelect.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 5 }]),
      }),
    });

    const newConsulta = {
      id: 100,
      pacienteId: 10,
      medicoId: 5,
      dataHora: new Date("2026-06-10T08:00:00.000Z"),
      tipo: "presencial",
      status: "agendada",
      statusPagamento: "pendente",
      linkMeet: null,
      criadoEm: new Date(),
    };

    mockTransaction.mockImplementation(async (fn: Function) => {
      const txSelect = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 1 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        });

      const mockReturning = jest.fn().mockResolvedValue([newConsulta]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      const txInsert = jest.fn().mockReturnValue({ values: mockValues });

      const tx = { select: txSelect, insert: txInsert };
      return fn(tx);
    });

    const res = await request(app)
      .post("/api/consultas")
      .set("Authorization", "Bearer valid-token")
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(100);
  });

  it("returns 409 on PostgreSQL serialization failure error code 40001", async () => {
    mockSelect.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 5 }]),
      }),
    });

    const serializationError = new Error("could not serialize access due to concurrent update");
    (serializationError as any).code = "40001";

    mockTransaction.mockRejectedValue(serializationError);

    const res = await request(app)
      .post("/api/consultas")
      .set("Authorization", "Bearer valid-token")
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/não está mais disponível/i);
  });

  it("returns 500 on unexpected database error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockSelect.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 5 }]),
      }),
    });

    const unexpectedError = new Error("connection reset");
    mockTransaction.mockRejectedValue(unexpectedError);

    const res = await request(app)
      .post("/api/consultas")
      .set("Authorization", "Bearer valid-token")
      .send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/erro interno/i);
    consoleSpy.mockRestore();
  });

  it("existing GET / route still works without regression", async () => {
    mockSelect.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const res = await request(app)
      .get("/api/consultas")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
