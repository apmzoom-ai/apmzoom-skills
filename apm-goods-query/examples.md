# APM Goods Query — Examples

## Basic Search

Search for T-shirts:
```bash
curl -s "https://skiil.apmzoom.ai/api/goods?q=T恤&limit=5"
```

Search for jackets under ₩50,000:
```bash
curl -s "https://skiil.apmzoom.ai/api/goods?q=夹克&limit=10"
```

## Pagination

Get page 2, 30 items per page:
```bash
curl -s "https://skiil.apmzoom.ai/api/goods?page=2&limit=30"
```

## Filter by Status

Only selling items:
```bash
curl -s "https://skiil.apmzoom.ai/api/goods?is_sell=1&limit=10"
```

Only pending items:
```bash
curl -s "https://skiil.apmzoom.ai/api/goods?is_sell=0&limit=10"
```

## Get Goods Detail

```bash
curl -s "https://skiil.apmzoom.ai/api/goods/165177320329" | jq '{
  name: .goods_name,
  price: .sale_price,
  stock: .stock_count,
  store: .store_name,
  image: .goods_big_img
}'
```

## Browse Categories

```bash
curl -s "https://skiil.apmzoom.ai/api/categories" | jq '.[].goods_class_name'
```

Output:
```
"女装"
"男装"
"童装"
"鞋包饰品"
"男女通用"
```

## Python Usage

```python
import urllib.request, json

API = "https://skiil.apmzoom.ai"

# Search
resp = urllib.request.urlopen(f"{API}/api/goods?q=连衣裙&limit=5")
data = json.loads(resp.read())
for g in data["data"]:
    print(f'{g["goods_name"]}: ₩{g["sale_price"]}')
```

## JavaScript/Node.js Usage

```javascript
const resp = await fetch("https://skiil.apmzoom.ai/api/goods?q=T恤&limit=5");
const { data, total } = await resp.json();
console.log(`Found ${total} items`);
data.forEach(g => console.log(`${g.goods_name}: ₩${g.sale_price}`));
```

## Agent Integration

Any AI agent can call the API directly:

> Search APM Zoom for blue T-shirts:
> `GET https://skiil.apmzoom.ai/api/goods?q=蓝色T恤&limit=10`

> Get details for goods ID 165177320329:
> `GET https://skiil.apmzoom.ai/api/goods/165177320329`

> What categories are available?
> `GET https://skiil.apmzoom.ai/api/categories`
