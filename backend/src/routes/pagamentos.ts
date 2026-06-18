import { Router } from "express";
import type { Response } from "express";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import { pagamentos, consultas, usuarios } from "../db/schema";
import { authenticate } from "../middlewares/auth";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

const pacienteAlias = alias(usuarios, "paciente");

router.get("/", async (req: AuthRequest, res: Response) => {
  const { id, tipo } = req.user!;

  const filtro =
    tipo === "paciente"
      ? eq(pagamentos.pacienteId, id)
      : eq(consultas.medicoId, id);

  const lista = await db
    .select({
      id: pagamentos.id,
      valor: pagamentos.valor,
      status: pagamentos.status,
      descricao: pagamentos.descricao,
      criadoEm: pagamentos.criadoEm,
      consulta: {
        id: consultas.id,
        dataHora: consultas.dataHora,
        tipo: consultas.tipo,
      },
      paciente: {
        id: pacienteAlias.id,
        nome: pacienteAlias.nome,
      },
    })
    .from(pagamentos)
    .leftJoin(consultas, eq(consultas.id, pagamentos.consultaId))
    .leftJoin(pacienteAlias, eq(pacienteAlias.id, pagamentos.pacienteId))
    .where(filtro);

  res.json(lista);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  const [pagamento] = await db
    .select()
    .from(pagamentos)
    .where(eq(pagamentos.id, id));

  if (!pagamento) {
    res.status(404).json({ message: "Pagamento não encontrado." });
    return;
  }

  const [consulta] = await db
    .select({ medicoId: consultas.medicoId })
    .from(consultas)
    .where(eq(consultas.id, pagamento.consultaId));

  const pertenceAoUsuario =
    pagamento.pacienteId === req.user!.id || consulta?.medicoId === req.user!.id;

  if (!pertenceAoUsuario) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  res.json(pagamento);
});

router.patch("/:id/confirmar", async (req: AuthRequest, res: Response) => {
  if (req.user!.tipo !== "medico") {
    res.status(403).json({ message: "Apenas médicos podem confirmar pagamentos." });
    return;
  }

  const id = Number(req.params.id);

  const [pagamento] = await db
    .select()
    .from(pagamentos)
    .where(eq(pagamentos.id, id));

  if (!pagamento) {
    res.status(404).json({ message: "Pagamento não encontrado." });
    return;
  }

  const [consulta] = await db
    .select({ medicoId: consultas.medicoId })
    .from(consultas)
    .where(eq(consultas.id, pagamento.consultaId));

  if (consulta?.medicoId !== req.user!.id) {
    res.status(403).json({ message: "Acesso negado." });
    return;
  }

  if (pagamento.status !== "pendente") {
    res.status(422).json({ message: "Apenas pagamentos pendentes podem ser confirmados." });
    return;
  }

  const [atualizado] = await db
    .update(pagamentos)
    .set({ status: "aprovado" })
    .where(eq(pagamentos.id, id))
    .returning();

  await db
    .update(consultas)
    .set({ statusPagamento: "aprovado" })
    .where(eq(consultas.id, pagamento.consultaId));

  res.json(atualizado);
});

export default router;
