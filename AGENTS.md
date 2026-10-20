# Lockbox

Pages behind a PIN, at `lockbox.kayzel.com` for viewers and `lockbox.internal` for admins and uploads. The Coolify settings are in infra's [docs/apps/coolify.md](https://github.com/AkiVonAkira/infra/blob/main/docs/apps/coolify.md#lockbox). [README.md](README.md) explains the design.

- Never open, print, or inspect `.env` or any `.env.*` file except `.env.example`. Secrets never go in git.
- A share's PIN is a credential. Print it only to the person who asked for the share. Do not put one in a commit, an issue, a PR, or a log.
- The public name serves only what `PUBLIC_PATHS` in `src/server/auth/hosts.ts` names. A new route is private until it is added there. Keep the admin page, sign-in, and the upload API off it.
- Never add `allow-same-origin` to the item frames. Pages run their own scripts.
- `LOCKBOX_KEY` seals every PIN and item. Never rotate or remove it on the deployed app: every share becomes unreadable.
- Commit by path, `git commit -- <paths>`, as the human author. Never add an agent trailer or footer.
- No Python. Scripts are TypeScript or JavaScript run with `bun` or `node`.
- Install with `npm ci`. Before you push, run `npm test` and `SKIP_ENV_VALIDATION=1 npm run build`, as the Dockerfile does.
- Auto-deploy is off. After a push to `main`, deploy from a infra checkout: `bun .agents/skills/infra-coolify/scripts/coolify-api.mjs deploy <uuid> --wait` with the UUID from the Coolify guide. Then check `https://lockbox.internal/api/healthz` and `https://lockbox.kayzel.com/api/healthz`.
- The database is SQLite on a Coolify volume. Never delete or recreate the Coolify application, because that loses its volume and environment.
