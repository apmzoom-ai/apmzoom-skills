---
name: apm-goods-query
description: Search and query 27K+ goods from APM Zoom Korean fashion e-commerce platform
allowed-tools:
  - Bash
  - WebFetch
---

# APM Zoom Goods Query

Query Korean fashion goods from APM Zoom platform (27,000+ items).

## API Base

`https://skiil.apmzoom.ai`

## Available Actions

### Search Goods
```bash
curl -s "https://skiil.apmzoom.ai/api/goods?q=KEYWORD&page=1&limit=20" | jq
```

Parameters: `q` (keyword), `page`, `limit` (max 200), `is_sell` (1=selling, 0=pending, -1=all)

### Get Goods Detail
```bash
curl -s "https://skiil.apmzoom.ai/api/goods/GOODS_ID" | jq
```

### List Categories
```bash
curl -s "https://skiil.apmzoom.ai/api/categories" | jq
```

Categories: 女装, 男装, 童装, 鞋包饰品, 男女通用

## Response Fields

Each goods item contains: `goods_id`, `goods_name`, `goods_class_name`, `sale_price` (KRW), `stock_count`, `store_name`, `goods_thumb_img`, `goods_big_img`, `is_sell`, `add_time`

## Instructions

When the user asks about Korean fashion goods, APM Zoom products, or e-commerce product search:
1. Use the search endpoint to find matching goods
2. Present results in a clear table format
3. Include product images when relevant
4. Prices are in Korean Won (₩)
