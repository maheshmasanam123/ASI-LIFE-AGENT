#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}🚀 Starting ASI Life Agent...${NC}"

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Stopping process on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Stop existing processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
kill_port 3000
kill_port 3001

# Also kill by process name patterns
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx agents/orchestrator" 2>/dev/null || true
pkill -f "tsx agents/websocket-server" 2>/dev/null || true
sleep 2

# Ensure log directory exists
mkdir -p logs

# Start WebSocket/Agent server
echo -e "${BLUE}Starting WebSocket/Agent server on port 3001...${NC}"
nohup npx tsx agents/websocket-server.ts > logs/agent.log 2>&1 &
AGENT_PID=$!
echo $AGENT_PID > .agent.pid
echo -e "${GREEN}Agent server started (PID: $AGENT_PID)${NC}"

# Wait for agent server to be ready
echo -e "${BLUE}Waiting for agent server to be ready...${NC}"
for i in {1..30}; do
    # Check if port 3001 is listening (WebSocket server)
    if lsof -ti :3001 >/dev/null 2>&1; then
        echo -e "${GREEN}Agent server is ready!${NC}"
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

# Wait for Next.js to be ready
echo -e "${BLUE}Waiting for Next.js dashboard to be ready...${NC}"
for i in {1..60}; do
    if curl -sf http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}Next.js dashboard is ready!${NC}"
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

# Open browser based on OS
if command -v open >/dev/null 2>&1; then
    # macOS
    open "$URL" 2>/dev/null || true
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open "$URL" 2>/dev/null || true
elif command -v start >/dev/null 2>&1; then
    # Windows (Git Bash/WSL)
    start "$URL" 2>/dev/null || true
else
    echo -e "${YELLOW}Could not auto-open browser. Please open $URL manually.${NC}"
fi

echo -e "${GREEN}🎉 ASI Life Agent is ready!${NC}"