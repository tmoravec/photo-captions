# photo-captions web

A zero-dependency vanilla JS web app that generates social-media captions and hashtags for batches of photos using the Mistral Pixtral vision model via OpenRouter.

## Stack

- **Frontend:** Single-page app (`public/index.html` + `public/app.js`), Bootstrap 5 via CDN
- **Backend:** Single Vercel serverless function (`api/generate.js`), plain Node.js, no framework
- **Tests:** Node's built-in `node:test` module — zero test dependencies
- **Auth:** Password stored in `sessionStorage`, checked on every API call via `X-Auth-Token` header

## Local Development

### 1. Install dependencies

```bash
npm install
```

This installs the single devDependency: `vercel` CLI.

### 2. Configure environment

Edit `web/.env.local` (created automatically, not committed):

```
OPENROUTER_API_KEY=sk-or-...
MODEL=mistralai/pixtral-large-2411
DEBUG=false
APP_PASSWORD=your-chosen-password
```

### 3. Start dev server

```bash
npm run dev
# → http://localhost:3000
```

`vercel dev` replicates the Vercel production environment locally: serves `public/` as static files and `api/` as serverless functions.

## Tests

```bash
npm test
```

Runs all unit tests using Node's built-in `node:test`. No API key required — tests use mock data.

### Test coverage

- `test/processor.test.js` — `parseApiResponse` (all happy paths + all failure modes)
- `test/prompts.test.js` — `getPrompt` context substitution, unknown platform error

## Vercel Deployment

1. Push the repo to GitHub
2. In the [Vercel dashboard](https://vercel.com/), click **Add New → Project**
3. Import the GitHub repo, set the **Root Directory** to `web/`
4. Add these environment variables in Vercel:
   - `OPENROUTER_API_KEY`
   - `MODEL` (optional, defaults to `mistralai/pixtral-large-2411`)
   - `APP_PASSWORD`
   - `DEBUG` (optional, set to `true` for verbose logging)
5. Click **Deploy** — Vercel auto-deploys on every push to `main`

## Architecture

```
Browser (vanilla JS)
  │  POST /api/generate  (JSON: platform, context, filename, imageBase64, mimeType)
  │  Header: X-Auth-Token: <APP_PASSWORD>
  ▼
api/generate.js (Vercel serverless function)
  │  Auth check → validate inputs → build prompt → call OpenRouter → parse+retry
  ▼
OpenRouter API (mistralai/pixtral-large-2411)
```

## Project Structure

```
web/
├── api/
│   └── generate.js         # Serverless function: auth, OpenRouter call, retry
├── lib/
│   ├── prompts.js           # Prompt templates + getPrompt()
│   └── processor.js         # parseApiResponse(), getTemperature()
├── public/
│   ├── index.html           # Single-page UI with Bootstrap 5 CDN
│   └── app.js               # Vanilla JS: drag & drop, fetch loop, results rendering
├── test/
│   ├── processor.test.js    # Unit tests for response parsing
│   └── prompts.test.js      # Unit tests for prompt generation
├── package.json
├── vercel.json
└── README.md
```

## Usage

1. Open the app in a browser
2. Enter the app password when prompted
3. Select a platform (Flickr, Instagram, or Reddit)
4. Describe the photo session in the context textarea
5. Drop or browse to select images
6. Click **Generate captions** — results appear progressively as each image is processed
7. Click individual hashtags to copy them, or use **Copy all** to copy caption + tags at once
