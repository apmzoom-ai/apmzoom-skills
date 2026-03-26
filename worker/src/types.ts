export interface Env {
  APM_API_BASE: string;
  APM_ACCOUNT: string;
  APM_PASSWORD: string;
  APM_TOKEN?: string;  // Pre-configured token (fallback if login fails)
  TOKEN_CACHE: KVNamespace;
}

export interface TokenCache {
  token: string;
  expire: number;
}

export interface ApiResponse {
  code?: number;
  message?: string;
  result?: any;
}

export interface GoodsItem {
  goods_id: number;
  goods_name: string;
  goods_sn: string;
  goods_class_name: string;
  sale_price: number;
  discount_percent: number;
  stock_count: number;
  store_name: string;
  goods_thumb_img: string;
  goods_big_img: string;
  goods_source_img: string;
  is_sell: number;
  audit_state: number;
  add_time: string;
}

export interface GoodsListResult {
  data: GoodsItem[];
  total: number;
}

export interface CategoryItem {
  goods_class_id: number;
  goods_class_name: string;
  ls_child?: CategoryItem[];
}

export interface OriginItem {
  address_id?: number;
  make_address_id?: number;
  address_name?: string;
  make_address_name?: string;
}
