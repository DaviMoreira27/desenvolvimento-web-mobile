# VitalGoal - Guia de Setup Completo

[![PR Tests](https://github.com/DaviMoreira27/desenvolvimento-web-mobile/actions/workflows/pr-tests.yml/badge.svg)](https://github.com/DaviMoreira27/desenvolvimento-web-mobile/actions/workflows/pr-tests.yml)

<!-- COVERAGE-BADGES:START -->
![frontend coverage](https://img.shields.io/badge/frontend%20coverage-97%25-brightgreen)
![backend coverage](https://img.shields.io/badge/backend%20coverage-91%25-brightgreen)
<!-- COVERAGE-BADGES:END -->

Aplicação fullstack de gerenciamento de consultas, protocolos e pagamentos para pacientes e médicos.

## 📋 Pré-requisitos

Antes de começar, instale:

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Docker e Docker Compose** — [Download](https://www.docker.com/)
- **Git** — [Download](https://git-scm.com/)

Verifique a instalação:

```bash
node --version
docker --version
docker-compose --version
git --version
```

## 🚀 Setup em 4 Passos

### Passo 1: Clonar o repositório

```bash
git clone https://github.com/DaviMoreira27/desenvolvimento-web-mobile.git
cd desenvolvimento-web-mobile
```

### Passo 2: Iniciar o Banco de Dados (Terminal 1)

O Docker Compose configurará o PostgreSQL automaticamente:

```bash
docker compose up
```

Você verá:
```
postgresql_1  | database system is ready to accept connections
```

✅ Banco de dados rodando na porta **5435**

### Passo 3: Setup e Rodar o Backend (Terminal 2)

```bash
# Entrar na pasta do backend
cd backend

# Instalar dependências
npm install

# Rodar as migrations (criar tabelas no banco)
npm run db:migrate

# Iniciar o servidor
npm run dev
```

Você verá:
```
Server running on port 3000
```

✅ Backend rodando em **http://localhost:3000**

### Passo 4: Setup e Rodar o Frontend (Terminal 3)

```bash
# Entrar na pasta do frontend (a partir da raiz)
cd frontend

# Instalar dependências
npm install

# Iniciar o app Expo
npx expo start
```

Você verá um QR code e opções para rodar em:
- **Web**: Pressione `w`
- **iOS/Android**: Escaneie o QR code com Expo Go

✅ Frontend rodando em **http://localhost:8081** (web)

## 📱 Usando a Aplicação

### 1. Criar uma Conta

Acesse o app e clique em "Criar Conta"

```bash
# Dados de exemplo:
Email: usuario@example.com
Senha: senha123
Nome: Seu Nome
Tipo: Paciente (ou Médico)
```

### 2. Fazer Login

Use as credenciais criadas acima

### 3. Navegar pelo App

- **Dashboard (Início)** — Overview de consultas, protocolos e pagamentos
- **Consultas** — Lista de consultas agendadas
- **Protocolos** — Protocolos de exercícios e dieta
- **Perfil** — Dados pessoais do usuário

### 4. Agendar Consulta

Clique em "Agendar Consulta" no sidebar:
1. Selecione um médico
2. Escolha uma data (mínimo amanhã)
3. Escolha um horário
4. Escolha o tipo (Presencial ou Teleconsulta)
5. Clique em "Agendar"

## 🧪 Testando a API com Scripts

Temos scripts prontos para testar a API automaticamente:

### Windows (PowerShell)

Use o script `backend/curls.ps1` para rodar todos os testes:

```powershell
cd backend
.\curls.ps1
```

O script irá:
1. ✅ Registrar um paciente de teste
2. ✅ Registrar um médico de teste
3. ✅ Fazer login com o médico
4. ✅ Criar protocolo de emagrecimento
5. ✅ Criar protocolo de hipertrofia

**Nota:** Se receber erro de "scripts desativados", execute uma vez:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### macOS / Linux

Use o script `backend/curls.sh`:

```bash
cd backend
bash curls.sh
```

### Manual (Qualquer SO)

Veja exemplos completos em `backend/README.md` para criar requisições manualmente.

## 🛠️ Estrutura do Projeto

```
Desenvolvimento-web-mobile/
├── backend/                    # API Express + TypeScript
│   ├── src/
│   │   ├── server.ts          # Entrada do servidor
│   │   ├── app.ts             # Configuração Express
│   │   ├── routes/            # Endpoints da API
│   │   ├── schemas/           # Validação com Zod
│   │   ├── db/                # Drizzle ORM + migrations
│   │   └── middlewares/       # Auth, validação, etc
│   ├── package.json
│   └── README.md
│
├── frontend/                   # App React Native + Expo
│   ├── app/                   # Navegação e telas
│   ├── components/            # Componentes reutilizáveis
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilitários
│   ├── package.json
│   └── README.md
│
├── docker-compose.yml         # Configuração PostgreSQL
└── README.md                  # Este arquivo
```

## 📚 Rotas da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/users/me` | Dados do usuário logado |
| GET | `/api/users/medicos` | Lista de médicos |
| GET | `/api/consultas` | Lista de consultas |
| POST | `/api/consultas` | Agendar consulta |
| GET | `/api/protocolos` | Lista de protocolos |
| GET | `/api/pagamentos` | Histórico de pagamentos |

## 🔧 Comandos Úteis

### Backend

```bash
cd backend

npm run dev          # Inicia servidor em desenvolvimento
npm run build        # Compila TypeScript
npm start            # Inicia servidor de produção
npm run db:generate  # Gera novas migrations
npm run db:migrate   # Executa migrations
npm run db:studio    # Abre Drizzle Studio
```

### Frontend

```bash
cd frontend

npx expo start       # Inicia servidor Expo
npx expo export      # Exporta app
npm run web          # Abre no navegador
```

### Docker

```bash
# A partir da raiz do projeto

docker-compose up    # Inicia PostgreSQL
docker-compose down  # Para PostgreSQL
docker-compose ps    # Status dos containers
```

## 🐛 Troubleshooting

### Erro: "Porta 5435 já em uso"

Verifique qual processo está usando:
```bash
lsof -i :5435
# Ou no Windows:
netstat -ano | findstr :5435
```

Mude a porta em `docker-compose.yml` e `.env`

### Erro: "Cannot find module"

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Erro de conexão com banco de dados

Verifique:
1. Docker está rodando: `docker ps`
2. `.env` tem a URL correta
3. Aguarde o PostgreSQL subir (30 segundos)

### Erro ao agendar consulta

Certifique-se de:
- Selecionar um médico
- Selecionar uma data (mínimo amanhã)
- Selecionar um horário
- Selecionar um tipo de consulta

## 📖 Documentação Adicional

- **Backend**: Veja `backend/README.md`
- **Frontend**: Veja `frontend/README.md`

## 🚢 Deploy (Futuro)

- Backend: Vercel, Railway ou Heroku
- Frontend: Vercel, Netlify ou EAS Build
- Banco: Vercel Postgres ou Supabase

## 👥 Equipe

- **Backend**: TypeScript, Express, Drizzle
- **Frontend**: React Native, Expo, TypeScript
- **Database**: PostgreSQL

## 📝 Licença

ISC
