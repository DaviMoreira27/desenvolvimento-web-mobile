import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  pgEnum,
  json,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tipoUsuarioEnum = pgEnum("tipo_usuario", ["paciente", "medico"]);
export const statusConsultaEnum = pgEnum("status_consulta", [
  "agendada",
  "concluida",
  "cancelada",
]);
export const statusPagamentoEnum = pgEnum("status_pagamento", [
  "pendente",
  "aprovado",
  "cancelado",
]);
export const nivelAtividadeEnum = pgEnum("nivel_atividade", [
  "sedentario",
  "leve",
  "moderado",
  "intenso",
]);
export const tipoConsultaEnum = pgEnum("tipo_consulta", ["presencial", "teleconsulta"]);

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  tipo: tipoUsuarioEnum("tipo").notNull(),
  telefone: varchar("telefone", { length: 20 }),
  fotoUrl: text("foto_url"),
  googleRefreshToken: text("google_refresh_token"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const anamneses = pgTable("anamneses", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .references(() => usuarios.id)
    .notNull(),
  idade: integer("idade"),
  peso: numeric("peso", { precision: 5, scale: 2 }),
  altura: numeric("altura", { precision: 5, scale: 2 }),
  bmi: numeric("bmi", { precision: 5, scale: 2 }),
  condicoesSaude: json("condicoes_saude").$type<string[]>(),
  alergias: text("alergias"),
  horasSono: numeric("horas_sono", { precision: 4, scale: 1 }),
  nivelAtividade: nivelAtividadeEnum("nivel_atividade"),
  tipoAlimentacao: json("tipo_alimentacao").$type<string[]>(),
  habitos: json("habitos").$type<string[]>(),
  objetivo: text("objetivo"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export const arquivosAnamnese = pgTable("arquivos_anamnese", {
  id: serial("id").primaryKey(),
  anamneseId: integer("anamnese_id")
    .references(() => anamneses.id)
    .notNull(),
  nomeArquivo: varchar("nome_arquivo", { length: 255 }).notNull(),
  url: text("url").notNull(),
  tipoMime: varchar("tipo_mime", { length: 100 }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const consultas = pgTable("consultas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .references(() => usuarios.id)
    .notNull(),
  medicoId: integer("medico_id")
    .references(() => usuarios.id)
    .notNull(),
  dataHora: timestamp("data_hora").notNull(),
  tipo: tipoConsultaEnum("tipo").notNull(),
  status: statusConsultaEnum("status").default("agendada").notNull(),
  linkMeet: text("link_meet"),
  googleEventId: text("google_event_id"),
  statusPagamento: statusPagamentoEnum("status_pagamento")
    .default("pendente")
    .notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const documentosConsulta = pgTable("documentos_consulta", {
  id: serial("id").primaryKey(),
  consultaId: integer("consulta_id")
    .references(() => consultas.id)
    .notNull(),
  nomeArquivo: varchar("nome_arquivo", { length: 255 }).notNull(),
  blobName: varchar("blob_name", { length: 512 }).notNull(),
  tipoMime: varchar("tipo_mime", { length: 100 }),
  uploaderId: integer("uploader_id")
    .references(() => usuarios.id)
    .notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const protocolos = pgTable("protocolos", {
  id: serial("id").primaryKey(),
  medicoId: integer("medico_id")
    .references(() => usuarios.id)
    .notNull(),
  pacienteId: integer("paciente_id")
    .references(() => usuarios.id)
    .notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 100 }),
  conteudoExercicios: json("conteudo_exercicios"),
  conteudoDieta: json("conteudo_dieta"),
  caloriasTotal: integer("calorias_total"),
  versao: integer("versao").default(1).notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const pagamentos = pgTable("pagamentos", {
  id: serial("id").primaryKey(),
  consultaId: integer("consulta_id")
    .references(() => consultas.id)
    .notNull(),
  pacienteId: integer("paciente_id")
    .references(() => usuarios.id)
    .notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  status: statusPagamentoEnum("status").default("pendente").notNull(),
  descricao: text("descricao"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const metas = pgTable("metas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .references(() => usuarios.id)
    .notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  concluida: boolean("concluida").default(false).notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export const diaSemanaEnum = pgEnum("dia_semana", [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
]);

export const disponibilidadeMedicos = pgTable(
  "disponibilidade_medicos",
  {
    id: serial("id").primaryKey(),
    medicoId: integer("medico_id")
      .references(() => usuarios.id)
      .notNull(),
    diaSemana: diaSemanaEnum("dia_semana").notNull(),
    horarioInicio: varchar("horario_inicio", { length: 5 }).notNull(),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("disponibilidade_medico_slot_unique").on(
      table.medicoId,
      table.diaSemana,
      table.horarioInicio
    ),
  ]
);
