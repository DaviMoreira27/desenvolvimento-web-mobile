import type { Request, Response, NextFunction } from "express";

// Mock authenticate middleware before importing route
const mockUser = { id: 1, email: "doctor@test.com", tipo: "medico" as const };

jest.mock("../../src/middlewares/auth", () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = mockUser;
    next();
  },
}));

// Mock azureStorage
const mockUploadBlob = jest.fn().mockResolvedValue(undefined);
const mockGenerateSasUrl = jest.fn().mockResolvedValue("https://storage.blob.core.windows.net/container/blob?sas=token");

jest.mock("../../src/services/azureStorage", () => ({
  azureStorage: {
    uploadBlob: mockUploadBlob,
    generateSasUrl: mockGenerateSasUrl,
  },
}));

// Mock drizzle db
const mockSelect = jest.fn();
const mockInsert = jest.fn();

jest.mock("../../src/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

import express from "express";
import request from "supertest";
import consultasRouter from "../../src/routes/consultas";

// Install supertest
// We need to set up the test app
const app = express();
app.use(express.json());
app.use("/api/consultas", consultasRouter);

describe("GET /api/consultas/:id/documentos", () => {
  beforeEach(() => {
    mockUploadBlob.mockClear();
    mockGenerateSasUrl.mockClear();
    mockSelect.mockClear();
    mockInsert.mockClear();
  });

  it("returns 200 with an array where each item has a url field", async () => {
    const fakeDoc = {
      id: 5,
      consultaId: 1,
      nomeArquivo: "laudo.pdf",
      tipoMime: "application/pdf",
      blobName: "consultas/1/123-laudo.pdf",
      uploaderId: 1,
      criadoEm: new Date().toISOString(),
    };

    mockSelect
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ pacienteId: 2, medicoId: 1 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeDoc]),
        }),
      });

    const res = await request(app)
      .get("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].url).toBeDefined();
    expect(res.body[0].url).toMatch(/^https:\/\//);
    expect(mockGenerateSasUrl).toHaveBeenCalledWith("consultas/1/123-laudo.pdf", 3600);
  });

  it("returns 404 when consultation does not exist", async () => {
    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    const res = await request(app)
      .get("/api/consultas/999/documentos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
  });

  it("returns an empty array when no documents are attached", async () => {
    mockSelect
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ pacienteId: 2, medicoId: 1 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

    const res = await request(app)
      .get("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockGenerateSasUrl).not.toHaveBeenCalled();
  });
});

describe("POST /api/consultas/:id/documentos", () => {
  beforeEach(() => {
    mockUploadBlob.mockClear();
    mockGenerateSasUrl.mockClear();
    mockSelect.mockClear();
    mockInsert.mockClear();
  });

  it("returns 400 when no file is provided", async () => {
    const res = await request(app)
      .post("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(400);
    expect(res.body.errors?.file).toBeDefined();
  });

  it("returns 404 when consultation does not exist", async () => {
    // Mock db.select to return empty (no consultation found)
    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    const res = await request(app)
      .post("/api/consultas/999/documentos")
      .set("Authorization", "Bearer valid-token")
      .attach("file", Buffer.from("pdf content"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/não encontrada/i);
  });

  it("returns 502 when Azure upload fails without DB insert", async () => {
    // Mock db.select to return a valid consultation
    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: 1,
          pacienteId: 2,
          medicoId: 1,
        }]),
      }),
    });

    mockUploadBlob.mockRejectedValueOnce(new Error("Azure network error"));

    const res = await request(app)
      .post("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token")
      .attach("file", Buffer.from("pdf content"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(502);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 201 with DocumentoResponse on successful upload", async () => {
    const fakeDoc = {
      id: 10,
      consultaId: 1,
      nomeArquivo: "test.pdf",
      tipoMime: "application/pdf",
      criadoEm: new Date().toISOString(),
      blobName: "consultas/1/123-test.pdf",
    };

    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: 1,
          pacienteId: 2,
          medicoId: 1,
        }]),
      }),
    });

    const mockReturning = jest.fn().mockResolvedValue([fakeDoc]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    const res = await request(app)
      .post("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token")
      .attach("file", Buffer.from("pdf content"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(10);
    expect(res.body.url).toBeDefined();
    expect(mockUploadBlob).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });
});
