# Lockbox

Lockbox puts HTML pages behind a PIN. You upload a set of pages and get back a link and a 12-character PIN. Anyone with both can open the pages. Nobody without the PIN sees anything, not even the title.

It was built to share the HTML visuals a coding agent writes, but any self-contained HTML page works.

## How it works

- **Viewers** open `<public URL>/s/<id>`. The page is the same for every id and holds nothing of the share. `POST /api/s/<id>/unlock` with the right PIN is the only call that returns the pages. Five wrong PINs in a row lock the share for 15 minutes. A missing and an expired share answer the same.
- **Pages** render in sandboxed frames (`allow-scripts`, no `allow-same-origin`), so a page cannot read Lockbox, its cookies, or the viewer's session. Each frame gets a set of theme CSS variables. Only HTML items exist now; the `Item` union in `src/domain/share.ts` is where another kind goes.
- **Two URLs.** `LOCKBOX_PUBLIC_URL` serves only the landing page, the PIN pages, and the unlock call. `LOCKBOX_ADMIN_URL` serves everything else: the admin page, sign-in, uploads, and stats. Put the admin URL on a private network if you can. One URL for both also works.
- **Admin** is `<admin URL>/admin`, signed in through any OpenID Connect provider, for one group only. It lists every share with its link and PIN, and can open, extend, re-PIN, unlock, or delete one.
- **Uploads** are `POST /api/shares` on the admin URL with `LOCKBOX_SERVICE_TOKEN` as a bearer token. `scripts/share.ts` wraps it.
- **Stats** are `GET /api/stats` on the admin URL with `LOCKBOX_STATS_TOKEN`, a separate read-only token. It answers `{ total, active }`.
- **At rest**, each PIN and each share's pages are sealed with AES-256-GCM under `LOCKBOX_KEY`, bound to the share's id. The database file or a backup alone opens nothing. Titles, dates, and counts are plain.
- Shares expire after 30 days by default. Expired shares stay in the admin list for 30 more days, so one can be extended, then go.

## Self-host

You need Docker with Compose.

```sh
git clone https://github.com/AkiVonAkira/lockbox.git
cd lockbox
cp .env.example .env
docker compose up -d
```

Open http://localhost:3000. The viewer works as is. To lock pages, set `LOCKBOX_SERVICE_TOKEN` in `.env` (`openssl rand -hex 32`), run `docker compose up -d` again, then:

```sh
LOCKBOX_ENV_FILE=.env bun scripts/share.ts manifest.json
```

or call the API directly:

```sh
curl -X POST http://localhost:3000/api/shares \
  -H "Authorization: Bearer $LOCKBOX_SERVICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Hello","items":[{"kind":"html","title":"Page 1","html":"<h1>Hi</h1>"}]}'
```

Both answer `{ id, url, pin, expiresAt }`. The PIN is shown once here; the admin page shows it again.

Before you put Lockbox on the internet:

1. Set `LOCKBOX_KEY` (`openssl rand -base64 32`) and keep a copy apart from the data. Without it, Lockbox makes a key file in the data volume, so the volume alone opens every share. Changing or losing the key makes every share unreadable.
2. Set `LOCKBOX_PUBLIC_URL` and `LOCKBOX_ADMIN_URL` to the URLs browsers use, behind a TLS proxy. Lockbox answers only on those hosts.
3. Set up admin sign-in (below), or leave it off and use only the upload API.

The database is SQLite in the `lockbox-data` volume. `node scripts/backup.mjs` inside the container writes a dated copy into `LOCKBOX_BACKUP_DIR` and keeps the newest 14. Run it on a schedule.

### Admin sign-in

Any OpenID Connect provider works (Authentik, Keycloak, Authelia, Zitadel, and others). At the provider:

1. Create a confidential client with the redirect URI `<LOCKBOX_ADMIN_URL>/api/auth/callback/oidc`.
2. Make sure the ID token or userinfo carries a groups claim. Some providers need a `groups` scope or a mapper for it.
3. Put the people who may use the admin page in one group.

