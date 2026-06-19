# Relatório de Segurança — VitalGoal

Este documento identifica as vulnerabilidades de segurança mais relevantes encontradas na base de código do VitalGoal, classificadas de acordo com o OWASP Top 10, e propõe mitigações concretas para cada uma. A análise cobre autenticação, autorização, criptografia, validação de entrada e exposição de dados — categorias enfatizadas no material do curso (ISO/IEC 25010: Confidencialidade, Integridade, Autenticidade, Responsabilização).

---

## 1. Segredo JWT com Valor Padrão Fixo no Código

**OWASP A02 — Falhas Criptográficas**

**Localização:** `backend/src/routes/auth.ts:18` e `backend/src/middlewares/auth.ts:29`

```ts
const JWT_SECRET = process.env.JWT_SECRET ?? "secret";
```

A aplicação utiliza a string `"secret"` como chave de assinatura sempre que a variável `JWT_SECRET` estiver ausente no ambiente. Qualquer atacante que conheça esse valor (o código-fonte é público) pode forjar tokens JWT válidos para qualquer usuário com qualquer `tipo` (inclusive `"medico"`), contornando toda a autenticação.

**Correção:** Remover o valor padrão. Se a variável estiver ausente, o servidor deve encerrar na inicialização.

```ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET não está definido");
```

---

## 2. Ausência de Rate Limiting nos Endpoints de Autenticação

**OWASP A07 — Falhas de Identificação e Autenticação**

**Localização:** `backend/src/app.ts` — rotas `/api/auth/login` e `/api/auth/register`

Não há limitação de tentativas no login ou no cadastro. Um atacante pode realizar tentativas ilimitadas para adivinhar senhas (força bruta) ou inundar o endpoint de registro para criar milhares de contas.

**Correção:** Aplicar `express-rate-limit` especificamente nas rotas de autenticação.

```ts
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Muitas tentativas. Tente novamente em 15 minutos." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
```

---

## 3. Token JWT Armazenado no AsyncStorage

**OWASP Mobile M9 — Armazenamento Inseguro de Dados**

**Localização:** `frontend/hooks/auth/AuthContext.tsx:28–30`

```ts
const storedToken = await AsyncStorage.getItem("@vitalgoal:token");
```

O `AsyncStorage` não é criptografado. Em dispositivos Android com root ou iOS com jailbreak, qualquer outro aplicativo pode ler seu conteúdo. Um token roubado garante acesso completo à conta por 7 dias sem nenhuma possibilidade de revogação.

**Correção:** Substituir `AsyncStorage` por `expo-secure-store`, que utiliza o enclave seguro do dispositivo (Keychain no iOS, Keystore no Android).

```ts
import * as SecureStore from "expo-secure-store";

await SecureStore.setItemAsync("@vitalgoal:token", token);
const storedToken = await SecureStore.getItemAsync("@vitalgoal:token");
await SecureStore.deleteItemAsync("@vitalgoal:token");
```

---

## 4. Comunicação com a API via HTTP (Sem TLS)

**OWASP A02 — Falhas Criptográficas**

**Localização:** `frontend/lib/api.ts:1`

```ts
export const API_URL = "http://localhost:3000";
```

Todas as requisições, incluindo credenciais de login e dados sensíveis de saúde (anamneses, diagnósticos, links de teleconsulta), trafegam em texto puro via HTTP. Qualquer observador de rede (Wi-Fi público, provedor de internet, ataque man-in-the-middle) pode ler ou modificar esses dados em trânsito.

**Correção:** Implantar o backend com HTTPS e atualizar a URL para usar `https://` em todos os ambientes. Utilizar uma variável de ambiente para não fixar a URL no código.

```ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api.vitalgoal.com";
```

---

## 5. Requisitos de Senha Fracos

**OWASP A07 — Falhas de Identificação e Autenticação**

**Localização:** `backend/src/schemas/auth.schema.ts:6`

```ts
senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
```

Um mínimo de 6 caracteres sem nenhum requisito de complexidade permite senhas como `123456` ou `aaaaaa`. A aplicação armazena prontuários médicos e processa pagamentos; o nível de exigência de autenticação deve ser mais alto.

**Correção:** Aumentar o mínimo e exigir classes de caracteres variadas.

```ts
senha: z
  .string()
  .min(8, "Senha deve ter ao menos 8 caracteres.")
  .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula.")
  .regex(/[0-9]/, "Senha deve conter ao menos um número."),
```

---

## 6. CORS Configurado para Permitir Qualquer Origem

**OWASP A05 — Configuração de Segurança Incorreta**

**Localização:** `backend/src/app.ts:17`

```ts
app.use(cors());
```

