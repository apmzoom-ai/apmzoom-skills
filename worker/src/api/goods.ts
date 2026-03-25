import { apiRequest, getToken } from "../lib/apm-client";
import type {
  Env,
  GoodsListResult,
  CategoryItem,
  OriginItem,
} from "../lib/types";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function handleSearch(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 200);

  const token = await getToken(env);

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
    is_sell: -1,
    goods_name: q,
  };

  const resp = await apiRequest<GoodsListResult>(
    env,
    "GET",
    "/gds/admin/goodslist",
    "admin_list",
    { params, token }
  );

  if (!resp.result) {
    return json({ error: resp.message ?? "API error" }, 502);
  }

  return json({
    data: resp.result.data.map(formatGoods),
    total: resp.result.total,
    page,
    limit,
  });
}

export async function handleList(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 200);
  const category = url.searchParams.get("category") ?? "";
  const isSell = url.searchParams.get("isSell");

  const token = await getToken(env);

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
    is_sell: isSell !== null ? Number(isSell) : -1,
    goods_name: category,
  };

  const resp = await apiRequest<GoodsListResult>(
    env,
    "GET",
    "/gds/admin/goodslist",
    "admin_list",
    { params, token }
  );

  if (!resp.result) {
    return json({ error: resp.message ?? "API error" }, 502);
  }

  return json({
    data: resp.result.data.map(formatGoods),
    total: resp.result.total,
    page,
    limit,
  });
}

export async function handleDetail(
  _request: Request,
  env: Env,
  id: string
): Promise<Response> {
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
    goods_name: id,
  };

  const resp = await apiRequest<GoodsListResult>(
    env,
    "GET",
    "/gds/admin/goodslist",
    "admin_list",
    { params, token }
  );

  const item = resp.result?.data?.find(
    (g) => String(g.goods_id) === id || g.goods_sn === id
  );
  if (!item) {
    return json({ error: "Goods not found" }, 404);
  }

  return json({ data: formatGoods(item) });
}

export async function handleCategories(
  _request: Request,
  env: Env
): Promise<Response> {
  const token = await getToken(env);
  const resp = await apiRequest<CategoryItem[]>(
    env,
    "GET",
    "/gds/app/m_goodsclasslist",
    "categories",
    { token }
  );

  if (resp.code !== 100 || !resp.result) {
    return json({ error: resp.message ?? "API error" }, 502);
  }

  return json({ data: resp.result });
}

export async function handleOrigins(
  _request: Request,
  env: Env
): Promise<Response> {
  const token = await getToken(env);
  const resp = await apiRequest<OriginItem[]>(
    env,
    "GET",
    "/gds/app/m_goodsmakeaddresslist",
    "origins",
    { token }
  );

  if (resp.code !== 100 || !resp.result) {
    return json({ error: resp.message ?? "API error" }, 502);
  }

  return json({
    data: resp.result.map((o) => ({
      id: o.address_id ?? o.make_address_id,
      name: o.address_name ?? o.make_address_name,
    })),
  });
}

export async function handleStats(
  _request: Request,
  env: Env
): Promise<Response> {
  const token = await getToken(env);

  // Fetch first page to get total count
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
    goods_name: "",
  };

  const [goodsResp, catsResp] = await Promise.all([
    apiRequest<GoodsListResult>(env, "GET", "/gds/admin/goodslist", "admin_list", {
      params,
      token,
    }),
    apiRequest<CategoryItem[]>(env, "GET", "/gds/app/m_goodsclasslist", "categories", {
      token,
    }),
  ]);

  return json({
    totalGoods: goodsResp.result?.total ?? 0,
    totalCategories: catsResp.result?.length ?? 0,
  });
}

function formatGoods(g: Record<string, unknown>) {
  return {
    id: g.goods_id,
    name: g.goods_name,
    sn: g.goods_sn,
    category: g.goods_class_name,
    price: g.sale_price,
    discount: g.discount_percent,
    stock: g.stock_count,
    store: g.store_name,
    thumb: g.goods_thumb_img,
    image: g.goods_big_img,
    isSell: g.is_sell,
    addedAt: g.add_time,
  };
}
