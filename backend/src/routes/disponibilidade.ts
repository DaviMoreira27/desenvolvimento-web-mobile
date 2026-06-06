import { Router } from "express";
import type { Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { disponibilidadeMedicos, consultas } from "../db/schema";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import type { AuthRequest } from "../middlewares/auth";
import {
  createDisponibilidadeSchema,
  slotsLivresQuerySchema,
} from "../schemas/disponibilidade.schema";

const router = Router();

router.use(authenticate);

const daysOfWeek = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
] as const;

router.get("/slots-livres", async (req: AuthRequest, res: Response) => {
  const queryResult = slotsLivresQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ errors: queryResult.error.flatten().fieldErrors });
    return;
  }

  const { medicoId, data } = queryResult.data;

  const dayIndex = new Date(data + "T00:00:00.000Z").getUTCDay();
  const diaSemana = daysOfWeek[dayIndex]!;

  const configuredSlots = await db
    .select()
    .from(disponibilidadeMedicos)
    .where(
      and(
        eq(disponibilidadeMedicos.medicoId, medicoId),
        eq(disponibilidadeMedicos.diaSemana, diaSemana)
      )
    );

  if (configuredSlots.length === 0) {
    res.json([]);
    return;
  }

  const bookedConsultas = await db
    .select({ dataHora: consultas.dataHora })
    .from(consultas)
    .where(
      and(
        eq(consultas.medicoId, medicoId),
        eq(consultas.status, "agendada")
      )
    );

  const bookedTimes = new Set(
    bookedConsultas
      .filter((c) => {
        const d = new Date(c.dataHora);
        const dateStr =
          d.getUTCFullYear() +
          "-" +
          String(d.getUTCMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getUTCDate()).padStart(2, "0");
        return dateStr === data;
      })
      .map((c) => {
        const d = new Date(c.dataHora);
        return (
          String(d.getUTCHours()).padStart(2, "0") +
          ":" +
          String(d.getUTCMinutes()).padStart(2, "0")
        );
      })
  );

  const freeSlots = configuredSlots
    .filter((slot) => !bookedTimes.has(slot.horarioInicio))
    .map((slot) => ({ horarioInicio: slot.horarioInicio }));

  res.json(freeSlots);
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const slots = await db
    .select()
    .from(disponibilidadeMedicos)
    .where(eq(disponibilidadeMedicos.medicoId, req.user!.id));

  res.json(slots);
});

router.post(
  "/",
  validate(createDisponibilidadeSchema),
  async (req: AuthRequest, res: Response) => {
    if (req.user!.tipo !== "medico") {
      res
        .status(403)
        .json({ message: "Apenas médicos podem gerenciar disponibilidade." });
      return;
    }

    const { diaSemana, horarioInicio } = req.body;

    try {
      const [slot] = await db
        .insert(disponibilidadeMedicos)
        .values({
          medicoId: req.user!.id,
          diaSemana,
          horarioInicio,
        })
        .returning();

      res.status(201).json(slot);
    } catch (err) {
      const pgError = err as { code?: string };
      if (pgError.code === "23505") {
        res
          .status(409)
          .json({ message: "Horário já cadastrado para este dia." });
        return;
      }
      console.error(err);
      res
        .status(500)
        .json({ message: "Erro interno. Tente novamente mais tarde." });
    }
  }
);

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (req.user!.tipo !== "medico") {
    res
      .status(403)
      .json({ message: "Apenas médicos podem gerenciar disponibilidade." });
    return;
  }

  const id = Number(req.params.id);

  const [slot] = await db
    .select()
    .from(disponibilidadeMedicos)
    .where(eq(disponibilidadeMedicos.id, id))
    .limit(1);

  if (!slot) {
    res
      .status(404)
      .json({ message: "Slot de disponibilidade não encontrado." });
    return;
  }

  if (slot.medicoId !== req.user!.id) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  await db
    .delete(disponibilidadeMedicos)
    .where(eq(disponibilidadeMedicos.id, id));

  res.status(204).send();
});

export default router;
