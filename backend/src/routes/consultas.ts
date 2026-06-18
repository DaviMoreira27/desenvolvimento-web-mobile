import { Router } from "express";
import type { Response } from "express";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, sql, ne } from "drizzle-orm";
import multer from "multer";
import { db } from "../db";
import { consultas, disponibilidadeMedicos, documentosConsulta, pagamentos, usuarios } from "../db/schema";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import type { AuthRequest } from "../middlewares/auth";
import { agendarConsultaSchema } from "../schemas/consulta.schema";
import type { AgendarConsultaBody } from "../schemas/consulta.schema";
import { consultaIdParamSchema } from "../schemas/documento.schema";
import { azureStorage } from "../services/azureStorage";
import { createMeetEvent } from "../services/googleMeet";

const multerUpload = multer({ storage: multer.memoryStorage() });

const CONSULTA_DURATION_MINUTES = 30;

const VALOR_CONSULTA: Record<AgendarConsultaBody["tipo"], string> = {
  presencial: "150.00",
  teleconsulta: "100.00",
};

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

router.get("/pacientes", async (req: AuthRequest, res: Response) => {
  if (req.user!.tipo !== "medico") {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  const rows = await db
    .selectDistinct({
      id: usuarios.id,
      nome: usuarios.nome,
    })
    .from(consultas)
    .leftJoin(usuarios, eq(usuarios.id, consultas.pacienteId))
    .where(eq(consultas.medicoId, req.user!.id));

  res.json(rows);
});

const daysOfWeek = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
] as const;

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
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
        googleRefreshToken: usuarios.googleRefreshToken,
      })
      .from(usuarios)
      .where(eq(usuarios.id, medicoId));

    if (!medico) {
      res.status(404).json({ message: "Médico não encontrado." });
      return;
    }

    const dataHoraDate = new Date(dataHora);
    const dayIndex = dataHoraDate.getUTCDay();
    const diaSemana = daysOfWeek[dayIndex]!;
    const horarioInicio =
      String(dataHoraDate.getUTCHours()).padStart(2, "0") +
      ":" +
      String(dataHoraDate.getUTCMinutes()).padStart(2, "0");

    try {
      const consulta = await db.transaction(
        async (tx) => {
          const [availabilitySlot] = await tx
            .select({ id: disponibilidadeMedicos.id })
            .from(disponibilidadeMedicos)
            .where(
              and(
                eq(disponibilidadeMedicos.medicoId, medicoId),
                eq(disponibilidadeMedicos.diaSemana, diaSemana),
                eq(disponibilidadeMedicos.horarioInicio, horarioInicio)
              )
            );

          if (!availabilitySlot) {
            return { _error: 422, message: "O horário solicitado não faz parte da agenda do médico." };
          }

          const datePart =
            dataHoraDate.getUTCFullYear() +
            "-" +
            String(dataHoraDate.getUTCMonth() + 1).padStart(2, "0") +
            "-" +
            String(dataHoraDate.getUTCDate()).padStart(2, "0");

          const [conflictRow] = await tx
            .select({ id: consultas.id })
            .from(consultas)
            .where(
              and(
                eq(consultas.medicoId, medicoId),
                eq(consultas.status, "agendada"),
                sql`TO_CHAR(${consultas.dataHora} AT TIME ZONE 'UTC', 'YYYY-MM-DD') = ${datePart}`,
                sql`TO_CHAR(${consultas.dataHora} AT TIME ZONE 'UTC', 'HH24:MI') = ${horarioInicio}`
              )
            );

          if (conflictRow) {
            return { _error: 409, message: "Este horário já está ocupado." };
          }

          const [newConsulta] = await tx
            .insert(consultas)
            .values({
              pacienteId: req.user!.id,
              medicoId,
              dataHora: dataHoraDate,
              tipo,
            })
            .returning();

          await tx.insert(pagamentos).values({
            consultaId: newConsulta!.id,
            pacienteId: req.user!.id,
            valor: VALOR_CONSULTA[tipo],
            descricao: `Consulta ${tipo === "teleconsulta" ? "online" : "presencial"} em ${datePart} às ${horarioInicio}`,
          });

          return newConsulta;
        },
        { isolationLevel: "serializable" }
      );

      if (consulta && "_error" in consulta) {
        res.status(consulta._error as number).json({ message: consulta.message });
        return;
      }

      let consultaResponse: typeof consulta = consulta;

      if (consulta && tipo === "teleconsulta" && medico.googleRefreshToken) {
        try {
          const [paciente] = await db
            .select({ nome: usuarios.nome, email: usuarios.email })
            .from(usuarios)
            .where(eq(usuarios.id, req.user!.id));

          const inicio = dataHoraDate;
          const fim = new Date(inicio.getTime() + CONSULTA_DURATION_MINUTES * 60 * 1000);

          const { meetLink, eventId } = await createMeetEvent({
            refreshToken: medico.googleRefreshToken,
            titulo: `Consulta VitalGoal: ${paciente?.nome ?? "Paciente"} e Dr(a). ${medico.nome}`,
            descricao: "Teleconsulta agendada pela plataforma VitalGoal.",
            inicio,
            fim,
            participantes: [medico.email, paciente?.email ?? req.user!.email],
          });

          const [updated] = await db
            .update(consultas)
            .set({ linkMeet: meetLink, googleEventId: eventId })
            .where(eq(consultas.id, consulta.id))
            .returning();

          consultaResponse = updated;
        } catch (err) {
          console.error("Erro ao criar evento no Google Calendar:", err);
        }
      }

      res.status(201).json(consultaResponse);
    } catch (err) {
      const pgError = err as { code?: string };
      if (pgError.code === "40001") {
        res.status(409).json({
          message: "O horário não está mais disponível. Tente novamente.",
        });
        return;
      }
      console.error(err);
      res.status(500).json({ message: "Erro interno. Tente novamente mais tarde." });
    }
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

