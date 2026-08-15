# Zoom Chat Manager

A private, self-hosted web app for archiving and organizing saved Zoom chat transcripts.

## Features

- Upload a Zoom "Save Chat" `.txt` export (or paste raw text) and view it in a formatted, chat-bubble layout.
- Tag chats with one or more tags; filter the chat list by tag.
- Chats and messages are saved automatically to a local SQLite database.
- Delete chats.
- Star individual messages and tag them; the **Highlights** view collects every starred message across all chats, grouped by tag, with a link back to its exact spot in the original chat.

## Tech stack

- Next.js (App Router) + TypeScript
- SQLite via `@libsql/client` - a local file (`data/app.db`) by default, or a remote [Turso](https://turso.tech) database in production (see Deploying below)
- Tailwind CSS
- Single-password auth with a signed session cookie (`jose`), enforced in middleware

## Local development

```bash
npm install
cp .env.example .env
# edit .env: set APP_PASSWORD and generate a SESSION_SECRET, e.g.
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev
```

Visit http://localhost:3000, log in with `APP_PASSWORD`.

## Deploying

### Option A: Vercel + Turso

Vercel's serverless functions have no persistent local disk, so this path swaps the local SQLite file for a hosted [Turso](https://turso.tech) database (libSQL - SQLite-compatible, so no schema/query changes needed):

1. Create a Turso database (via the [dashboard](https://turso.tech) or the `turso` CLI) and grab its connection URL and an auth token.
2. Import [Vercel](https://vercel.com) → New Project → your GitHub repo.
3. In the Vercel project's environment variables, set `APP_PASSWORD`, `SESSION_SECRET`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN`.
4. Deploy.

Local dev needs none of this — with `TURSO_DATABASE_URL` unset, the app automatically falls back to a local SQLite file at `data/app.db`, so you can develop without a Turso account at all.

### Option B: self-hosted (VPS, container, etc.)

This is a standard Next.js app, so it also deploys anywhere Next.js runs with persistent local disk:

```bash
npm install
npm run build
npm start
```

Set `APP_PASSWORD` and `SESSION_SECRET` as environment variables (leave `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` unset to use the local-file fallback). The SQLite database lives at `data/app.db` relative to the working directory — make sure that path is on persistent storage (a mounted volume if you're using a container) so uploads survive restarts/redeploys.

Put it behind a reverse proxy (nginx, Caddy, etc.) with HTTPS if it's reachable from the internet — the session cookie is marked `secure` in production, so login won't work over plain HTTP outside of localhost.

### Backups

The sidebar's "Backup" link downloads a JSON dump of every table at any time - useful regardless of which deploy option you use.

## Zoom chat format

The parser expects Zoom's standard "Save Chat" format:

```
10:01:23	From Jane Doe to Everyone: Hello there
10:01:45	From John Smith to Jane Doe(Direct Message): Hi!
```

Multi-line messages (no leading timestamp) are automatically appended to the previous message. The raw uploaded text is always kept on the chat record, so nothing is lost even if a line doesn't parse as expected.
