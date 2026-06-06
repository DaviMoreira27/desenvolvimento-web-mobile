import { z } from "zod";

export const createDisponibilidadeSchema = z.object({
  diaSemana: z.enum([
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ]),
  horarioInicio: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
});

export const slotsLivresQuerySchema = z.object({
  medicoId: z.coerce.number().int().positive(),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
});

export type CreateDisponibilidadeBody = z.infer<typeof createDisponibilidadeSchema>;
export type SlotsLivresQuery = z.infer<typeof slotsLivresQuerySchema>;
