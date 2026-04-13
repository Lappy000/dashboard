# GBC Analytics Dashboard

Mini-dashboard for order analytics. RetailCRM + Supabase + Next.js + Telegram Bot.

## Architecture

```
RetailCRM (orders) --> sync script --> Supabase (database)
                                          |
                                     Next.js Dashboard (Vercel)
                                          |
                                     Telegram Bot (alerts > 50K KZT)
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Accounts: RetailCRM (demo), Supabase, Vercel, Telegram Bot

### Step 0: Configure Environment

1. Copy `.env.example` to `.env`
2. Fill in ALL values in `.env`

### Step 1: Create Supabase Table

1. Go to your Supabase project > SQL Editor
2. Paste and run the contents of `supabase_schema.sql`

### Step 2: Upload Orders to RetailCRM

```bash
cd scripts
pip install -r requirements.txt
python upload_to_retailcrm.py
```

### Step 3: Sync RetailCRM to Supabase

```bash
python sync_retailcrm_to_supabase.py
```

OR for quick testing (skip RetailCRM, load directly):

```bash
python load_mock_to_supabase.py
```

### Step 4: Deploy Dashboard to Vercel

```bash
cd dashboard
npm install
npm run dev
```

For Vercel: push to GitHub, import in Vercel, set env vars, deploy.

### Step 5: Start Telegram Bot

```bash
cd scripts
python telegram_bot.py
```

## Prompts Used (AI Assistant)

1. Project scaffolding with full RetailCRM/Supabase/Next.js/Telegram integration
2. Supabase schema with RLS policies
3. Dashboard with KPI cards and Recharts charts
4. Telegram bot with polling and auto chat-id detection

## Tech Stack

Python, Next.js 14, TypeScript, Recharts, Supabase, RetailCRM API v5, Telegram Bot API, Vercel