Sem restrição de `origin`, qualquer site pode fazer requisições autenticadas à API. Isso viabiliza ataques de falsificação de requisição entre sites (CSRF) e roubo de dados entre origens em clientes baseados em navegador.

**Correção:** Restringir o CORS às origens conhecidas da aplicação.

```ts
app.use(cors({
  origin: [
    "https://app.vitalgoal.com",
    process.env.DEV_ORIGIN ?? "http://localhost:8081",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

---

## 7. Upload de Arquivos Sem Validação de Tamanho ou Tipo

**OWASP A04 — Design Inseguro**

**Localização:** `backend/src/routes/consultas.ts:17` e `backend/src/routes/consultas.ts:310–376`

```ts
const multerUpload = multer({ storage: multer.memoryStorage() });
```

Não há limite de tamanho (`limits.fileSize`) nem validação de tipo MIME. Um atacante pode:
- Fazer upload de um arquivo de vários gigabytes para esgotar a memória do servidor (negação de serviço);
- Enviar arquivos com tipos MIME arbitrários, potencialmente armazenando conteúdo executável;
- Usar um `originalname` com caracteres de path traversal na chave do blob.

**Correção:**

```ts
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido."));
    }
  },
});

// Sanitizar o nome do arquivo antes de usá-lo na chave do blob
import { basename } from "path";
const nomeSeguro = basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
const blobName = `consultas/${consultaId}/${Date.now()}-${nomeSeguro}`;
```

---

## 8. Ausência de Validação de Entrada nas Rotas de Anamnese

**OWASP A03 — Injeção**

**Localização:** `backend/src/routes/anamneses.ts:65` (POST) e `backend/src/routes/anamneses.ts:118` (PUT)

Os handlers de `POST /api/anamneses` e `PUT /api/anamneses/:id` desestrutura `req.body` diretamente sem nenhuma validação de schema. Isso é inconsistente com o restante da base de código (que usa o middleware `validate` com Zod) e permite que campos arbitrários sejam gravados no banco de dados, incluindo tipos inesperados que podem causar erros em tempo de execução ou corrompimento de dados.

**Correção:** Adicionar um schema Zod e aplicar o middleware `validate` em ambas as rotas, seguindo o padrão utilizado em `metas.ts` e `consultas.ts`.

```ts
// schemas/anamnese.schema.ts
export const anamneseSchema = z.object({
  idade: z.number().int().min(0).max(150).nullable().optional(),
  peso: z.string().max(10).nullable().optional(),
  altura: z.string().max(10).nullable().optional(),
  // ... demais campos
});

// anamneses.ts
router.post("/", validate(anamneseSchema), async (req, res) => { ... });
router.put("/:id", validate(anamneseSchema), async (req, res) => { ... });
```

---

## 9. Token JWT de Longa Duração Sem Mecanismo de Revogação

**OWASP A07 — Falhas de Identificação e Autenticação**

**Localização:** `backend/src/routes/auth.ts:52` e `backend/src/routes/auth.ts:85`

```ts
{ expiresIn: "7d" }
```

Os tokens são válidos por 7 dias sem nenhum mecanismo de invalidação no servidor. Se um token for roubado (por exemplo, via `AsyncStorage` em um dispositivo comprometido), o atacante mantém acesso completo até o vencimento natural. Não existe endpoint de logout que invalide o token no servidor.

**Correção:** Reduzir `expiresIn` para `"15m"` e introduzir um fluxo de refresh token. Alternativamente, manter uma lista de revogação de tokens no servidor (em Redis ou no banco de dados) e verificá-la a cada requisição autenticada. No mínimo, reduzir o tempo de vida do token de acesso para `"1d"`.

---

## Resumo

| # | Vulnerabilidade | Categoria OWASP | Severidade |
|---|-----------------|-----------------|------------|
| 1 | Segredo JWT fixo no código como valor padrão | A02 Falhas Criptográficas | Crítica |
| 2 | Sem rate limiting nos endpoints de autenticação | A07 Falhas de Autenticação | Alta |
| 3 | Token JWT armazenado no AsyncStorage | Mobile M9 Armazenamento Inseguro | Alta |
| 4 | API via HTTP sem TLS | A02 Falhas Criptográficas | Alta |
| 5 | Requisitos de senha fracos | A07 Falhas de Autenticação | Média |
| 6 | CORS permite qualquer origem | A05 Configuração Incorreta | Média |
| 7 | Upload de arquivos sem validação | A04 Design Inseguro | Média |
| 8 | Sem validação de entrada nas anamneses | A03 Injeção | Média |
| 9 | Token JWT de longa duração sem revogação | A07 Falhas de Autenticação | Média |
