# ASI Life Agent - Agent Instructions

## Project Overview
Next.js 14 + React 18 + TypeScript dashboard for an autonomous AI agent system. Features custom agent orchestration, real-time visual dashboard, tool integration layer, and approval workflow for irreversible actions.

## Commands
```bash
npm run dev           # Start Next.js dev server (port 3000)
npm run build         # Production build
npm run start         # Run production server
npm run lint          # ESLint check
npm run typecheck     # TypeScript type check (tsc --noEmit)
npm run agent:start   # Start agent orchestrator (tsx agents/orchestrator.ts)
npm run agent:watch   # Watch mode for agent development
```

## Architecture
- **Frontend**: Next.js App Router in `src/app/`, components in `, components in `src/components/`
- **Agent Core**: Custom orchestration in `agents/ `, shared logic in `core/`
- **Tools**: System integrations in `tools/ ` (file, code, web, terminal, etc.)
- **Types**: All shared types in `types/index.ts`
- **UI**: Reusable dashboard widgets in `ui/`
- **State**: Zustand for client state, Socket.io for real-time agent communication

## Key Conventions
- **Path aliases**: `@/*`, `@agents/*`, `@tools/*`, `@core/*`, `@ui/*`, `@types/*`
- **UUIDs**: Branded string type (`UUID`) from `types/index.ts`, generate via `createUUID()`
- **Agent status**: `idle | thinking | working | waiting_approval | completed | error | paused`
- **Task reversibility**: `reversible | irreversible | semi_reversible` — irreversible requires user approval
- **WebSocket events**: Typed via `AgentEvent`, `ToolEvent`, `SystemEvent` in types

## Development Notes
- All directories (`agents/`, `core/`, `tools/`, `ui/`, `src/app/`, etc.) are currently empty scaffolds
- No tests configured yet — add vitest/jest when implementing
- `node-pty` requires native compilation; webpack externals configured in `next.config.js`
- Agent orchestrator entry point: `agents/orchestrator.ts` (not yet created)
- Dashboard widgets defined in `types/index.ts` as `WidgetType`

## Environment
- Requires Node.js 20+
- Optional: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_HOST` for LLM providers
- Working directory configurable via `UserPreferences.workingDirectory`

## Verification Order
Always run: `npm run lint && npm run typecheck && npm run build` before committing