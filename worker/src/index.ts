import type { Env, GoodsListResult } from './types';
import { apiRequest, getToken } from './apm-client';

// ── CORS headers ──

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(message: string, status = 500): Response {
  return json({ error: message }, status);
}

// ── Route Handlers ──

async function handleGoods(url: URL, env: Env): Promise<Response> {
  const token = await getToken(env);

  const q = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 200);
  const isSell = url.searchParams.get('is_sell');
  const goodsId = url.searchParams.get('goods_id');

  const params: Record<string, string | number> = {
    page,
    page_size: limit,
    merchant_store_id: -1,
    publish_user_id: -1,
    publish_type_id: -1,
    audit_state: -1,
    currency_type_id: -1,
    first_goods_class_id: -1,
    second_goods_class_id: -1,
    third_goods_class_id: -1,
    db_mark: 2026,
    start_time: -1,
    end_tiem: -1,
    make_address_id: -1,
    is_sell: isSell !== null ? parseInt(isSell) : -1,
    goods_name: q,
  };

  if (goodsId) {
    params.goods_id = parseInt(goodsId);
  }

  const resp = await apiRequest(env, 'GET', '/gds/admin/goodslist', 'admin_list', {
    params,
    token,
  });

  if (resp.code && resp.code !== 100 && resp.code !== 200) {
    return error(resp.message || 'API error', 502);
  }

  const result = resp.result as GoodsListResult | undefined;
  return json({
    total: result?.total || 0,
    page,
    limit,
    data: result?.data || [],
  });
}

async function handleGoodsDetail(id: string, env: Env): Promise<Response> {
  const token = await getToken(env);

  const params: Record<string, string | number> = {
    page: 1,
    page_size: 1,
    merchant_store_id: -1,
    publish_user_id: -1,
    publish_type_id: -1,
    audit_state: -1,
    currency_type_id: -1,
    first_goods_class_id: -1,
    second_goods_class_id: -1,
    third_goods_class_id: -1,
    db_mark: 2026,
    start_time: -1,
    end_tiem: -1,
    make_address_id: -1,
    is_sell: -1,
    goods_name: '',
    goods_id: parseInt(id),
  };

  const resp = await apiRequest(env, 'GET', '/gds/admin/goodslist', 'admin_list', {
    params,
    token,
  });

  const items = (resp.result as GoodsListResult)?.data || [];
  if (items.length === 0) {
    return error(`Goods ID ${id} not found`, 404);
  }

  return json(items[0]);
}

async function handleCategories(env: Env): Promise<Response> {
  const token = await getToken(env);
  const resp = await apiRequest(env, 'GET', '/gds/app/m_goodsclasslist', 'categories', { token });

  if (resp.code !== 100) {
    return error(resp.message || 'Failed to fetch categories', 502);
  }

  return json(resp.result || []);
}

async function handleOrigins(env: Env): Promise<Response> {
  const token = await getToken(env);
  const resp = await apiRequest(env, 'GET', '/gds/app/m_goodsmakeaddresslist', 'origins', { token });

  if (resp.code !== 100) {
    return error(resp.message || 'Failed to fetch origins', 502);
  }

  return json(resp.result || []);
}

// ── Router ──

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // /api/health
      if (path === '/api/health') {
        return json({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // /api/goods/:id
      const detailMatch = path.match(/^\/api\/goods\/(\d+)$/);
      if (detailMatch) {
        return await handleGoodsDetail(detailMatch[1], env);
      }

      // /api/goods
      if (path === '/api/goods') {
        return await handleGoods(url, env);
      }

      // /api/categories
      if (path === '/api/categories') {
        return await handleCategories(env);
      }

      // /api/origins
      if (path === '/api/origins') {
        return await handleOrigins(env);
      }

      // Root
      if (path === '/' || path === '') {
        return json({
          name: 'APM Zoom Skills API',
          version: '0.1.0',
          endpoints: [
            'GET /api/goods?q=keyword&page=1&limit=20',
            'GET /api/goods/:id',
            'GET /api/categories',
            'GET /api/origins',
            'GET /api/health',
          ],
        });
      }

      return error('Not found', 404);

    } catch (e: any) {
      return error(e.message || 'Internal server error', 500);
    }
  },
};
