import { Router } from "express";
import type { Response } from "express";
import { alias } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import multer from "multer";
import { db } from "../db";
import { consultas, documentosConsulta, usuarios } from "../db/schema";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import type { AuthRequest } from "../middlewares/auth";
import { agendarConsultaSchema } from "../schemas/consulta.schema";
import type { AgendarConsultaBody } from "../schemas/consulta.schema";
import { consultaIdParamSchema } from "../schemas/documento.schema";
import { azureStorage } from "../services/azureStorage";

const multerUpload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authenticate);

const medicoAlias = alias(usuarios, "medico");

router.get("/", async (req: AuthRequest, res: Response) => {
  const { id, tipo } = req.user!;

  const filtro =
    tipo === "paciente"
      ? eq(consultas.pacienteId, id)
      : eq(consultas.medicoId, id);

  const lista = await db
    .select({
      id: consultas.id,
      dataHora: consultas.dataHora,
      tipo: consultas.tipo,
      status: consultas.status,
      statusPagamento: consultas.statusPagamento,
      linkMeet: consultas.linkMeet,
      paciente: {
        id: usuarios.id,
        nome: usuarios.nome,
      },
      medico: {
        id: medicoAlias.id,
        nome: medicoAlias.nome,
      },
    })
    .from(consultas)
    .leftJoin(usuarios, eq(usuarios.id, consultas.pacienteId))
    .leftJoin(medicoAlias, eq(medicoAlias.id, consultas.medicoId))
    .where(filtro);

  res.json(lista);
});

router.post(
  "/",
  validate(agendarConsultaSchema),
  async (req: AuthRequest, res: Response) => {
    const { medicoId, dataHora, tipo } = req.body as AgendarConsultaBody;

    if (req.user!.tipo !== "paciente") {
      res.status(403).json({ message: "Apenas pacientes podem agendar consultas." });
      return;
    }

    const [medico] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.id, medicoId));

    if (!medico) {
      res.status(404).json({ message: "Médico não encontrado." });
      return;
    }

    const [consulta] = await db
      .insert(consultas)
      .values({
        pacienteId: req.user!.id,
        medicoId,
        dataHora: new Date(dataHora),
        tipo,
      })
      .returning();

    res.status(201).json(consulta);
  }
);

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  const [consulta] = await db
    .select()
    .from(consultas)
    .where(eq(consultas.id, id));

  if (!consulta) {
    res.status(404).json({ message: "Consulta não encontrada." });
    return;
  }

  const pertenceAoUsuario =
    consulta.pacienteId === req.user!.id || consulta.medicoId === req.user!.id;

  if (!pertenceAoUsuario) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  res.json(consulta);
});

router.get("/:id/documentos", async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  const [consulta] = await db
    .select({ pacienteId: consultas.pacienteId, medicoId: consultas.medicoId })
    .from(consultas)
    .where(eq(consultas.id, id));

  if (!consulta) {
    res.status(404).json({ message: "Consulta não encontrada." });
    return;
  }

  const pertenceAoUsuario =
    consulta.pacienteId === req.user!.id || consulta.medicoId === req.user!.id;

  if (!pertenceAoUsuario) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  const documentos = await db
    .select()
    .from(documentosConsulta)
    .where(eq(documentosConsulta.consultaId, id));

  const documentosComUrl = await Promise.all(
    documentos.map(async (doc) => {
      const url = await azureStorage.generateSasUrl(doc.blobName, 3600);
      return {
        id: doc.id,
        consultaId: doc.consultaId,
        nomeArquivo: doc.nomeArquivo,
        tipoMime: doc.tipoMime,
        criadoEm: doc.criadoEm,
        url,
      };
    })
  );

  res.json(documentosComUrl);
});

router.post(
  "/:id/documentos",
  multerUpload.single("file"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ errors: { file: ["File is required."] } });
      return;
    }

    const paramResult = consultaIdParamSchema.safeParse({ id: req.params.id });
    if (!paramResult.success) {
      res.status(400).json({ errors: { id: ["Invalid consultation ID."] } });
      return;
    }

    const consultaId = paramResult.data.id;

    const [consulta] = await db
      .select({ pacienteId: consultas.pacienteId, medicoId: consultas.medicoId })
      .from(consultas)
      .where(eq(consultas.id, consultaId));

    if (!consulta) {
      res.status(404).json({ message: "Consulta não encontrada." });
      return;
    }

    const pertenceAoUsuario =
      consulta.pacienteId === req.user!.id || consulta.medicoId === req.user!.id;

    if (!pertenceAoUsuario) {
      res.status(403).json({ message: "Acesso negado." });
      return;
    }

    const blobName = `consultas/${consultaId}/${Date.now()}-${req.file.originalname}`;
    const contentType = req.file.mimetype || "application/octet-stream";

    try {
      await azureStorage.uploadBlob(req.file.buffer, blobName, contentType);
    } catch {
      res.status(502).json({ message: "Document storage unavailable. Please try again." });
      return;
    }

    const [doc] = await db
      .insert(documentosConsulta)
      .values({
        consultaId,
        nomeArquivo: req.file.originalname,
        blobName,
        tipoMime: req.file.mimetype || null,
        uploaderId: req.user!.id,
      })
      .returning();

    const url = await azureStorage.generateSasUrl(doc!.blobName, 3600);

    res.status(201).json({
      id: doc!.id,
      consultaId: doc!.consultaId,
      nomeArquivo: doc!.nomeArquivo,
      tipoMime: doc!.tipoMime,
      criadoEm: doc!.criadoEm,
      url,
    });
  }
);

router.get("/:id/link", async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  const [consulta] = await db
    .select({
      pacienteId: consultas.pacienteId,
      medicoId: consultas.medicoId,
      linkMeet: consultas.linkMeet,
      status: consultas.status,
    })
    .from(consultas)
    .where(eq(consultas.id, id));

  if (!consulta) {
    res.status(404).json({ message: "Consulta não encontrada." });
    return;
  }

  const pertenceAoUsuario =
    consulta.pacienteId === req.user!.id || consulta.medicoId === req.user!.id;

  if (!pertenceAoUsuario) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  if (!consulta.linkMeet) {
    res.status(404).json({ message: "Link da reunião ainda não disponível." });
    return;
  }

  res.json({ linkMeet: consulta.linkMeet });
});

export default router;
