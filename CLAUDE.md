# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TikTok Ads Analysis - AI-powered TikTok advertising performance analysis platform that provides automated insights, strategies, and creative fatigue monitoring.

## Commands

```bash
# Development
npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production (runs prisma generate first)
npm run lint             # Run ESLint

# Database
npm run db:migrate       # Create and apply migrations (prisma migrate dev)
npm run db:push          # Push schema changes without migration (prisma db push)
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Generate Prisma client

# Type checking
npx tsc --noEmit --skipLibCheck
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI GPT-4o with Zod schema validation
- **External APIs**: TikTok Business API (OAuth 2.0)

### Project Structure

```
src/
├── app/
│   ├── api/                    # API routes (Next.js App Router)
│   │   ├── auth/tiktok/        # TikTok OAuth flow
│   │   ├── accounts/           # Account & metrics management
│   │   ├── ai/                 # AI insights & strategies
│   │   │   ├── insights/       # Account/Campaign level insights
│   │   │   └── strategies/     # Account/Campaign level strategies
│   │   ├── creatives/          # Creative management & analysis
│   │   ├── jobs/               # Cron jobs (daily-insights, anomaly-detection)
│   │   └── seed/               # Sample data generation
│   └── (dashboard)/            # Dashboard pages (route group)
│       └── accounts/[accountId]/  # Account dashboard with campaigns
├── lib/
│   ├── db/prisma.ts            # Prisma client singleton
│   ├── tiktok/                 # TikTok API integration
│   │   ├── client.ts           # API client with rate limiting (10 req/sec)
│   │   └── auth.ts             # OAuth helpers
│   ├── ai/                     # AI analysis modules
│   │   ├── client.ts           # OpenAI wrapper with JSON mode
│   │   ├── modules/            # Insight/Strategy generators
│   │   ├── prompts/            # Prompt templates
│   │   ├── schemas/            # Zod schemas for AI responses
│   │   └── fallback.ts         # Rule-based fallback when AI unavailable
│   └── analytics/              # Business logic
│       ├── fatigue-calculator.ts  # Creative fatigue scoring
│       └── creative-scorer.ts     # Creative performance scoring
└── components/
    ├── ui/                     # shadcn base components
    ├── layout/                 # Sidebar, Header
    ├── dashboard/              # KPI cards, charts, tables
    ├── ai/                     # Insight/Strategy cards
    ├── creatives/              # Creative analysis components
    ├── filters/                # Date picker, search, filters
    └── onboarding/             # Setup guide
```

### API Pattern

All API routes follow this pattern:
- `GET /api/{resource}/[id]` - Get single item
- `GET /api/{resource}` - List items with pagination
- `POST /api/{resource}` - Create/action
- Response format: `{ success: boolean, data?: any, error?: { code, message } }`

### Database Schema (Key Models)

- **Account**: TikTok ad account with OAuth tokens
- **Campaign → AdGroup → Ad → Creative**: Ad hierarchy
- **PerformanceMetric**: Multi-level metrics (ACCOUNT/CAMPAIGN/ADGROUP/AD/CREATIVE)
- **AIInsight**: Generated insights (types: DAILY_SUMMARY, ANOMALY, TREND, CREATIVE, PREDICTION)
- **AIStrategy**: Action recommendations (types: BUDGET, CAMPAIGN, TARGETING, CREATIVE, BIDDING)
- **CreativeFatigue**: Creative fatigue index with trend prediction

### AI Integration

1. **Insight Generation** (`/api/ai/insights/[accountId]/generate`):
   - Collects 7-day metrics, top creatives, campaign data
   - Sends to GPT-4o with structured prompt
   - Validates response with Zod schema
   - Falls back to rule-based analysis if API unavailable

2. **Strategy Generation** (`/api/ai/strategies/[accountId]/generate`):
   - Analyzes performance data and insights
   - Generates actionable strategies with expected impact
   - Priority: HIGH/MEDIUM/LOW, Difficulty: EASY/MEDIUM/HARD

3. **Fallback Mode** (`lib/ai/fallback.ts`):
   - Works without OPENAI_API_KEY
   - Rule-based insights based on metric changes
   - Used by `/api/seed/insights` for sample data

### Cron Jobs (Vercel)

Configured in `vercel.json`:
- `/api/jobs/daily-insights`: Daily at 00:00 UTC (09:00 KST)
- `/api/jobs/anomaly-detection`: Every 6 hours

## Environment Variables

```env
DATABASE_URL=             # PostgreSQL connection string
TIKTOK_APP_ID=           # TikTok Business API app ID
TIKTOK_APP_SECRET=       # TikTok Business API secret
OPENAI_API_KEY=          # OpenAI API key (optional, has fallback)
CRON_SECRET=             # Secret for cron job authentication
NEXTAUTH_SECRET=         # NextAuth session secret
```

## bkit Integration

This project uses [bkit](https://github.com/popup-studio-ai/bkit-claude-code) for PDCA workflow:
- Plan documents: `docs/01-plan/features/`
- Design documents: `docs/02-design/features/`
- Analysis reports: `docs/03-analysis/`
- Completion reports: `docs/04-report/features/`

Use `/pdca status` to check current feature status.