Then set `AUTH_SECRET`, `AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID`, `AUTH_OIDC_CLIENT_SECRET`, and, if they differ from the defaults, `AUTH_OIDC_SCOPE`, `AUTH_OIDC_GROUPS_CLAIM`, and `AUTH_OIDC_ADMIN_GROUP`. Lockbox refuses a session to anyone outside the group, even if the provider lets them through.

## Configuration

Every setting is in [.env.example](.env.example) with a comment.

| Variable | Default | What it does |
| --- | --- | --- |
| `LOCKBOX_PUBLIC_URL` | `http://localhost:3000` when both URLs are unset | Where viewers open shares. Serves only the PIN pages. Share links point here. |
| `LOCKBOX_ADMIN_URL` | `http://localhost:3000` when both URLs are unset; none when only the public URL is set | Where the admin page, sign-in, uploads, and stats answer. |
| `LOCKBOX_KEY` | a key file made in the data directory | 32 random bytes, base64. Seals every PIN and page. |
| `LOCKBOX_SERVICE_TOKEN` | unset: uploads refused | Bearer token for `POST /api/shares`, 32 characters or more. |
| `LOCKBOX_STATS_TOKEN` | unset: stats refused | Read-only bearer token for `GET /api/stats`, 32 characters or more. |
| `LOCKBOX_DATA_DIR` | `/data` in Docker, `.data` otherwise | Where `lockbox.db` lives. |
| `LOCKBOX_BACKUP_DIR` | none | `scripts/backup.mjs` only: an existing directory for copies. |
| `LOCKBOX_PORT` | `3000` | `compose.yaml` only: the host port. |
| `AUTH_SECRET` | none | Auth.js session secret. Needed for admin sign-in. |
| `AUTH_OIDC_ISSUER` | none | The provider's issuer URL. |
| `AUTH_OIDC_CLIENT_ID` | none | This app's client id at the provider. |
| `AUTH_OIDC_CLIENT_SECRET` | none | This app's client secret at the provider. |
| `AUTH_OIDC_SCOPE` | `openid profile` | Scopes to ask for. |
| `AUTH_OIDC_GROUPS_CLAIM` | `groups` | The claim that lists the person's groups. |
| `AUTH_OIDC_ADMIN_GROUP` | `Admin` | The group that may use the admin page. |
| `AUTH_OIDC_NAME` | `single sign-on` | The sign-in button's label. |
| `AUTH_OIDC_PROVIDER_ID` | `oidc` | The Auth.js provider id, the last part of the callback path. |
| `LOCKBOX_DEV_ADMIN` | unset | `next dev` only: use the admin page without sign-in. |

`AUTH_AUTHENTIK_ISSUER`, `AUTH_AUTHENTIK_ID`, and `AUTH_AUTHENTIK_SECRET` are older names for the issuer, client id, and secret. They are read when the `AUTH_OIDC_*` ones are unset, and then the provider id is `authentik`, so an existing redirect URI keeps working.

## Lock pages with the script

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

It prints `{ id, url, pin, expiresAt, admin, message }`. File paths are relative to the manifest. A page saved by T3 Code's `html_render` works as is: the script takes out the theme T3 put in it. The script reads `LOCKBOX_API` (the admin URL), `LOCKBOX_SERVICE_TOKEN`, and `LOCKBOX_CA` (a PEM file to trust, for a private CA) from the environment, or from the dotenv file `LOCKBOX_ENV_FILE` names.

## Develop

```sh
npm ci
cp .env.example .env.local
npm run dev
npm test
SKIP_ENV_VALIDATION=1 npm run build
```

Set `LOCKBOX_DEV_ADMIN=1` in `.env.local` to open the admin page without sign-in under `next dev`.

## License

Lockbox is free software under the [GNU Affero General Public License v3.0 only](LICENSE). Copyright (C) 2026 Ilyas Kaya. If you run a modified Lockbox for other people over a network, the AGPL asks you to offer them its source.
