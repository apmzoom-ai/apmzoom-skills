const API_BASE = location.hostname === "localhost"
  ? "http://localhost:8787"
  : "";

let currentPage = 1;
const pageSize = 20;

// DOM
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const categoryFilter = document.getElementById("categoryFilter");
const minPrice = document.getElementById("minPrice");
const maxPrice = document.getElementById("maxPrice");
const sellFilter = document.getElementById("sellFilter");
const goodsGrid = document.getElementById("goodsGrid");
const statsBar = document.getElementById("totalCount");
const pagination = document.getElementById("pagination");
const detailModal = document.getElementById("detailModal");
const modalClose = document.getElementById("modalClose");
const detailBody = document.getElementById("detailBody");

// Init
loadCategories();
doSearch();

// Events
searchBtn.addEventListener("click", () => { currentPage = 1; doSearch(); });
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { currentPage = 1; doSearch(); }
});
categoryFilter.addEventListener("change", () => { currentPage = 1; doSearch(); });
sellFilter.addEventListener("change", () => { currentPage = 1; doSearch(); });
modalClose.addEventListener("click", () => detailModal.classList.remove("open"));
detailModal.addEventListener("click", (e) => {
  if (e.target === detailModal) detailModal.classList.remove("open");
});

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/goods/categories`);
    const json = await res.json();
    if (json.data) {
      flattenCategories(json.data).forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Failed to load categories:", e);
  }
}

function flattenCategories(items, result = []) {
  for (const item of items) {
    result.push(item.goods_class_name);
    if (item.ls_child) flattenCategories(item.ls_child, result);
  }
  return result;
}

async function doSearch() {
  goodsGrid.innerHTML = '<div class="loading">加载中...</div>';

  const q = searchInput.value.trim();
  const category = categoryFilter.value;
  const params = new URLSearchParams({
    page: currentPage,
    limit: pageSize,
  });

  if (q) params.set("q", q);
  if (category) params.set("q", (q ? q + " " : "") + category);

  const minP = minPrice.value;
  const maxP = maxPrice.value;
  const sell = sellFilter.value;
  if (sell !== "-1") params.set("isSell", sell);

  const endpoint = q || category ? "/api/goods/search" : "/api/goods/list";

  try {
    const res = await fetch(`${API_BASE}${endpoint}?${params}`);
    const json = await res.json();

    if (json.error) {
      goodsGrid.innerHTML = `<div class="empty">错误: ${json.error}</div>`;
      return;
    }

    let items = json.data || [];

    // Client-side price filter (API doesn't support price range directly)
    if (minP) items = items.filter((g) => g.price >= Number(minP));
    if (maxP) items = items.filter((g) => g.price <= Number(maxP));

    statsBar.textContent = `共 ${(json.total || 0).toLocaleString()} 件商品`;

    if (items.length === 0) {
      goodsGrid.innerHTML = '<div class="empty">未找到匹配商品</div>';
      pagination.innerHTML = "";
      return;
    }

    goodsGrid.innerHTML = items.map((g) => `
      <div class="goods-card" data-id="${g.id}">
        <img src="${g.thumb || g.image || ''}" alt="${g.name}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23f0f0f0%22 width=%221%22 height=%221%22/></svg>'">
        <div class="info">
          <div class="name">${g.name || g.sn || ''}</div>
          <div class="category">${g.category || ''}</div>
          <div class="price">₩${(g.price || 0).toLocaleString()}</div>
          <div class="store">${g.store || ''}</div>
        </div>
      </div>
    `).join("");

    // Card click -> detail
    goodsGrid.querySelectorAll(".goods-card").forEach((card) => {
      card.addEventListener("click", () => showDetail(card.dataset.id));
    });

    renderPagination(json.total || 0);
  } catch (e) {
    goodsGrid.innerHTML = `<div class="empty">请求失败: ${e.message}</div>`;
  }
}

function renderPagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) { pagination.innerHTML = ""; return; }

  let html = "";
  html += `<button ${currentPage <= 1 ? "disabled" : ""} data-page="${currentPage - 1}">上一页</button>`;

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button ${currentPage >= totalPages ? "disabled" : ""} data-page="${currentPage + 1}">下一页</button>`;
  pagination.innerHTML = html;

  pagination.querySelectorAll("button:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPage = Number(btn.dataset.page);
      doSearch();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

async function showDetail(id) {
  detailBody.innerHTML = '<div class="loading">加载中...</div>';
  detailModal.classList.add("open");

  try {
    const res = await fetch(`${API_BASE}/api/goods/${id}`);
    const json = await res.json();
    const g = json.data;

    if (!g) {
      detailBody.innerHTML = '<div class="empty">商品未找到</div>';
      return;
    }

    detailBody.innerHTML = `
      <img class="detail-image" src="${g.image || g.thumb || ''}" alt="${g.name}">
      <dl class="detail-info">
        <dt>商品名称</dt><dd>${g.name || g.sn}</dd>
        <dt>品类</dt><dd>${g.category}</dd>
        <dt>价格</dt><dd style="color:#e30000;font-weight:600">₩${(g.price || 0).toLocaleString()}</dd>
        <dt>库存</dt><dd>${g.stock}</dd>
        <dt>店铺</dt><dd>${g.store}</dd>
        <dt>商品ID</dt><dd>${g.id}</dd>
        <dt>状态</dt><dd>${g.isSell ? '在售' : '下架'}</dd>
      </dl>
    `;
  } catch (e) {
    detailBody.innerHTML = `<div class="empty">加载失败: ${e.message}</div>`;
  }
}
