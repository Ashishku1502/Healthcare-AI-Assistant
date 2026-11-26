# Rules for this repo (Parchi AI)

1. Read README.md and docs/requirements_status.md before any task.
2. Never rewrite working code. Make the smallest change.
3. After EVERY task run `cd backend && pytest -q` and `cd frontend && npm run build`. Show real output.
4. Never edit or delete an existing test to make it pass.
5. Never weaken safety: urgent overrides booking; no medical advice; booking needs explicit YES; no messages to safe-contact or opted-out numbers; no report disclosure.
6. No API keys in code. Use env variables.
7. Report honestly: implemented, tested, blocked or not implemented.
