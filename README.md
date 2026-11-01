# Groq Chat

A ChatGPT-style chatbot built with Next.js (App Router) and the Groq API. Streaming replies, code blocks with copy button, stop button and new-chat. The API key stays on the server and is never exposed to the browser.

Default model: `openai/gpt-oss-120b` (listed as available on Groq's free tier; change with the `GROQ_MODEL` env variable).

## Project structure

```
groq-chatbot/
├── app/
│   ├── api/chat/route.js   # server route that calls Groq (uses your API key)
│   ├── globals.css
│   ├── layout.js
│   └── page.js             # chat UI
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
└── README.md
```

## Run locally

1. Create a free API key at https://console.groq.com/keys
2. Install and configure:

```bash
npm install
cp .env.example .env.local
```

3. Open `.env.local` and set `GROQ_API_KEY=gsk_...`
4. Start:

```bash
npm run dev
```

Open http://localhost:3000

## Upload to GitHub

```bash
git init
git add .
git commit -m "Groq chatbot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/groq-chatbot.git
git push -u origin main
```

`.env.local` is in `.gitignore`, so your key is not uploaded.

## Deploy on Vercel

1. Go to https://vercel.com/new and import your GitHub repo.
2. Framework preset: Next.js (auto-detected).
3. Under **Environment Variables** add:
   - `GROQ_API_KEY` = your Groq key
   - `GROQ_MODEL` = `openai/gpt-oss-120b` (optional)
4. Click **Deploy**.

If you add or change env variables later, redeploy for them to take effect.

## Notes

- Never put the API key in client code or commit it to GitHub.
- Free-tier limits are per organization and strict (a few requests per minute and a daily cap). If you see a rate-limit message, wait a minute and retry. Check your limits at https://console.groq.com/settings/limits
- Groq retires models from time to time. If you get a "model not found" error, pick a current model from https://console.groq.com/docs/models and set `GROQ_MODEL`.
- Conversations live in browser memory only and clear on refresh.
