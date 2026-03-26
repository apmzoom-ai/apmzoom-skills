---
name: apm-goods
description: Search and query goods from APM Zoom platform via API
command: apm-goods
---

# APM Zoom Goods Query (v3 — Pure API)

Query goods from the APM Zoom e-commerce platform. All data fetched from remote API, no local database or LLM required.

## CLI Commands

```bash
# Search goods by keyword
python3 skills/apm-goods-query/src/apm-goods-query.py search "蓝色T恤"
python3 skills/apm-goods-query/src/apm-goods-query.py search "夹克" --page 2 --limit 10

# List goods with filters
python3 skills/apm-goods-query/src/apm-goods-query.py list --keyword T恤 --mark selling
python3 skills/apm-goods-query/src/apm-goods-query.py list --page 3 --limit 30 --format json

# Goods detail
python3 skills/apm-goods-query/src/apm-goods-query.py detail <goods_id>

# Category tree and origins
python3 skills/apm-goods-query/src/apm-goods-query.py categories [--flat]
python3 skills/apm-goods-query/src/apm-goods-query.py origins
```

## Cloudflare Worker API

Deployed at Cloudflare Workers. Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goods?q=keyword&page=1&limit=20` | Search/list goods |
| GET | `/api/goods/:id` | Goods detail |
| GET | `/api/categories` | Category tree |
| GET | `/api/origins` | Origin list |
| GET | `/api/health` | Health check |

## Environment Variables

- `APM_ACCOUNT` — Login account (set in Cloudflare Dashboard)
- `APM_PASSWORD` — Login password (set in Cloudflare Dashboard)
- `APM_API_BASE` — API base URL (default configured in wrangler.toml)

## Architecture

- **Data**: All from APM Zoom remote API (AWS API Gateway)
- **Auth**: Auto-login with token cached in Cloudflare KV (23h TTL)
- **Deployment**: Cloudflare Workers
