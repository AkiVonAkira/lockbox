# Lockbox

Pages behind a PIN. An agent locks a set of pages, such as the HTML visuals from a T3 thread, and gets back a link and a 12-character PIN. Anyone with both can open them at `lockbox.kayzel.com`. Admins see every share and its PIN at `lockbox.internal`.

## How it works

- **Viewers** open `https://lockbox.kayzel.com/s/<id>`. The page is the same for every id and holds nothing of the share. `POST /api/s/<id>/unlock` with the right PIN is the only call that returns the items. Five wrong PINs in a row lock the share for 15 minutes. A missing and an expired share answer the same.
- **Items** render in sandboxed frames (`allow-scripts`, no `allow-same-origin`), so a page cannot read Lockbox, its cookies, or the viewer's session. Each frame gets T3's theme variables in Stillwater colors, so pages written for T3's `html_render` look as they did in the thread. Only HTML items exist now; the `Item` union in `src/domain/share.ts` is where another kind goes.
- **Admin** is `https://lockbox.internal/admin`, signed in through Authentik, for the `Admin` group only. The app checks the group claim as well as Authentik's binding. It lists every share with its link and PIN, and can open, extend, re-PIN, or delete one.
- **Uploads** are `POST /api/shares` on `lockbox.internal` with `LOCKBOX_SERVICE_TOKEN` as a bearer token. The public name answers 404 for it, and for everything but the PIN pages.
- **At rest**, each PIN and each share's items are sealed with AES-256-GCM under `LOCKBOX_KEY`, bound to the share's id. The database file or a backup alone opens nothing. Titles, dates, and counts are plain.
- Shares expire after 30 days by default. Expired shares stay in the admin list for 30 more days, so one can be extended, then go.

## Lock pages from an agent

```sh
bun scripts/share.ts manifest.json
```

```json
{
  "title": "Enemy spawning: before and after",
  "items": [
    { "title": "1 · Overview", "file": "1.html", "height": 900 },
    { "title": "2 · Budget", "file": "2.html" }
  ]
}
```

It prints `{ id, url, pin, expiresAt }`. A file can be a T3 `html_render` attachment from `~/.t3/userdata/attachments/<thread id>-<uuid>-html.html` as is: the script takes out the theme T3 put in it. The token comes from `LOCKBOX_SERVICE_TOKEN`, or the infra checkout's ignored `.env`. The fleet `lockbox` skill describes the whole step.

## Develop

```sh
npm ci
cp .env.example .env.local   # then set LOCKBOX_KEY and LOCKBOX_SERVICE_TOKEN to random values
npm run dev
npm test
SKIP_ENV_VALIDATION=1 npm run build
```

`LOCKBOX_DEV_ADMIN=1` opens the admin page without Authentik under `next dev` only.

## Deployment

Coolify builds the Dockerfile on Apps. The settings are in infra's [docs/apps/coolify.md](https://github.com/AkiVonAkira/infra/blob/main/docs/apps/coolify.md#lockbox). The database is SQLite on the volume at `/data`. A scheduled task runs `node scripts/backup.mjs` nightly into `/cloud/backups` on NFS.
