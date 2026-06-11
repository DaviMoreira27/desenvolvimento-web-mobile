import { z } from "zod";

export const googleAuthQuerySchema = z.object({
  token: z.string().min(1, "Token é obrigatório."),
});

export const googleCallbackQuerySchema = z.object({
  code: z.string().min(1, "Código é obrigatório."),
  state: z.string().min(1, "State é obrigatório."),
});

export type GoogleAuthQuery = z.infer<typeof googleAuthQuerySchema>;
export type GoogleCallbackQuery = z.infer<typeof googleCallbackQuerySchema>;
