# ASI Life Agent

An autonomous AI agent dashboard for life management. Built with Next.js 14, React 18, TypeScript, and a custom agent orchestration framework.

## Features

- **Autonomous Agent Orchestration** - Custom agent framework with continuous operation
- **Real-time Visual Dashboard** - Live agent status, task queue, system metrics, chat, approvals
- **13 Tool Categories** - File, Code, Web, Terminal, System, Communication, Analysis, Creative, Automation, Learning, Security, Deployment, Data
- **Approval Workflow** - Irreversible actions require user approval with preview and rollback plans
- **WebSocket Communication** - Real-time updates between agents and dashboard
- **Continuous Operation** - Agents run persistently with monitoring and auto-recovery

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development servers (Next.js + WebSocket)
npm run dev          # Frontend on http://localhost:3000
npm run agent:start  # Agent orchestrator + WebSocket on port 3001
```

### Production Quickstart
```bash
# 1. Clone and install
git clone <repo-url>
cd asi-life-agent
npm ci --only=production

# 2. Install optional heavy dependencies (for full tool coverage)
npm install canvas fluent-ffmpeg natural compromise sentiment nodemailer @slack/web-api twilio pdf-parse mammoth xlsx systeminformation cheerio node-pty

# 3. Configure production environment
cp .env.example .env.production
# Edit .env.production with your API keys and secrets

# 4. Build Next.js
npm run build

# 5. Start with PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### Docker
```bash
docker build -t asi-life-agent .
docker run -d --name asi-life-agent \
  -p 3000:3000 -p 3001:3001 \
  --env-file .env.production \
  asi-life-agent
```

## Project Structure

```
asi-life-agent/
├── agents/              # Agent orchestration & WebSocket server
├── core/                # Core agent framework
├── tools/               # 13 tool categories
├── types/               # Shared TypeScript types
├── ui/                  # Reusable UI components
├── src/
│   ├── app/             # Next.js App Router pages & API routes
│   ├── components/      # React components (dashboard, widgets)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities
│   └── styles/          # Global styles
└── public/              # Static assets
```

## Commands

```bash
npm run dev           # Start Next.js dev server (port 3000)
npm run build         # Production build
npm run start         # Run production server
npm run lint          # ESLint check
npm run typecheck     # TypeScript type check
npm run test          # Run unit tests (vitest)
npm run test:watch    # Watch mode for tests
npm run agent:start   # Start agent orchestrator + WebSocket (port 3001)
npm run agent:watch   # Watch mode for agent development
```

### PM2 Ecosystem Config
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'asi-nextjs',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
    {
      name: 'asi-websocket',
      script: 'npx',
      args: 'tsx agents/websocket-server.ts',
      env: { NODE_ENV: 'production', WS_PORT: 3001, NEXT_PUBLIC_APP_URL: 'https://your-domain.com' },
    },
  ],
};
```

## Tool Categories

| Category | Description |
|----------|-------------|
| **File** | Read, write, search, copy, move, archive files |
| **Code** | Execute, analyze, generate, test, lint, debug code |
| **Web** | Search, fetch, scrape, API calls, download |
| **Terminal** | Shell execution, PTY sessions, scripts |
| **System** | Metrics, processes, CPU, memory, disk, network |
| **Communication** | Email, Slack, Discord, SMS, push, webhooks |
| **Analysis** | Statistical, ML, NLP, vision, pattern matching |
| **Creative** | Image generation, video editing, design |
| **Automation** | Workflows, scheduling, triggers, RPA |
| **Learning** | Knowledge store, skill acquisition, model training |
| **Security** | Encryption, signing, key management, audit |
| **Deployment** | Cloud deploy, Kubernetes, Docker, CI/CD |
| **Data** | Query, transform, validate, convert, ETL |

## Architecture

### Agent Status Flow
```
idle → thinking → working → waiting_approval → completed
                      ↓
                   error / paused
```

### Task Reversibility
- **Reversible** - Auto-approved, can be undone
- **Semi-reversible** - Requires approval, partial rollback possible
- **Irreversible** - Requires explicit approval, manual rollback only

### WebSocket Events
- `agent.status` - Agent status changes
- `task.queued/complete/error` - Task lifecycle
- `approval.request/response` - Approval workflow
- `message.broadcast` - Chat messages
- `metrics` - System metrics

## Development

### Adding a New Tool

1. Create `tools/newtool.ts` exporting a `Tool` object
2. Register in `tools/registry.ts`
3. Add to `tools/index.ts` exports

### Adding a Dashboard Widget

1. Create `src/components/widgets/NewWidget.tsx`
2. Add to `widgetComponents` in `DashboardGrid.tsx`
3. Add widget type to `WidgetType` in `types/index.ts`

## Environment

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `OLLAMA_HOST` | Local Ollama endpoint | `http://localhost:11434` |
| `WS_PORT` | WebSocket server port | `3001` |
| `NEXT_PUBLIC_WS_URL` | Public WebSocket URL | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

### Optional (Communication Tools)
| Variable | Description |
|----------|-------------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email (SMTP) |
| `SLACK_BOT_TOKEN` | Slack Bot User OAuth Token |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | Twilio SMS |

### System
- Node.js 20+
- Working directory configurable via `UserPreferences.workingDirectory`

### Full Example
See `.env.example` for complete configuration template.

## License

MIT