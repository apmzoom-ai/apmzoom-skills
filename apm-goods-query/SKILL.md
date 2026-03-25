---
name: apm-goods
description: Search and analyze goods from APM Zoom platform with AI (local LLM + vision model)
command: apm-goods
---

# APM Zoom Goods Query (v2)

AI-powered goods search and analysis for the APM Zoom e-commerce platform. Uses local SQLite database (27K+ goods), Qwen3-30B for text analysis, and minicpm-v for image recognition.

## Commands

```bash
# Quick stats
python3 skills/apm-goods-query/src/apm-goods-query.py stats

# AI natural language search (uses local LLM to parse intent + SQLite query)
python3 skills/apm-goods-query/src/apm-goods-query.py search "蓝色T恤"
python3 skills/apm-goods-query/src/apm-goods-query.py search "便宜的夹克 3万以下"
python3 skills/apm-goods-query/src/apm-goods-query.py search "高评分连衣裙"

# List with filters
python3 skills/apm-goods-query/src/apm-goods-query.py list --category T恤 --color 蓝 --format table
python3 skills/apm-goods-query/src/apm-goods-query.py list --min-price 20000 --max-price 50000 --limit 30
python3 skills/apm-goods-query/src/apm-goods-query.py list --store apMLuxe --mark selling

# Goods detail (auto vision analysis if not done yet)
python3 skills/apm-goods-query/src/apm-goods-query.py detail <goods_id>

# Deep analysis with local LLM
python3 skills/apm-goods-query/src/apm-goods-query.py analyze "T恤市场趋势分析"
python3 skills/apm-goods-query/src/apm-goods-query.py analyze "哪些店铺性价比最高"
python3 skills/apm-goods-query/src/apm-goods-query.py analyze "给我一份5000万韩币采购方案"

# Data sync and reference
python3 skills/apm-goods-query/src/apm-goods-query.py sync           # Re-sync all data from API
python3 skills/apm-goods-query/src/apm-goods-query.py categories      # Category tree
python3 skills/apm-goods-query/src/apm-goods-query.py origins         # Origin list
```

## Architecture

- **Data**: SQLite DB at `data/goods.db` (27K+ goods with vision tags)
- **Text LLM**: Qwen3-30B via oMLX (port 8000) for analysis and search parsing
- **Vision LLM**: minicpm-v:8b via Ollama (port 11434) for image color/style recognition
- **API**: AWS API Gateway for data sync
