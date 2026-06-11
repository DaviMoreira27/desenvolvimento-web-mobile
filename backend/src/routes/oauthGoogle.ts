import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { usuarios } from "../db/schema";
import type { AuthPayload } from "../middlewares/auth";
import {
  googleAuthQuerySchema,
  googleCallbackQuerySchema,
} from "../schemas/oauth.schema";
import { getGoogleAuthUrl, getRefreshTokenFromCode } from "../services/googleMeet";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "secret";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:8081";

interface GoogleStatePayload {
  medicoId: number;
}

router.get("/auth", (req: Request, res: Response) => {
  const queryResult = googleAuthQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    res.status(400).json({ errors: queryResult.error.flatten().fieldErrors });
    return;
  }

  let payload: AuthPayload;
  try {
    payload = jwt.verify(queryResult.data.token, JWT_SECRET) as AuthPayload;
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado." });
    return;
  }

  if (payload.tipo !== "medico") {
    res.status(403).json({ message: "Apenas médicos podem conectar o Google." });
    return;
  }

  const state = jwt.sign({ medicoId: payload.id } satisfies GoogleStatePayload, JWT_SECRET, {
    expiresIn: "10m",
  });

  res.redirect(getGoogleAuthUrl(state));
});

router.get("/callback", async (req: Request, res: Response) => {
  const queryResult = googleCallbackQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    res.redirect(`${FRONTEND_URL}/perfil?google=error`);
    return;
  }

  const { code, state } = queryResult.data;

  let statePayload: GoogleStatePayload;
  try {
    statePayload = jwt.verify(state, JWT_SECRET) as GoogleStatePayload;
  } catch {
    res.redirect(`${FRONTEND_URL}/perfil?google=error`);
    return;
  }

  try {
    const refreshToken = await getRefreshTokenFromCode(code);

    await db
      .update(usuarios)
      .set({ googleRefreshToken: refreshToken })
      .where(eq(usuarios.id, statePayload.medicoId));

    res.redirect(`${FRONTEND_URL}/perfil?google=success`);
  } catch (err) {
    console.error(err);
    res.redirect(`${FRONTEND_URL}/perfil?google=error`);
  }
});

export default router;
