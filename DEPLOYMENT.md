# ASI Life Agent - Production Deployment Guide

## Overview
This guide covers deploying the ASI Life Agent to production environments.

## System Requirements

### Required System Packages
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y \
  ffmpeg \
  build-essential \
  python3 \
  python3-pip \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  \
 
  libgif-dev \
  librsvg2-dev

# macOS
brew install ffmpeg python3 pkg-config cairo pango libpng jpeg giflib librsvg
```

### Node.js Requirements
- Node.js 20.x LTS
- npm 10.x

## Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key for LLM | `sk-ant-...` |
| `OLLAMA_HOST` | Local Ollama endpoint | `http://localhost:11434` |
| `WS_PORT` | WebSocket server port | `3001` |
| `NEXT_PUBLIC_WS_URL` | Public WebSocket URL | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

### Optional (for communication tools)
| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server (e.g., smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From email address |
| `SLACK_BOT_TOKEN` | Slack Bot User OAuth Token |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL |
| `TWILIO_SID` | Twilio Account SID |
| `TWILIO_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM` | Twilio phone number |

## Deployment Methods

### Method 1: PM2 (Recommended for VPS)

#### 1. Install PM2
```bash
npm install -g pm2
```

#### 2. Create ecosystem config
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'asi-nextjs',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/asi-life-agent',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'asi-websocket',
      script: 'npx',
      args: 'tsx agents/websocket-server.ts',
      cwd: '/path/to/asi-life-agent',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 3001,
        NEXT_PUBLIC_APP_URL: 'https://your-domain.com',
      },
    },
  ],
};
EOF
```

#### 3. Start services
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Method 2: systemd (Linux)

#### 1. Create service files
```bash
# Next.js app
sudo tee /etc/systemd/system/asi-nextjs.service << 'EOF'
[Unit]
Description=ASI Life Agent Next.js
After=network.target

[Service]
Type=simple
User=asi
WorkingDirectory=/opt/asi-life-agent
ExecStart=/usr/bin/npm start
Environment=NODE_ENV=production
Environment=PORT=3000
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# WebSocket server
sudo tee /etc/systemd/system/asi-websocket.service << 'EOF'
[Unit]
Description=ASI Life Agent WebSocket
After=network.target

[Service]
Type=simple
User=asi
WorkingDirectory=/opt/asi-life-agent
ExecStart=/usr/bin/npx tsx agents/websocket-server.ts
Environment=NODE_ENV=production
Environment=WS_PORT=3001
Environment=NEXT_PUBLIC_APP_URL=https://your-domain.com
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

#### 2. Enable and start
```bash
sudo systemctl daemon-reload
sudo systemctl enable asi-nextjs asi-websocket
sudo systemctl start asi-nextjs asi-websocket
sudo systemctl status asi-nextjs asi-websocket
```

### Method 3: Docker

#### 1. Create Dockerfile
```dockerfile
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
  ffmpeg \
  build-base \
  python3 \
  pkgconfig \
  cairo-dev \
  pango-dev \
  jpeg-dev \
  giflib-dev \
  librsvg-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000 3001

# Start both services
CMD ["sh", "-c", "npm run agent:start & npm start"]
```

#### 2. Build and run
```bash
docker build -t asi-life-agent .
docker run -d \
  --name asi-life-agent \
  -p 3000:3000 \
  -p 3001:3001 \
  --env-file .env.production \
  asi-life-agent
```

### Method 4: Vercel (Frontend) + Railway/Render (WebSocket)

#### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

#### WebSocket Server (Railway/Render)
1. Create new Web Service
2. Set build command: `npm install`
3. Set start command: `npx tsx agents/websocket-server.ts`
4. Add environment variables
4. Deploy

## Health Checks

### API Health Endpoint
```
GET /api/health
```

Response:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "total": 45,
    "healthy": 40,
    "degraded": 3,
    "unhealthy": 2,
    "details": [...]
  }
}
```

### WebSocket Health
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
  http://localhost:3001/socket.io/?EIO=4&transport=websocket
```

## Monitoring

### Log Aggregation
```bash
# PM2 logs
pm2 logs asi-nextjs
pm2 logs asi-websocket

# systemd logs
journalctl -u asi-nextjs -f
journalctl -u asi-websocket -f

# Docker logs
docker logs -f asi-life-agent
```

### Metrics Collection
The app exposes metrics via WebSocket `metrics` event. Subscribe to collect:
- CPU/memory usage
- Task queue depth
- Active agent count
- Approval queue depth

### Recommended: Prometheus + Grafana
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'asi-life-agent'
    static_configs:
      - targets: ['localhost:3000', 'localhost:3001']
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `canvas` build fails | Missing Cairo/Pango | Install system packages |
| `node-pty` fails | Missing build tools | `npm install -g node-gyp` |
| WebSocket connection fails | Firewall/CORS | Check `NEXT_PUBLIC_WS_URL` and firewall |
| Agent tasks stuck | WebSocket disconnected | Check WebSocket server logs |
| Approvals not working | WebSocket events not reaching | Check CORS origin in websocket-server.ts |

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
LOG_LEVEL=debug npm run agent:start
```

### Performance Tuning
- Increase `maxConcurrentTasks` in agent config for high throughput
- Use Redis for session/memory persistence at scale
- Enable gzip compression in Next.js config
- Use CDN for static assets

## Security Checklist

- [ ] All API keys in environment variables (not code)
- [ ] HTTPS enforced in production
- [ ] WebSocket CORS restricted to your domain
- [ ] Rate limiting on API routes
- [ ] Approval workflow tested for irreversible actions
- [ ] Database backups configured (if using persistence)
- [ ] Secrets rotated regularly
- [ ] Dependencies scanned for vulnerabilities (`npm audit`)

## Backup & Recovery

### WebSocket Server State
The orchestrator maintains in-memory state. For persistence:
1. Implement Redis-backed state store
2. Or schedule periodic state dumps

### Next.js App
Static build is immutable. Recovery = redeploy.

## Rollback Procedure
```bash
# PM2
pm2 stop asi-nextjs asi-websocket
git checkout previous-tag
npm ci --only=production
npm run build
pm2 start ecosystem.config.js

# systemd
sudo systemctl stop asi-nextjs asi-websocket
git checkout previous-tag
npm ci --only=production
npm run build
sudo systemctl start asi-nextjs asi-websocket

# Docker
docker stop asi-life-agent
docker run -d --name asi-life-agent-previous asi-life-agent:previous-tag
```