# Gaps de Implementação

## Agendamento de Consulta

**Status: parcialmente feito**

- `POST /api/consultas` existe e o modal no front chama corretamente
- Horários são hardcoded no frontend (`08:00`, `10:00`, `14:00`, `16:00`, `18:00`) — não refletem disponibilidade real do médico
- Backend não valida conflito de horário — é possível agendar duas consultas no mesmo médico/horário

**O que falta:**
- Lógica de disponibilidade do médico (horários livres x ocupados)
- Validação de conflito no `POST /api/consultas`

---

## Link Meet (Teleconsulta)

**Status: não implementado**

- Campo `linkMeet` existe no banco mas nunca é populado
- Nenhum endpoint escreve nesse campo
- Botão "Entrar via meet" no frontend não tem `onPress` handler

**O que falta:**
- Definir abordagem: link manual (médico informa) ou integração com Google Meet API
- Endpoint `PATCH /api/consultas/:id` para o médico inserir o link, ou geração automática no `POST` quando tipo for `teleconsulta`
- Handler no botão do frontend que chama `GET /api/consultas/:id/link` e abre o link

---

## Anamnese

**Status: não integrado**

- Formulário completo existe no frontend com campos de peso, altura, histórico, alergias, nível de atividade, hábitos, objetivo e upload de arquivos
- Botão "Enviar Anamnese" não tem `onPress` handler
- Tabela `anamneses` e `arquivos_anamnese` existem no banco
- Nenhum endpoint de anamnese existe no backend

**O que falta:**
- `POST /api/anamnese` — salvar formulário
- `GET /api/anamnese/me` — recuperar anamnese do paciente logado
- `PUT /api/anamnese/:id` — atualizar anamnese existente
- Upload de arquivos vinculado à anamnese
- Integrar o botão "Enviar Anamnese" no frontend
- Aba "Histórico de saúde" no perfil consumindo `GET /api/anamnese/me`

---

## Edição de Perfil

**Status: backend feito, frontend não existe**

- `PUT /api/users/me` existe no backend
- Frontend só lê o perfil (`GET /api/users/me`), não há formulário de edição
- Campos editáveis: `nome`, `telefone`, `fotoUrl`

**O que falta:**
- Tela ou modal de edição de perfil no frontend
- Hook `useUpdateProfile` chamando `PUT /api/users/me`
- Integrar na tela de perfil (botão "Editar")

---

## Metas do Paciente

**Status: não implementado**

- Aba "Metas" na tela de perfil existe mas mostra "Em breve"
- Não há tabela de metas no banco
- Não há endpoints relacionados

**O que falta:**
- Definir modelo de dados para metas
- Migration + schema no banco
- Endpoints CRUD
- UI na aba "Metas" do perfil

---

## Resumo Geral

| Funcionalidade | Backend | Frontend |
|---|---|---|
| Criar consulta (fluxo basico) | Feito | Feito |
| Validacao de conflito de horario | Nao feito | — |
| Disponibilidade real do medico | Nao feito | Hardcoded |
| Link Meet | Nao feito | Botao sem handler |
| Ver documentos da consulta | Feito (GET) | Botao sem handler |
| Upload de documentos | Nao feito | Nao feito |
| Anamnese (salvar/editar) | Nao feito | Sem integracao |
| Upload arquivos da anamnese | Nao feito | UI existe |
| Editar perfil | Feito (PUT) | Nao feito |
| Metas do paciente | Nao feito | Placeholder |
