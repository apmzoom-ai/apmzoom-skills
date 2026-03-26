# APM Goods Query — API Reference

Base URL: `https://skiil.apmzoom.ai`

## GET /api/goods

Search and list goods with filters.

**Parameters:**

| Name | In | Type | Default | Description |
|------|----|------|---------|-------------|
| q | query | string | `""` | Search keyword |
| page | query | int | `1` | Page number |
| limit | query | int | `20` | Items per page (max 200) |
| is_sell | query | int | `-1` | 1=selling, 0=pending, -1=all |
| goods_id | query | int | — | Filter by goods ID |

**Response:**
```json
{
  "total": 27166,
  "page": 1,
  "limit": 20,
  "data": [GoodsItem]
}
```

**GoodsItem fields:**

| Field | Type | Description |
|-------|------|-------------|
| goods_id | int | Unique ID |
| goods_name | string | Product name |
| goods_sn | string | Serial number |
| goods_class_name | string | Category name |
| sale_price | number | Price in KRW (₩) |
| discount_percent | number | Discount ratio |
| stock_count | int | Stock quantity |
| store_name | string | Store name |
| goods_thumb_img | string | Thumbnail URL |
| goods_big_img | string | Large image URL |
| is_sell | int | 1=selling, 0=pending |
| add_time | string | Listed date |

---

## GET /api/goods/:id

Get a single goods item by ID.

**Response:** Single GoodsItem object (same fields as above).

---

## GET /api/categories

List all goods categories (tree structure).

**Response:**
```json
[
  {
    "goods_class_id": 1,
    "goods_class_name": "女装",
    "ls_child": [
      {
        "goods_class_id": 10,
        "goods_class_name": "T恤",
        "ls_child": [...]
      }
    ]
  }
]
```

Top-level categories: 女装, 男装, 童装, 鞋包饰品, 男女通用

---

## GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-26T02:55:58.815Z"
}
```

---

## Error Responses

All errors return JSON:
```json
{
  "error": "Error message description"
}
```

| Status | Meaning |
|--------|---------|
| 404 | Goods ID not found |
| 405 | Method not allowed (only GET supported) |
| 500 | Internal server error |
| 502 | Upstream API error |

## Rate Limits

Cloudflare Workers free tier: 100,000 requests/day.
