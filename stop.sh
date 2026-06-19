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

echo -e "${BLUE}🛑 Stopping ASI Life Agent...${NC}"

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

# Stop by port
kill_port 3000
kill_port 3001

# Also kill by process name patterns
pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}Stopped Next.js dev server${NC}" || true
pkill -f "next-server" 2>/dev/null && echo -e "${GREEN}Stopped Next.js server${NC}" || true
pkill -f "tsx agents/orchestrator" 2>/dev/null && echo -e "${GREEN}Stopped orchestrator${NC}" || true
pkill -f "tsx agents/websocket-server" 2>/dev/null && echo -e "${GREEN}Stopped WebSocket server${NC}" || true

# Clean up PID files
rm -f .agent.pid .next.pid 2>/dev/null || true

# Wait a moment for processes to fully stop
sleep 2

echo -e "${GREEN}✅ ASI Life Agent stopped successfully${NC}"