router.patch("/:id/concluir", async (req: AuthRequest, res: Response) => {
  const { id: userId, tipo } = req.user!;

  if (tipo !== "medico") {
    res.status(403).json({ message: "Apenas médicos podem concluir consultas." });
    return;
  }

  const consultaId = Number(req.params.id);

  const [consulta] = await db
    .select({ id: consultas.id, medicoId: consultas.medicoId, status: consultas.status })
    .from(consultas)
    .where(eq(consultas.id, consultaId));

  if (!consulta) {
    res.status(404).json({ message: "Consulta não encontrada." });
    return;
  }

  if (consulta.medicoId !== userId) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  if (consulta.status !== "agendada") {
    res.status(422).json({ message: "Apenas consultas agendadas podem ser concluídas." });
    return;
  }

  const [updated] = await db
    .update(consultas)
    .set({ status: "concluida" })
    .where(eq(consultas.id, consultaId))
    .returning();

  res.json(updated);
});

router.patch("/:id/cancelar", async (req: AuthRequest, res: Response) => {
  const { id: userId, tipo } = req.user!;

  if (tipo !== "paciente") {
    res.status(403).json({ message: "Apenas pacientes podem cancelar consultas." });
    return;
  }

  const consultaId = Number(req.params.id);

  const [consulta] = await db
    .select({ id: consultas.id, pacienteId: consultas.pacienteId, status: consultas.status })
    .from(consultas)
    .where(eq(consultas.id, consultaId));

  if (!consulta) {
    res.status(404).json({ message: "Consulta não encontrada." });
    return;
  }

  if (consulta.pacienteId !== userId) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  if (consulta.status !== "agendada") {
    res.status(422).json({ message: "Apenas consultas agendadas podem ser canceladas." });
    return;
  }

  const [updated] = await db
    .update(consultas)
    .set({ status: "cancelada", statusPagamento: "cancelado" })
    .where(eq(consultas.id, consultaId))
    .returning();

  await db
    .update(pagamentos)
    .set({ status: "cancelado" })
    .where(
      and(
        eq(pagamentos.consultaId, consultaId),
        eq(pagamentos.status, "pendente")
      )
    );

  res.json(updated);
});

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
