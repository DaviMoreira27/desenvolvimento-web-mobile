# Gaps de Implementação

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
| Link Meet | Nao feito | Botao sem handler |
| Anamnese (salvar/editar) | Nao feito | Sem integracao |
| Upload arquivos da anamnese | Nao feito | UI existe |
Historico de Saude
Listar pagamentos recebidos para o medico
Listar pagamentos efetuados Paciente
Cancelar Agendamento
