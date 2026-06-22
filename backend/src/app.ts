import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";

import anamnesisRouter from "./routes/anamneses";
import authRouter from "./routes/auth";
import consultasRouter from "./routes/consultas";
import disponibilidadeRouter from "./routes/disponibilidade";
import healthRouter from "./routes/health";
import metasRouter from "./routes/metas";
import oauthGoogleRouter from "./routes/oauthGoogle";
import pagamentosRouter from "./routes/pagamentos";
import protocolosRouter from "./routes/protocolos";
import usersRouter from "./routes/users";

const testing = false;

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: testing
      ? true
      : [
          "https://app.vitalgoal.com",
          process.env.DEV_ORIGIN ?? "http://localhost:8081",
        ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// =================================================================
// SEGURANÇA: Rate Limiting para rotas de autenticação
// =================================================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limita cada IP a 10 requisições por `window` (15 min)
  message: { message: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Aplica o limitador EXCLUSIVAMENTE nas rotas críticas
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// =================================================================
// Registro das Rotas
// =================================================================
app.use("/api", healthRouter);
app.use("/oauth/google", oauthGoogleRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/consultas", consultasRouter);
app.use("/api/protocolos", protocolosRouter);
app.use("/api/pagamentos", pagamentosRouter);
app.use("/api/metas", metasRouter);
app.use("/api/disponibilidade", disponibilidadeRouter);
app.use("/api/anamneses", anamnesisRouter);

export default app;
