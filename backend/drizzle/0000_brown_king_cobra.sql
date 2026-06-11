CREATE TYPE "public"."dia_semana" AS ENUM('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');--> statement-breakpoint
CREATE TYPE "public"."nivel_atividade" AS ENUM('sedentario', 'leve', 'moderado', 'intenso');--> statement-breakpoint
CREATE TYPE "public"."status_consulta" AS ENUM('agendada', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."status_pagamento" AS ENUM('pendente', 'aprovado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_consulta" AS ENUM('presencial', 'teleconsulta');--> statement-breakpoint
CREATE TYPE "public"."tipo_usuario" AS ENUM('paciente', 'medico');--> statement-breakpoint
CREATE TABLE "anamneses" (
	"id" serial PRIMARY KEY NOT NULL,
	"paciente_id" integer NOT NULL,
	"idade" integer,
	"peso" numeric(5, 2),
	"altura" numeric(5, 2),
	"bmi" numeric(5, 2),
	"condicoes_saude" json,
	"alergias" text,
	"horas_sono" numeric(4, 1),
	"nivel_atividade" "nivel_atividade",
	"tipo_alimentacao" json,
	"habitos" json,
	"objetivo" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arquivos_anamnese" (
	"id" serial PRIMARY KEY NOT NULL,
	"anamnese_id" integer NOT NULL,
	"nome_arquivo" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"tipo_mime" varchar(100),
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" serial PRIMARY KEY NOT NULL,
	"paciente_id" integer NOT NULL,
	"medico_id" integer NOT NULL,
	"data_hora" timestamp NOT NULL,
	"tipo" "tipo_consulta" NOT NULL,
	"status" "status_consulta" DEFAULT 'agendada' NOT NULL,
	"link_meet" text,
	"google_event_id" text,
	"status_pagamento" "status_pagamento" DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disponibilidade_medicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"medico_id" integer NOT NULL,
	"dia_semana" "dia_semana" NOT NULL,
	"horario_inicio" varchar(5) NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos_consulta" (
	"id" serial PRIMARY KEY NOT NULL,
	"consulta_id" integer NOT NULL,
	"nome_arquivo" varchar(255) NOT NULL,
	"blob_name" varchar(512) NOT NULL,
	"tipo_mime" varchar(100),
	"uploader_id" integer NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metas" (
	"id" serial PRIMARY KEY NOT NULL,
	"paciente_id" integer NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"concluida" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"consulta_id" integer NOT NULL,
	"paciente_id" integer NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"status" "status_pagamento" DEFAULT 'pendente' NOT NULL,
	"descricao" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocolos" (
	"id" serial PRIMARY KEY NOT NULL,
	"medico_id" integer NOT NULL,
	"paciente_id" integer NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"tipo" varchar(100),
	"conteudo_exercicios" json,
	"conteudo_dieta" json,
	"calorias_total" integer,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha_hash" text NOT NULL,
	"tipo" "tipo_usuario" NOT NULL,
	"telefone" varchar(20),
	"foto_url" text,
	"google_refresh_token" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_paciente_id_usuarios_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquivos_anamnese" ADD CONSTRAINT "arquivos_anamnese_anamnese_id_anamneses_id_fk" FOREIGN KEY ("anamnese_id") REFERENCES "public"."anamneses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_paciente_id_usuarios_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_medico_id_usuarios_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disponibilidade_medicos" ADD CONSTRAINT "disponibilidade_medicos_medico_id_usuarios_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_consulta" ADD CONSTRAINT "documentos_consulta_consulta_id_consultas_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "public"."consultas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_consulta" ADD CONSTRAINT "documentos_consulta_uploader_id_usuarios_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metas" ADD CONSTRAINT "metas_paciente_id_usuarios_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_consulta_id_consultas_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "public"."consultas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_paciente_id_usuarios_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocolos" ADD CONSTRAINT "protocolos_medico_id_usuarios_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocolos" ADD CONSTRAINT "protocolos_paciente_id_usuarios_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "disponibilidade_medico_slot_unique" ON "disponibilidade_medicos" USING btree ("medico_id","dia_semana","horario_inicio");