/**
 * Integration-style tests for the document upload and listing endpoints.
 * Uses mocked Azure SDK and mocked Drizzle DB, verifying DB row structure and response shape.
 */

import type { Request, Response, NextFunction } from "express";

const mockUser = { id: 1, email: "doctor@test.com", tipo: "medico" as const };

jest.mock("../../src/middlewares/auth", () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = mockUser;
    next();
  },
}));

const mockUploadBlob = jest.fn().mockResolvedValue(undefined);
const mockGenerateSasUrl = jest.fn().mockResolvedValue("https://storage.blob.core.windows.net/container/blob?sas=token123");

jest.mock("../../src/services/azureStorage", () => ({
  azureStorage: {
    uploadBlob: mockUploadBlob,
    generateSasUrl: mockGenerateSasUrl,
  },
}));

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

const app = express();
app.use(express.json());
app.use("/api/consultas", consultasRouter);

describe("Integration: POST /api/consultas/:id/documentos", () => {
  beforeEach(() => {
    mockUploadBlob.mockClear();
    mockGenerateSasUrl.mockClear();
    mockSelect.mockClear();
    mockInsert.mockClear();
  });

  it("inserts a DB row with blobName, uploaderId, and no url field on successful upload", async () => {
    const insertedRow = {
      id: 10,
      consultaId: 1,
      nomeArquivo: "laudo.pdf",
      blobName: expect.stringContaining("consultas/1/"),
      tipoMime: "application/pdf",
      uploaderId: 1,
      criadoEm: new Date(),
    };

    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 1, pacienteId: 2, medicoId: 1 }]),
      }),
    });

    const mockReturning = jest.fn().mockResolvedValue([{
      id: 10,
      consultaId: 1,
      nomeArquivo: "laudo.pdf",
      blobName: "consultas/1/1234567890-laudo.pdf",
      tipoMime: "application/pdf",
      uploaderId: 1,
      criadoEm: new Date(),
    }]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    const res = await request(app)
      .post("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token")
      .attach("file", Buffer.from("pdf content"), {
        filename: "laudo.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);

    // Verify the DB insert was called with the correct shape
    expect(mockInsert).toHaveBeenCalled();
    const insertCallArgs = mockValues.mock.calls[0][0];

    expect(insertCallArgs).toMatchObject({
      consultaId: 1,
      nomeArquivo: "laudo.pdf",
      tipoMime: "application/pdf",
      uploaderId: 1,
    });
    expect(insertCallArgs.blobName).toMatch(/^consultas\/1\//);
    // The DB row must NOT contain a url field
    expect(insertCallArgs.url).toBeUndefined();

    // The response body must include a url field (SAS URL generated server-side)
    expect(res.body.url).toBeDefined();
    expect(res.body.url).toMatch(/^https:\/\//);
    // The response body must NOT expose the blobName in a raw form as "url" from DB
    expect(res.body.id).toBe(10);
    expect(res.body.consultaId).toBe(1);
  });

  it("does not insert a DB row when Azure upload fails", async () => {
    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 1, pacienteId: 2, medicoId: 1 }]),
      }),
    });

    mockUploadBlob.mockRejectedValueOnce(new Error("Azure quota exceeded"));

    const res = await request(app)
      .post("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token")
      .attach("file", Buffer.from("pdf content"), {
        filename: "report.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(502);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("Integration: GET /api/consultas/:id/documentos", () => {
  beforeEach(() => {
    mockUploadBlob.mockClear();
    mockGenerateSasUrl.mockClear();
    mockSelect.mockClear();
    mockInsert.mockClear();
  });

  it("returns each row with a freshly generated url field from blobName", async () => {
    const dbRows = [
      {
        id: 1,
        consultaId: 1,
        nomeArquivo: "laudo.pdf",
        blobName: "consultas/1/1234567890-laudo.pdf",
        tipoMime: "application/pdf",
        uploaderId: 1,
        criadoEm: new Date(),
      },
      {
        id: 2,
        consultaId: 1,
        nomeArquivo: "exame.jpg",
        blobName: "consultas/1/9876543210-exame.jpg",
        tipoMime: "image/jpeg",
        uploaderId: 2,
        criadoEm: new Date(),
      },
    ];

    mockSelect
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ pacienteId: 2, medicoId: 1 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(dbRows),
        }),
      });

    const res = await request(app)
      .get("/api/consultas/1/documentos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);

    // Each row must have a url field
    for (const doc of res.body) {
      expect(doc.url).toBeDefined();
      expect(doc.url).toMatch(/^https:\/\//);
      // The raw blobName should not be exposed as the url
      expect(doc.url).not.toBe(doc.blobName);
    }

    // generateSasUrl should have been called once per document
    expect(mockGenerateSasUrl).toHaveBeenCalledTimes(2);
    expect(mockGenerateSasUrl).toHaveBeenCalledWith("consultas/1/1234567890-laudo.pdf", 3600);
    expect(mockGenerateSasUrl).toHaveBeenCalledWith("consultas/1/9876543210-exame.jpg", 3600);
  });

  it("returns an empty array when no documents are stored", async () => {
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
