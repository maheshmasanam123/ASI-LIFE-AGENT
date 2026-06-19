#!/bin/bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}🚀 Starting ASI Life Agent...${NC}"

# Kill existing processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "tsx agents/websocket-server" 2>/dev/null || true
pkill -f "tsx agents/orchestrator" 2>/dev/null || true
sleep 2

# Create log directory
mkdir -p logs

# Start WebSocket/Agent server
echo -e "${BLUE}Starting WebSocket/Agent server on port 3001...${NC}"
nohup npx tsx agents/websocket-server.ts > logs/agent.log 2>&1 &
AGENT_PID=$!
echo $AGENT_PID > .agent.pid
echo -e "${GREEN}Agent server started (PID: $AGENT_PID)${NC}"

# Wait for agent server
echo -e "${BLUE}Waiting for agent server...${NC}"
for i in {1..30}; do
    if lsof -ti :3001 >/dev/null 2>&1; then
        echo -e "${GREEN}Agent server ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Agent server failed to start. Check logs/agent.log${NC}"
        cat logs/agent.log
        exit 1
    fi
    sleep 1
done

# Start Next.js dashboard
echo -e "${BLUE}Starting Next.js dashboard on port 3000...${NC}"
nohup npm run dev > logs/next.log 2>&1 &
NEXT_PID=$!
echo $NEXT_PID > .next.pid
echo -e "${GREEN}Next.js started (PID: $NEXT_PID)${NC}"

# Wait for Next.js
echo -e "${BLUE}Waiting for Next.js dashboard...${NC}"
for i in {1..60}; do
    if curl -sf http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}Next.js dashboard ready!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}Next.js failed to start. Check logs/next.log${NC}"
        cat logs/next.log
        exit 1
    fi
    sleep 2
done

# Open browser
URL="http://localhost:3000"
echo -e "${GREEN}✅ ASI Life Agent is running!${NC}"
echo -e "${BLUE}Dashboard: ${URL}${NC}"
echo -e "${BLUE}WebSocket: http://localhost:3001${NC}"
echo -e "${BLUE}Logs: logs/next.log (Next.js), logs/agent.log (Agent)${NC}"

if command -v open >/dev/null 2>&1; then
    open "http://localhost:3000" 2>/dev/null || true
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:3000" 2>/dev/null || true
elif command -v start >/dev/null 2>&1; then
    start "http://localhost:3000" 2>/dev/null || true
else
    echo -e "${YELLOW}Could not auto-open browser. Please open http://localhost:3000 manually.${NC}"
fi

echo -e "${GREEN}🎉 ASI Life Agent is ready!${NC}"