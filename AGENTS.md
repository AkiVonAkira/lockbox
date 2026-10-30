# Lockbox

Pages behind a PIN. Viewers use `LOCKBOX_PUBLIC_URL`; admins and uploads use `LOCKBOX_ADMIN_URL`. [README.md](README.md) explains the design and every setting.

- Never open, print, or inspect `.env` or any `.env.*` file except `.env.example`. Secrets never go in git.
- A share's PIN is a credential. Print it only to the person who asked for the share. Do not put one in a commit, an issue, a PR, or a log.
- The public URL serves only what `PUBLIC_PATHS` in `src/server/auth/hosts.ts` names. A new route is private until it is added there. Keep the admin page, sign-in, and the upload API off it.
- With only `LOCKBOX_PUBLIC_URL` set, there is no admin origin. Keep that default closed: a missing setting must never put the admin page on the public URL.
- Never add `allow-same-origin` to the item frames. Pages run their own scripts.
- `LOCKBOX_KEY` seals every PIN and item. Never rotate or remove it on a deployed app: every share becomes unreadable.
- A new setting goes in `src/env.js`, `.env.example` with a comment, and the README's configuration table. Renaming one breaks running deployments; keep the old name as a fallback.
- Commit by path, `git commit -- <paths>`, as the human author. Never add an agent trailer or footer.
- Bun loads this checkout's `.env` and `.env.local` into `process.env`. `scripts/share.ts` ignores values that came from those files, because they are the local server's, not the deployed one's. Pass `LOCKBOX_ENV_FILE` to read one on purpose. When an upload gets a 401, first check which token the script sent.
- No Python. Scripts are TypeScript or JavaScript run with `bun` or `node`.
- Install with `npm ci`. Before you push, run `npm test` and `SKIP_ENV_VALIDATION=1 npm run build`, as the Dockerfile does. For a change to startup or settings, also run `cp .env.example .env && docker compose up --build` and check `http://localhost:3000/api/healthz`.
- The database is SQLite in the data directory. Never delete or recreate a deployment's volume.
