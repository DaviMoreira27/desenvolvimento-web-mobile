# Gaps de Implementação

## Agendamento de Consulta

**Status: parcialmente feito**

- `POST /api/consultas` existe e o modal no front chama corretamente
- Horários são hardcoded no frontend (`08:00`, `10:00`, `14:00`, `16:00`, `18:00`) — não refletem disponibilidade real do médico
- Backend não valida conflito de horário — é possível agendar duas consultas no mesmo médico/horário

**O que falta:**
- Lógica de disponibilidade do médico (horários livres x ocupados)
- Validação de conflito no `POST /api/consultas`
- Medico selecionar dias e horario que atende
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

## Resumo Geral

| Funcionalidade | Backend | Frontend |
|---|---|---|
| Criar consulta (fluxo basico) | Feito | Feito |
| Validacao de conflito de horario | Nao feito | — |
| Disponibilidade real do medico | Nao feito | Hardcoded |
| Link Meet | Nao feito | Botao sem handler |
| Anamnese (salvar/editar) | Nao feito | Sem integracao |
| Upload arquivos da anamnese | Nao feito | UI existe |
Historico de Saude
Listar anamneses para o medico
Listar pagamentos recebidos para o medico
Listar pagamentos efetuados Paciente
Cancelar Agendamento
Botao para o usuario efetuar Pagamento
Certificar que o medico nem o paciente veem coisas que nao deveriam
Criar um chat entre o medico e os pacientes que ele atende
