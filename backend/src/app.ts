import cors from "cors";
import express from "express";
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

const app = express();

app.use(express.json());
app.use(cors());

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
