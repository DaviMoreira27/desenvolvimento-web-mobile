# Gaps de Implementação

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
| Link Meet | Nao feito | Botao sem handler | - Marcel
| Anamnese (salvar/editar) | Nao feito | Sem integracao - Pedro
Historico de Saude - Davi
Listar pagamentos recebidos para o medico - Davi
Listar pagamentos efetuados Paciente - Davi
Cancelar Agendamento - Davi
Botao de confirmar pagamento do lado do medico - Marcel
