import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import consultasRouter from "./routes/consultas";
import protocolosRouter from "./routes/protocolos";
import pagamentosRouter from "./routes/pagamentos";
import metasRouter from "./routes/metas";
import disponibilidadeRouter from "./routes/disponibilidade";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/consultas", consultasRouter);
app.use("/api/protocolos", protocolosRouter);
app.use("/api/pagamentos", pagamentosRouter);
app.use("/api/metas", metasRouter);
app.use("/api/disponibilidade", disponibilidadeRouter);

export default app;
