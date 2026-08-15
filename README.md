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
- SQLite via `better-sqlite3` (single file at `data/app.db`)
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

This is a standard Next.js app, so it deploys anywhere Next.js runs (a VPS, a small container, etc.):

```bash
npm install
npm run build
npm start
```

Set `APP_PASSWORD` and `SESSION_SECRET` as environment variables in your hosting environment. The SQLite database lives at `data/app.db` relative to the working directory — make sure that path is on persistent storage (a mounted volume if you're using a container) so uploads survive restarts/redeploys.

Put it behind a reverse proxy (nginx, Caddy, etc.) with HTTPS if it's reachable from the internet — the session cookie is marked `secure` in production, so login won't work over plain HTTP outside of localhost.

## Zoom chat format

The parser expects Zoom's standard "Save Chat" format:

```
10:01:23	From Jane Doe to Everyone: Hello there
10:01:45	From John Smith to Jane Doe(Direct Message): Hi!
```

Multi-line messages (no leading timestamp) are automatically appended to the previous message. The raw uploaded text is always kept on the chat record, so nothing is lost even if a line doesn't parse as expected.
