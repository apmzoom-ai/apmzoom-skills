# APM Zoom Skills

AI Agent skills for the [APM Zoom](https://apmzoom.ai) Korean fashion e-commerce platform.

## apm-goods-query

Search and query **27,000+ Korean fashion goods** via REST API.

### Quick Test

```bash
curl -s "https://skiil.apmzoom.ai/api/goods?q=T恤&limit=3" | jq
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/goods?q=keyword&limit=20` | Search goods |
| `GET /api/goods/:id` | Goods detail |
| `GET /api/categories` | Category list |
| `GET /api/health` | Health check |

Base URL: `https://skiil.apmzoom.ai`

---

## Installation

### ClawHub

```bash
clawhub install apm-goods-query
```

### Claude Code (Skill)

Copy the skill folder to your Claude Code skills directory:

```bash
cp -r install/claude-code ~/.claude/skills/apm-goods-query
```

The `/apm-goods-query` slash command will be available immediately.

### MCP Server

1. Install dependencies:
```bash
cd install/mcp && npm install
```

2. Add to Claude Code settings (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "apm-goods": {
      "command": "node",
      "args": ["/absolute/path/to/install/mcp/mcp-server.js"]
    }
  }
}
```

Tools available: `search_goods`, `get_goods_detail`, `list_categories`

### Direct API

No installation needed. Any agent or application can call the REST API:

```bash
# Search
curl "https://skiil.apmzoom.ai/api/goods?q=连衣裙&limit=10"

# Detail
curl "https://skiil.apmzoom.ai/api/goods/165177320329"

# Categories
curl "https://skiil.apmzoom.ai/api/categories"
```

### Python CLI

```bash
python3 apm-goods-query/src/apm-goods-query.py search "T恤"
python3 apm-goods-query/src/apm-goods-query.py categories
```

Requires `APM_REFRESH_TOKEN` environment variable for authentication.

---

## Project Structure

```
apmzoom-skills/
├── apm-goods-query/          # Main skill package
│   ├── SKILL.md              # Skill definition (Agent Skills standard)
│   ├── skill.json            # Metadata
│   ├── reference.md          # API reference
│   ├── examples.md           # Usage examples
│   └── src/
│       └── apm-goods-query.py
├── install/
│   ├── claude-code/          # Claude Code skill install
│   │   └── SKILL.md
│   └── mcp/                  # MCP Server install
│       ├── mcp-server.js
│       └── package.json
├── worker/                   # Cloudflare Worker (API backend)
│   ├── src/
│   │   ├── index.ts
│   │   ├── apm-client.ts
│   │   └── types.ts
│   └── wrangler.toml
└── scripts/
    └── pre-commit            # Git hook for sensitive data protection
```

## Security

- Credentials managed via Cloudflare Secrets (never in code)
- Pre-commit hook blocks sensitive data from being committed
- `.gitguard` defines blocked patterns
- API is read-only (no write operations)

## License

MIT
