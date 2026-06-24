DaviMoreira27
DaviMoreira27
edited by coderabbitai
PR Author-generated Summary

User-generated pull request details that hopefully answers the most important questions about why they created this pull request, why this is the best solution, and what is the meaning of life!

CodeRabbit-generated Summary

An AI-generated thorough summary of a PR's purpose and key changes, written for human reviewers. By default, CodeRabbit generates release notes in the description.

coderabbitai
coderabbitai
Walkthrough

A concise summary of what changed in this pull request.

Changes

File(s) / Path(s)	Change Summary
src/middleware/auth.ts	Summary of changes to this file.
src/services/token-service.ts	Summary of changes to this file.
Sequence diagram(s)

Sequence diagram
Estimated code review effort

🎯 3 (Moderate) | ⏱️ ~25 minutes

Possibly related issues

A Related Issue #4521 - Reason why this issue is related.
Yet Another Related Issue #4498 - Reason why this issue is related.
Possibly related PRs

feat: A Related Pull Request #4510 - Reason why this pull request is related.
fix: Yet Another Related Pull Request #4487 - Reason why this pull request is related.
Suggested labels

bug
frontend
backend
docs
Suggested reviewers

harjotgill
guritfaq
Poem

🐰 I hopped in code to tweak the show,
A muted stream that doubles its flow,
Dark stage, bright title, button aglow,
I nibble bugs and watch it grow,
🥕 Hero hops — onward we go!
🚥 Pre-merge checks | ✅ 3 | ❌ 2
❌ Failed checks (2 warnings)
Check Name	Status	Explanation	Resolution
Description check	⚠️ Warning	Reason for why the check failed.	How the check can be remediated.
Docstring Coverage	⚠️ Warning	Reason for why the check failed.	How the check can be remediated.
✅ Passed checks (3 passed)
Check Name	Status	Explanation
Title check	✅ Passed	Reason explaining why the Title check passed.
Linked Issues check	✅ Passed	Reason explaining why the Linked Issues check passed.
Out of Scope Changes check	✅ Passed	Reason explaining why the Out of Scope Changes check passed.
✨ Finishing Touches
📝 Generate docstrings
Create stacked PR
Commit on current branch
🪡 Generate unit tests (beta)
Create PR with unit tests
Commit unit tests in branch


Prompt seguranca

@coderabbitai review

Stack: TypeScript/Node no backend, React Native + Expo no client, Drizzle ORM sobre PostgreSQL.

Foque exclusivamente em segurança, ignore estilo e formatação. Para cada finding, classifique com CWE e severidade (critical/high/medium/low).

Verificar:

1. SQL injection via Drizzle: uso de sql.raw() ou template strings com interpolação direta em vez de bindings parametrizados.
2. Auth/Authz: validação de JWT (secret hardcoded, algoritmo none aceito, falta de checagem de expiração/issuer), IDOR (acesso a recurso sem checar ownership), middleware de auth ausente ou bypassável.
3. Exposição de dados: secrets hardcoded no código, uso indevido de variáveis EXPO_PUBLIC_* para dados sensíveis (essas vão pro bundle client e são extraíveis do APK/IPA), logs gravando senha/token/PII, mensagens de erro vazando stack trace ou schema do banco.
4. Mobile específico: tokens guardados em AsyncStorage sem encriptação em vez de expo-secure-store, deep links sem validação de origem antes de navegar/executar ação, WebView com bridge sem validação de onShouldStartLoadWithRequest, ausência de cert pinning em chamadas sensíveis.
5. SSRF em qualquer fetch/axios que use URL vinda de input do usuário.
6. Rate limiting ausente em rotas de login, reset de senha, OTP.
7. CORS com origin "*" em rota autenticada.
8. Dependências com CVE conhecido nas versões usadas do Expo SDK e pacotes npm.


prompt pr titulo

Título deve seguir Conventional Commits, sempre em português.

Formato: <tipo>(<escopo opcional>): <descrição>

Tipos permitidos: feat, fix, docs, style, refactor, perf, test, build, ci, chore.

Regras:
- Descrição em português, no imperativo (ex: "adiciona", "corrige", "remove"), nunca no gerúndio ou passado.
- Descrição concisa, idealmente abaixo de 50 caracteres, sem ponto final.
- Escopo entre parênteses quando fizer sentido (nome do módulo/pasta afetado), minúsculo.
- Breaking change indicado com "!" antes dos dois pontos (ex: feat(auth)!: remove suporte a login legado), nunca em inglês no corpo.
- Rejeitar títulos genéricos como "ajustes", "correções", "update" sem contexto do que mudou.
