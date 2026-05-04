const API = 'http://127.0.0.1:8000/api';

// ============ STATE ============
let state = {
  user: null,
  cart: null,
  currentPage: 'home',
  shopFilters: { brand: '', category: '', min_price: '', max_price: '', condition: '', in_stock: false, search: '', ordering: '-created_at' },
  shopPage: 1,
  shopTotal: 0,
  searchTimer: null,
  allBrands: [],
  allCategories: [],
  detailPhone: null,
  detailQty: 1,
};

// Load user from localStorage
function loadSession() {
  try {
    const u = localStorage.getItem('pv_user');
    if (u) state.user = JSON.parse(u);
  } catch(e) { clearSession(); }
}
function saveSession() {
  localStorage.setItem('pv_user', JSON.stringify(state.user));
}
function clearSession() {
  state.user = null;
  localStorage.removeItem('pv_user');
}

// ============ API HELPERS ============
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const method = options.method || 'GET';
  if (method !== 'GET') {
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken;
    }
  }
  try {
    const res = await fetch(`${API}${endpoint}`, { ...options, headers, credentials: 'include' });
    if (res.status === 204) return {};
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, data };
    return data;
  } catch(err) {
    if (err.data) throw err;
    console.error('Network error:', err);
    throw { status: 0, data: { detail: 'Network error. Is the Django server running?' } };
  }
}
function getError(err) {
  const d = err.data || {};
  if (typeof d === 'string') return d;
  const vals = Object.values(d);
  if (vals.length === 0) return 'An error occurred';
  const first = vals[0];
  if (Array.isArray(first)) return first[0];
  return first;
}

// ============ TOAST ============
let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3500);
}

// ============ LOADER ============
function hideLoader() {
  setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 600);
}

// ============ PAGE ROUTING ============
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`page-${name}`);
  if (el) el.classList.add('active');
  state.currentPage = name;
  closeDropdown();
  closeMobileMenu();

  // Update active nav link
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === name);
  });

  // Load page data
  if (name === 'shop') loadShopPage();
  if (name === 'cart') loadCart();
  if (name === 'checkout') loadCheckoutSummary();
  if (name === 'orders') loadOrders();
  if (name === 'wishlist') loadWishlist();
  if (name === 'profile') loadProfile();
  if (name === 'admin-panel') { loadAdminPhones(); loadAdminOrders(); loadBrandsSelect(); loadCategoriesSelect(); }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ NAVBAR ============
function updateNavbar() {
  const loggedIn = !!state.user;
  document.getElementById('authBtns').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('userMenu').style.display = loggedIn ? 'flex' : 'none';
  document.getElementById('navOrders').style.display = loggedIn ? 'inline' : 'none';
  document.getElementById('navAdmin').style.display = (loggedIn && state.user?.is_staff) ? 'inline' : 'none';
  if (state.user) {
    const name = state.user.first_name || state.user.username || 'U';
    document.getElementById('userInitial').textContent = name[0].toUpperCase();
    document.getElementById('dropdownName').textContent = `${state.user.first_name || ''} ${state.user.last_name || ''}`.trim() || state.user.username;
  }
}
function toggleDropdown() {
  document.getElementById('dropdown').classList.toggle('show');
}
function closeDropdown() {
  document.getElementById('dropdown').classList.remove('show');
}
function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('mobile-open');
}
function closeMobileMenu() {
  document.getElementById('navLinks').classList.remove('mobile-open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-avatar') && !e.target.closest('.dropdown')) closeDropdown();
});

// ============ MODALS ============
function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }
function switchModal(from, to) { closeModal(from); showModal(to); }

// ============ AUTH ============
async function loginUser() {
  const username = document.getElementById('login_user').value.trim();
  const password = document.getElementById('login_pass').value;
  if (!username || !password) return toast('Enter username and password', 'error');
  try {
    // Fetch CSRF token to set cookie
    await apiFetch('/auth/csrf/');
    const data = await apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.user = data.user;
    saveSession();
    updateNavbar();
    closeModal('loginModal');
    toast(`Welcome back, ${data.user.first_name || data.user.username}!`);
    loadCartBadge();
    if (state.currentPage === 'home') loadHomeData();
  } catch(err) { toast(getError(err), 'error'); }
}

async function registerUser() {
  const d = {
    username: document.getElementById('reg_user').value.trim(),
    email: document.getElementById('reg_email').value.trim(),
    password: document.getElementById('reg_pass').value,
    password2: document.getElementById('reg_pass2').value,
    first_name: document.getElementById('reg_first').value.trim(),
    last_name: document.getElementById('reg_last').value.trim(),
  };
  if (!d.username || !d.email || !d.password) return toast('Fill in required fields', 'error');
  if (d.password !== d.password2) return toast('Passwords do not match', 'error');
  try {
    // Fetch CSRF token to set cookie
    await apiFetch('/auth/csrf/');
    const data = await apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(d) });
    state.user = data.user;
    saveSession();
    updateNavbar();
    closeModal('registerModal');
    toast(`Welcome, ${data.user.first_name || data.user.username}!`);
    loadCartBadge();
    if (state.currentPage === 'home') loadHomeData();
  } catch(err) { toast(getError(err), 'error'); }
}

async function logout() {
  await apiFetch('/auth/logout/', { method: 'POST' }).catch(() => {});
  clearSession();
  updateNavbar();
  toast('Logged out');
  showPage('home');
  document.getElementById('cartBadge').textContent = '0';
}

// ============ HOME PAGE ============
async function loadHomeData() {
  try {
    const [phones, brands, featured] = await Promise.all([
      apiFetch('/phones/?page_size=1'),
      apiFetch('/brands/'),
      apiFetch('/phones/featured/'),
    ]);
    // Stats
    animateCount('statPhones', phones.count || 0);
    animateCount('statBrands', Array.isArray(brands) ? brands.length : (brands.results?.length || 0));

    // Brands strip
    const brandList = Array.isArray(brands) ? brands : (brands.results || []);
    state.allBrands = brandList;
    const scroll = document.getElementById('brandsScroll');
    scroll.innerHTML = brandList.map(b =>
      `<div class="brand-chip" onclick="filterByBrand('${b.slug}')">${b.name}</div>`
    ).join('');

    // Featured
    renderPhoneGrid('featuredGrid', featured.results || featured, 4);

    // Latest
    const latest = await apiFetch('/phones/?ordering=-created_at&page_size=8');
    renderPhoneGrid('latestGrid', latest.results || latest, 8);
  } catch(err) {
    console.error('Home load error:', err);
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.ceil(target / 30);
  const t = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(t);
  }, 40);
}

function filterByBrand(slug) {
  state.shopFilters.brand = slug;
  showPage('shop');
}

function scrollToFeatured() {
  document.getElementById('featuredSection')?.scrollIntoView({ behavior: 'smooth' });
}

// ============ PHONE CARD RENDERER ============
function phoneCardHTML(phone) {
  const price = parseFloat(phone.effective_price || phone.price);
  const origPrice = phone.discount_price ? parseFloat(phone.price) : null;
  const inStock = phone.in_stock !== false && phone.stock > 0;
  const imgSrc = phone.image_url || phone.image;
  const img = imgSrc ? `<img src="${imgSrc}" alt="${phone.name}" loading="lazy" onerror="this.style.display='none'"/>` : '📱';
  const stars = phone.avg_rating ? `<span class="stars">${'★'.repeat(Math.round(phone.avg_rating))}</span> ${phone.avg_rating}` : '';
  return `
    <div class="phone-card" onclick="openDetail('${phone.slug}')">
      <div class="card-image">
        ${img}
        ${phone.is_featured ? '<span class="card-badge">FEATURED</span>' : ''}
        ${phone.discount_price ? '<span class="card-badge discount">SALE</span>' : ''}
        ${!inStock ? '<span class="card-badge oos">OUT OF STOCK</span>' : ''}
        <div class="card-actions">
          <button class="card-action-btn" onclick="event.stopPropagation();toggleWishlist(${phone.id})" title="Wishlist">♡</button>
          ${inStock ? `<button class="card-action-btn" onclick="event.stopPropagation();quickAddCart(${phone.id})" title="Add to Cart">🛒</button>` : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="card-brand">${phone.brand_name || ''}</div>
        <div class="card-name">${phone.name}</div>
        <div class="card-specs">
          ${phone.ram ? `<span class="spec-tag">${phone.ram}</span>` : ''}
          ${phone.storage ? `<span class="spec-tag">${phone.storage}</span>` : ''}
          ${phone.condition !== 'new' ? `<span class="spec-tag">${phone.condition}</span>` : ''}
        </div>
        <div class="card-footer">
          <div class="card-price">
            <span class="price-main">PKR ${price.toLocaleString()}</span>
            ${origPrice ? `<span class="price-original">PKR ${origPrice.toLocaleString()}</span>` : ''}
          </div>
          <div class="card-rating">${stars}</div>
        </div>
      </div>
    </div>`;
}

function renderPhoneGrid(gridId, phones, limit = null) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const list = limit ? phones.slice(0, limit) : phones;
  if (!list || list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📱</div><h3>No Phones Found</h3><p>Try adjusting your filters</p></div>`;
    return;
  }
  grid.innerHTML = list.map(phoneCardHTML).join('');
}

// ============ SHOP PAGE ============
async function loadShopPage() {
  const f = state.shopFilters;
  let url = `/phones/?page=${state.shopPage}&ordering=${f.ordering}`;
  if (f.search) url += `&search=${encodeURIComponent(f.search)}`;
  if (f.brand) url += `&brand=${f.brand}`;
  if (f.category) url += `&category=${f.category}`;
  if (f.min_price) url += `&min_price=${f.min_price}`;
  if (f.max_price) url += `&max_price=${f.max_price}`;
  if (f.condition) url += `&condition=${f.condition}`;
  if (f.in_stock) url += `&in_stock=true`;

  document.getElementById('shopGrid').innerHTML = Array(6).fill('<div class="phone-card skeleton"></div>').join('');

  try {
    const data = await apiFetch(url);
    const phones = data.results || data;
    state.shopTotal = data.count || phones.length;
    document.getElementById('resultsCount').textContent = state.shopTotal;
    renderPhoneGrid('shopGrid', phones);
    renderPagination(data.count, data.next, data.previous);
  } catch(err) {
    document.getElementById('shopGrid').innerHTML = `<div class="empty-state"><p>Failed to load phones. Check if Django is running.</p></div>`;
  }

  // Load brand & category filters
  if (state.allBrands.length === 0) {
    const brands = await apiFetch('/brands/').catch(() => []);
    state.allBrands = Array.isArray(brands) ? brands : (brands.results || []);
    const cats = await apiFetch('/categories/').catch(() => []);
    state.allCategories = Array.isArray(cats) ? cats : (cats.results || []);
    renderFilterChips();
  }
}

function renderFilterChips() {
  const bf = document.getElementById('brandFilters');
  bf.innerHTML = state.allBrands.map(b =>
    `<button class="chip ${state.shopFilters.brand === b.slug ? 'active' : ''}" 
      onclick="selectBrand(this,'${b.slug}')">${b.name}</button>`
  ).join('');
  const cf = document.getElementById('categoryFilters');
  cf.innerHTML = state.allCategories.map(c =>
    `<button class="chip ${state.shopFilters.category === c.slug ? 'active' : ''}"
      onclick="selectCategory(this,'${c.slug}')">${c.name}</button>`
  ).join('');
}

function selectBrand(el, slug) {
  state.shopFilters.brand = (state.shopFilters.brand === slug) ? '' : slug;
  el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (state.shopFilters.brand) el.classList.add('active');
  state.shopPage = 1; loadShopPage();
}
function selectCategory(el, slug) {
  state.shopFilters.category = (state.shopFilters.category === slug) ? '' : slug;
  el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (state.shopFilters.category) el.classList.add('active');
  state.shopPage = 1; loadShopPage();
}
function selectCondition(el, val) {
  state.shopFilters.condition = val;
  el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  state.shopPage = 1; loadShopPage();
}
function applyFilters() {
  state.shopFilters.min_price = document.getElementById('minPrice').value;
  state.shopFilters.max_price = document.getElementById('maxPrice').value;
  state.shopFilters.in_stock = document.getElementById('inStockOnly').checked;
  state.shopFilters.ordering = document.getElementById('sortSelect').value;
  state.shopPage = 1; loadShopPage();
}
function debounceSearch() {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    state.shopFilters.search = document.getElementById('searchInput').value.trim();
    state.shopPage = 1; loadShopPage();
  }, 400);
}
function resetFilters() {
  state.shopFilters = { brand: '', category: '', min_price: '', max_price: '', condition: '', in_stock: false, search: '', ordering: '-created_at' };
  document.getElementById('searchInput').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('inStockOnly').checked = false;
  document.getElementById('sortSelect').value = '-created_at';
  document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.filter-chips .chip[data-condition=""]').forEach(c => c.classList.add('active'));
  state.shopPage = 1; loadShopPage();
}
function toggleSidebar() {
  document.getElementById('shopSidebar').classList.toggle('open');
}
function renderPagination(total, next, prev) {
  const pg = document.getElementById('pagination');
  if (!total || total <= 10) { pg.innerHTML = ''; return; }
  const pages = Math.ceil(total / 10);
  let html = '';
  if (prev) html += `<button onclick="goPage(${state.shopPage - 1})">← Prev</button>`;
  for (let i = Math.max(1, state.shopPage - 2); i <= Math.min(pages, state.shopPage + 2); i++) {
    html += `<button class="${i === state.shopPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (next) html += `<button onclick="goPage(${state.shopPage + 1})">Next →</button>`;
  pg.innerHTML = html;
}
function goPage(n) { state.shopPage = n; loadShopPage(); window.scrollTo({top: 64, behavior:'smooth'}); }

// ============ PHONE DETAIL ============
async function openDetail(slug) {
  showPage('detail');
  document.getElementById('detailContainer').innerHTML = '<div class="empty-state"><div class="loader-ring" style="margin:auto"></div></div>';
  try {
    const phone = await apiFetch(`/phones/${slug}/`);
    state.detailPhone = phone;
    state.detailQty = 1;
    renderDetail(phone);
  } catch(err) {
    document.getElementById('detailContainer').innerHTML = `<div class="empty-state"><p>Failed to load phone details.</p></div>`;
  }
}

function renderDetail(p) {
  const price = parseFloat(p.effective_price || p.price);
  const origPrice = p.discount_price ? parseFloat(p.price) : null;
  const inStock = p.in_stock !== false && p.stock > 0;
  const imgSrc = p.image_url || p.image;
  const img = imgSrc ? `<img src="${imgSrc}" alt="${p.name}" onerror="this.style.display='none'"/>` : '📱';
  const specs = [
    { k: 'RAM', v: p.ram }, { k: 'Storage', v: p.storage },
    { k: 'Battery', v: p.battery }, { k: 'Display', v: p.display_size },
    { k: 'Camera', v: p.camera }, { k: 'Processor', v: p.processor },
    { k: 'OS', v: p.os }, { k: 'Color', v: p.color },
  ].filter(s => s.v);
  const avgRating = p.avg_rating || (p.reviews?.length ? (p.reviews.reduce((a,r)=>a+r.rating,0)/p.reviews.length).toFixed(1) : null);
  const reviews = p.reviews || [];

  document.getElementById('detailContainer').innerHTML = `
    <span class="detail-back" onclick="history.back()">← Back</span>
    <div class="detail-layout">
      <div class="detail-image-box">${img}</div>
      <div class="detail-info">
        <div class="detail-brand">${p.brand_name || ''}</div>
        <div class="detail-name">${p.name}</div>
        ${avgRating ? `<div class="detail-rating"><span class="stars">${'★'.repeat(Math.round(avgRating))}</span> ${avgRating} (${reviews.length} reviews)</div>` : ''}
        <div class="detail-price-box">
          <span class="detail-price">PKR ${price.toLocaleString()}</span>
          ${origPrice ? `<span class="detail-original">PKR ${origPrice.toLocaleString()}</span>` : ''}
        </div>
        <div class="detail-condition">${p.condition?.toUpperCase() || 'NEW'}</div>
        ${specs.length ? `
        <div class="detail-specs-grid">
          ${specs.map(s => `<div class="spec-item"><div class="spec-key">${s.k}</div><div class="spec-val">${s.v}</div></div>`).join('')}
        </div>` : ''}
        ${inStock ? `
        <div class="detail-qty">
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(-1)">−</button>
            <input class="qty-val" id="detailQtyInput" type="number" value="1" min="1" max="${p.stock}" onchange="state.detailQty=parseInt(this.value)||1" />
            <button class="qty-btn" onclick="changeQty(1)">+</button>
          </div>
          <span style="color:var(--text-muted);font-size:0.85rem">${p.stock} in stock</span>
        </div>
        <div class="detail-actions">
          <button class="btn btn-primary btn-lg" onclick="addToCartDetail()">Add to Cart 🛒</button>
          <button class="btn btn-outline" onclick="toggleWishlist(${p.id})">♡ Wishlist</button>
        </div>` : `<div style="color:var(--danger);font-weight:600;margin-top:1rem">Out of Stock</div>`}
      </div>
    </div>
    <div class="detail-description">
      <h3>Description</h3>
      <p>${p.description || 'No description available.'}</p>
    </div>
    <div class="reviews-section">
      <div class="section-header" style="margin-top:2rem">
        <div class="section-tag">COMMUNITY</div>
        <h2 class="section-title">Reviews</h2>
        ${state.user ? `<button class="btn btn-outline" onclick="openReviewModal(${p.id})">Write Review</button>` : ''}
      </div>
      ${reviews.length ? reviews.map(r => `
        <div class="review-card">
          <div class="review-header">
            <span class="review-user">${r.user_name}</span>
            <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <div class="review-title"><span class="stars">${'★'.repeat(r.rating)}</span> ${r.title}</div>
          <div class="review-comment">${r.comment}</div>
          ${state.user && (state.user.username === r.user_name || state.user.is_staff) ?
            `<div style="margin-top:0.5rem"><button class="btn btn-sm btn-danger" onclick="deleteReview(${r.id})">Delete</button></div>` : ''}
        </div>`).join('') :
        '<div class="empty-state" style="padding:2rem"><p>No reviews yet. Be the first!</p></div>'
      }
    </div>`;
}

function changeQty(delta) {
  state.detailQty = Math.max(1, Math.min(state.detailQty + delta, state.detailPhone?.stock || 99));
  document.getElementById('detailQtyInput').value = state.detailQty;
}

async function addToCartDetail() {
  if (!state.user) { showModal('loginModal'); return; }
  await addToCart(state.detailPhone.id, state.detailQty);
}

async function quickAddCart(phoneId) {
  if (!state.user) { showModal('loginModal'); return; }
  await addToCart(phoneId, 1);
}

// ============ CART ============
async function addToCart(phoneId, qty = 1) {
  try {
    await apiFetch('/cart/add/', { method: 'POST', body: JSON.stringify({ phone: phoneId, quantity: qty }) });
    toast('Added to cart! 🛒');
    loadCartBadge();
  } catch(err) { toast(getError(err), 'error'); }
}

async function loadCartBadge() {
  if (!state.user) { document.getElementById('cartBadge').textContent = '0'; return; }
  try {
    const cart = await apiFetch('/cart/');
    document.getElementById('cartBadge').textContent = cart.total_items || 0;
    state.cart = cart;
  } catch {}
}

async function loadCart() {
  if (!state.user) {
    document.getElementById('cartItems').innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><h3>Login Required</h3><p>Please login to view your cart</p><button class="btn btn-primary" onclick="showModal('loginModal')">Login</button></div>`;
    document.getElementById('cartSummary').innerHTML = '';
    return;
  }
  try {
    const cart = await apiFetch('/cart/');
    state.cart = cart;
    renderCart(cart);
  } catch(err) {
    document.getElementById('cartItems').innerHTML = `<div class="empty-state"><p>Failed to load cart.</p></div>`;
  }
}

function renderCart(cart) {
  const items = cart.items || [];
  const cartEl = document.getElementById('cartItems');
  if (items.length === 0) {
    cartEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><h3>Cart is Empty</h3><p>Browse our collection and add phones!</p><button class="btn btn-primary" onclick="showPage('shop')">Shop Now</button></div>`;
    document.getElementById('cartSummary').innerHTML = '';
    return;
  }
  cartEl.innerHTML = items.map(item => {
    const phone = item.phone_detail || {};
    const price = parseFloat(phone.effective_price || phone.price || 0);
    const subtotal = price * item.quantity;
    const imgSrc = phone.image_url || phone.image;
    return `
      <div class="cart-item">
        <div class="cart-item-img">${imgSrc ? `<img src="${imgSrc}" alt="${phone.name}" onerror="this.style.display='none'"/>` : '📱'}</div>
        <div>
          <div class="cart-item-name">${phone.name || 'Unknown'}</div>
          <div class="cart-item-price">PKR ${price.toLocaleString()} each</div>
          <div class="qty-control" style="margin-top:0.5rem">
            <button class="qty-btn" onclick="updateCartItem(${phone.id}, ${item.quantity - 1})">−</button>
            <input class="qty-val" type="number" value="${item.quantity}" min="0" max="${phone.stock}" 
              onchange="updateCartItem(${phone.id}, parseInt(this.value))" />
            <button class="qty-btn" onclick="updateCartItem(${phone.id}, ${item.quantity + 1})">+</button>
          </div>
        </div>
        <div class="cart-item-controls">
          <div class="cart-item-subtotal">PKR ${subtotal.toLocaleString()}</div>
          <button class="cart-remove" onclick="removeCartItem(${phone.id})">✕ Remove</button>
        </div>
      </div>`;
  }).join('');

  const subtotal = parseFloat(cart.total_price || 0);
  const shipping = subtotal >= 5000 ? 0 : 200;
  const total = subtotal + shipping;
  document.getElementById('cartSummary').innerHTML = `
    <div class="cart-summary-card">
      <h3>Order Summary</h3>
      <div class="summary-row"><span>Subtotal (${cart.total_items} items)</span><span>PKR ${subtotal.toLocaleString()}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--success)">FREE</span>' : 'PKR ' + shipping}</span></div>
      ${shipping > 0 ? `<div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:0.5rem">Add PKR ${(5000-subtotal).toLocaleString()} more for free shipping</div>` : ''}
      <div class="summary-row total"><span>Total</span><span>PKR ${total.toLocaleString()}</span></div>
      <button class="btn btn-primary btn-full btn-lg" style="margin-top:1rem" onclick="showPage('checkout')">Proceed to Checkout →</button>
      <button class="btn btn-ghost btn-full" style="margin-top:0.5rem" onclick="clearCart()">Clear Cart</button>
    </div>`;
}

async function updateCartItem(phoneId, qty) {
  if (qty < 1) { removeCartItem(phoneId); return; }
  try {
    await apiFetch('/cart/update_item/', { method: 'PUT', body: JSON.stringify({ phone: phoneId, quantity: qty }) });
    loadCart(); loadCartBadge();
  } catch(err) { toast(getError(err), 'error'); }
}

async function removeCartItem(phoneId) {
  try {
    await apiFetch('/cart/remove_item/', { method: 'DELETE', body: JSON.stringify({ phone: phoneId }) });
    toast('Removed from cart');
    loadCart(); loadCartBadge();
  } catch(err) { toast(getError(err), 'error'); }
}

async function clearCart() {
  try {
    await apiFetch('/cart/clear/', { method: 'DELETE' });
    toast('Cart cleared');
    loadCart(); loadCartBadge();
  } catch(err) { toast(getError(err), 'error'); }
}

// ============ CHECKOUT ============
function loadCheckoutSummary() {
  if (!state.user) { showPage('cart'); return; }
  if (!state.cart) { loadCartBadge().then(() => loadCheckoutSummary()); return; }
  // Pre-fill user data
  if (state.user) {
    document.getElementById('co_name').value = `${state.user.first_name||''} ${state.user.last_name||''}`.trim() || state.user.username;
    document.getElementById('co_email').value = state.user.email || '';
    if (state.user.profile) {
      document.getElementById('co_phone').value = state.user.profile.phone_number || '';
      document.getElementById('co_city').value = state.user.profile.city || '';
      document.getElementById('co_address').value = state.user.profile.address || '';
      document.getElementById('co_postal').value = state.user.profile.postal_code || '';
      document.getElementById('co_state').value = state.user.profile.state || '';
    }
  }
  // Cart summary
  const cart = state.cart;
  const subtotal = parseFloat(cart.total_price || 0);
  const shipping = subtotal >= 5000 ? 0 : 200;
  const total = subtotal + shipping;
  const items = cart.items || [];
  document.getElementById('checkoutSummary').innerHTML = `
    <div class="cart-summary-card">
      <h3>Order Summary</h3>
      ${items.map(i => `
        <div class="summary-row">
          <span>${(i.phone_detail?.name || 'Phone')} ×${i.quantity}</span>
          <span>PKR ${parseFloat(i.subtotal||0).toLocaleString()}</span>
        </div>`).join('')}
      <div class="summary-row" style="margin-top:0.5rem"><span>Subtotal</span><span>PKR ${subtotal.toLocaleString()}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : 'PKR ' + shipping}</span></div>
      <div class="summary-row total"><span>Total</span><span>PKR ${total.toLocaleString()}</span></div>
    </div>`;
}

async function placeOrder() {
  const body = {
    full_name: document.getElementById('co_name').value.trim(),
    email: document.getElementById('co_email').value.trim(),
    phone_number: document.getElementById('co_phone').value.trim(),
    city: document.getElementById('co_city').value.trim(),
    address: document.getElementById('co_address').value.trim(),
    postal_code: document.getElementById('co_postal').value.trim(),
    state: document.getElementById('co_state').value.trim(),
    notes: document.getElementById('co_notes').value.trim(),
    payment_method: document.querySelector('input[name="payment"]:checked')?.value || 'cod',
    country: 'Pakistan',
  };
  if (!body.full_name || !body.email || !body.phone_number || !body.city || !body.address || !body.postal_code) {
    return toast('Please fill all required fields', 'error');
  }
  try {
    const order = await apiFetch('/orders/', { method: 'POST', body: JSON.stringify(body) });
    toast(`Order #${order.order_number} placed! 🎉`);
    loadCartBadge();
    showPage('orders');
  } catch(err) { toast(getError(err), 'error'); }
}

// ============ ORDERS ============
async function loadOrders() {
  if (!state.user) {
    document.getElementById('ordersList').innerHTML = `<div class="empty-state"><h3>Login Required</h3><button class="btn btn-primary" onclick="showModal('loginModal')">Login</button></div>`;
    return;
  }
  try {
    const data = await apiFetch('/orders/');
    const orders = data.results || data;
    const el = document.getElementById('ordersList');
    if (!orders.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><h3>No Orders Yet</h3><p>Start shopping to place your first order</p><button class="btn btn-primary" onclick="showPage('shop')">Shop Now</button></div>`;
      return;
    }
    el.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <div class="order-number">${o.order_number}</div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.2rem">${o.full_name} · ${o.city}</div>
          </div>
          <span class="order-status status-${o.status}">${o.status}</span>
        </div>
        <div class="order-items-preview">
          ${(o.items||[]).map(i => `<span class="order-item-preview">${i.phone_name} ×${i.quantity}</span>`).join('')}
        </div>
        <div class="order-footer">
          <div>
            <div class="order-total">PKR ${parseFloat(o.total_amount).toLocaleString()}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${o.payment_method.toUpperCase()} · ${o.is_paid ? '✓ Paid' : 'Unpaid'}</div>
          </div>
          <div style="text-align:right">
            <div class="order-date">${new Date(o.created_at).toLocaleDateString()}</div>
            ${['pending','confirmed'].includes(o.status) ? `<button class="btn btn-sm btn-danger" onclick="cancelOrder(${o.id})">Cancel</button>` : ''}
          </div>
        </div>
      </div>`).join('');
  } catch(err) {
    document.getElementById('ordersList').innerHTML = `<div class="empty-state"><p>Failed to load orders.</p></div>`;
  }
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  try {
    await apiFetch(`/orders/${id}/`, { method: 'DELETE' });
    toast('Order cancelled');
    loadOrders();
  } catch(err) { toast(getError(err), 'error'); }
}

// ============ WISHLIST ============
async function loadWishlist() {
  if (!state.user) {
    document.getElementById('wishlistGrid').innerHTML = `<div class="empty-state"><h3>Login Required</h3><button class="btn btn-primary" onclick="showModal('loginModal')">Login</button></div>`;
    return;
  }
  try {
    const data = await apiFetch('/wishlist/');
    const items = data.results || data;
    const grid = document.getElementById('wishlistGrid');
    grid.style.padding = '0 2rem 2rem';
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">♡</div><h3>Wishlist is Empty</h3><p>Save phones you love!</p><button class="btn btn-primary" onclick="showPage('shop')">Browse</button></div>`;
      return;
    }
    grid.innerHTML = items.map(item => {
      const phone = item.phone_detail;
      if (!phone) return '';
      const imgSrc = phone.image_url || phone.image;
      return `<div class="phone-card" onclick="openDetail('${phone.slug}')">
        <div class="card-image">${imgSrc ? `<img src="${imgSrc}" alt="${phone.name}" onerror="this.style.display='none'"/>` : '📱'}
          <div class="card-actions">
            <button class="card-action-btn" onclick="event.stopPropagation();removeWishlist(${item.id})" title="Remove">✕</button>
          </div>
        </div>
        <div class="card-body">
          <div class="card-brand">${phone.brand_name||''}</div>
          <div class="card-name">${phone.name}</div>
          <div class="card-footer">
            <div class="card-price"><span class="price-main">PKR ${parseFloat(phone.effective_price||phone.price).toLocaleString()}</span></div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch { document.getElementById('wishlistGrid').innerHTML = `<div class="empty-state"><p>Failed to load wishlist.</p></div>`; }
}

async function toggleWishlist(phoneId) {
  if (!state.user) { showModal('loginModal'); return; }
  try {
    await apiFetch('/wishlist/', { method: 'POST', body: JSON.stringify({ phone: phoneId }) });
    toast('Added to wishlist ♡');
  } catch(err) {
    const msg = getError(err);
    if (msg.includes('Already')) toast('Already in wishlist', 'error');
    else toast(msg, 'error');
  }
}

async function removeWishlist(id) {
  try {
    await apiFetch(`/wishlist/${id}/`, { method: 'DELETE' });
    toast('Removed from wishlist');
    loadWishlist();
  } catch(err) { toast(getError(err), 'error'); }
}

// ============ REVIEWS ============
function openReviewModal(phoneId) {
  if (!state.user) { showModal('loginModal'); return; }
  document.getElementById('reviewPhoneId').value = phoneId;
  document.getElementById('reviewRating').value = 0;
  document.getElementById('reviewTitle').value = '';
  document.getElementById('reviewComment').value = '';
  setRating(0);
  showModal('reviewModal');
}
function setRating(val) {
  document.getElementById('reviewRating').value = val;
  document.querySelectorAll('#starPicker span').forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}
async function submitReview() {
  const phoneId = document.getElementById('reviewPhoneId').value;
  const rating = parseInt(document.getElementById('reviewRating').value);
  const title = document.getElementById('reviewTitle').value.trim();
  const comment = document.getElementById('reviewComment').value.trim();
  if (!rating) return toast('Please select a rating', 'error');
  if (!title || !comment) return toast('Fill in all fields', 'error');
  try {
    await apiFetch('/reviews/', { method: 'POST', body: JSON.stringify({ phone: phoneId, rating, title, comment }) });
    toast('Review submitted! ★');
    closeModal('reviewModal');
    if (state.detailPhone) openDetail(state.detailPhone.slug);
  } catch(err) { toast(getError(err), 'error'); }
}
async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  try {
    await apiFetch(`/reviews/${id}/`, { method: 'DELETE' });
    toast('Review deleted');
    if (state.detailPhone) openDetail(state.detailPhone.slug);
  } catch(err) { toast(getError(err), 'error'); }
}

// ============ PROFILE ============
async function loadProfile() {
  if (!state.user) return;
  try {
    const user = await apiFetch('/auth/me/');
    state.user = user; saveSession(); updateNavbar();
    document.getElementById('profileAvatar').textContent = (user.first_name || user.username || 'U')[0].toUpperCase();
    document.getElementById('profileName').textContent = `${user.first_name||''} ${user.last_name||''}`.trim() || user.username;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileBadge').style.display = user.is_staff ? 'inline-block' : 'none';
    document.getElementById('p_first').value = user.first_name || '';
    document.getElementById('p_last').value = user.last_name || '';
    document.getElementById('p_email').value = user.email || '';
    if (user.profile) {
      document.getElementById('p_phone').value = user.profile.phone_number || '';
      document.getElementById('p_city').value = user.profile.city || '';
      document.getElementById('p_postal').value = user.profile.postal_code || '';
      document.getElementById('p_address').value = user.profile.address || '';
    }
  } catch {}
}

async function updateProfile() {
  const body = {
    first_name: document.getElementById('p_first').value.trim(),
    last_name: document.getElementById('p_last').value.trim(),
    email: document.getElementById('p_email').value.trim(),
    profile: {
      phone_number: document.getElementById('p_phone').value.trim(),
      city: document.getElementById('p_city').value.trim(),
      postal_code: document.getElementById('p_postal').value.trim(),
      address: document.getElementById('p_address').value.trim(),
    }
  };
  try {
    const user = await apiFetch('/auth/profile/', { method: 'PATCH', body: JSON.stringify(body) });
    toast('Profile updated! ✓');
    state.user = { ...state.user, ...user };
    saveSession(); updateNavbar();
  } catch(err) { toast(getError(err), 'error'); }
}

async function changePassword() {
  const old_password = document.getElementById('p_old_pass').value;
  const new_password = document.getElementById('p_new_pass').value;
  const new_password2 = document.getElementById('p_new_pass2').value;
  if (!old_password || !new_password) return toast('Fill in all password fields', 'error');
  if (new_password !== new_password2) return toast('New passwords do not match', 'error');
  try {
    await apiFetch('/auth/change-password/', { method: 'POST', body: JSON.stringify({ old_password, new_password, new_password2 }) });
    toast('Password changed! ✓');
    document.getElementById('p_old_pass').value = '';
    document.getElementById('p_new_pass').value = '';
    document.getElementById('p_new_pass2').value = '';
  } catch(err) { toast(getError(err), 'error'); }
}

// ============ ADMIN PANEL ============
function switchAdminTab(name, btn) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`admin-${name}`).classList.add('active');
  btn.classList.add('active');
  if (name === 'phones') loadAdminPhones();
  if (name === 'brands') loadAdminBrands();
  if (name === 'categories') loadAdminCategories();
  if (name === 'orders-admin') loadAdminOrders();
}

async function loadAdminPhones() {
  try {
    const data = await apiFetch('/phones/?page_size=100');
    const phones = data.results || data;
    document.getElementById('adminPhonesBody').innerHTML = phones.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.brand_name || ''}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--accent)">PKR ${parseFloat(p.price).toLocaleString()}</td>
        <td><span style="color:${p.stock>0?'var(--success)':'var(--danger)'}">${p.stock}</span></td>
        <td>${p.is_featured ? '<span style="color:var(--accent)">★ Yes</span>' : 'No'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editPhone('${p.slug}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deletePhone('${p.slug}','${p.name}')">Del</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-dim)">No phones yet</td></tr>';
  } catch { toast('Failed to load phones', 'error'); }
}

async function loadAdminBrands() {
  try {
    const data = await apiFetch('/brands/');
    const brands = Array.isArray(data) ? data : (data.results || []);
    document.getElementById('adminBrandsBody').innerHTML = brands.map(b => `
      <tr>
        <td style="font-weight:600">${b.name}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--text-dim)">${b.slug}</td>
        <td>${b.phone_count || 0}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editBrand('${b.slug}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteBrand('${b.slug}','${b.name}')">Del</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">No brands yet</td></tr>';
  } catch {}
}

async function loadAdminCategories() {
  try {
    const data = await apiFetch('/categories/');
    const cats = Array.isArray(data) ? data : (data.results || []);
    document.getElementById('adminCatsBody').innerHTML = cats.map(c => `
      <tr>
        <td style="font-weight:600">${c.name}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--text-dim)">${c.slug}</td>
        <td>${c.phone_count || 0}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editCategory('${c.slug}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCategory('${c.slug}','${c.name}')">Del</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">No categories yet</td></tr>';
  } catch {}
}

async function loadAdminOrders() {
  try {
    const data = await apiFetch('/orders/');
    const orders = data.results || data;
    document.getElementById('adminOrdersBody').innerHTML = orders.map(o => `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--accent)">${o.order_number}</td>
        <td>${o.user_name || ''}</td>
        <td style="font-family:'JetBrains Mono',monospace">PKR ${parseFloat(o.total_amount).toLocaleString()}</td>
        <td><span class="order-status status-${o.status}">${o.status}</span></td>
        <td style="color:var(--text-dim);font-size:0.8rem">${new Date(o.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="viewOrderDetail(${o.id})" title="View Details">👁</button>
          <select onchange="updateOrderStatus(${o.id}, this.value); this.value='${o.status}'" style="font-size:0.8rem;padding:0.3rem">
            <option value="" disabled selected>Change...</option>
            ${['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map(s =>
              `<option value="${s}" ${o.status===s?'':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-dim)">No orders</td></tr>';
  } catch {}
}

async function viewOrderDetail(orderId) {
  try {
    const order = await apiFetch(`/orders/${orderId}/`);
    document.getElementById('detailOrderNumber').textContent = `Order #${order.order_number}`;
    
    const items = order.items || [];
    const itemsHtml = items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--border-color)">
        <div>
          <div style="font-weight:600">${item.phone_name}</div>
          <div style="font-size:0.85rem;color:var(--text-muted)">Qty: ${item.quantity}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace">PKR ${parseFloat(item.subtotal).toLocaleString()}</div>
          <div style="font-size:0.85rem;color:var(--text-muted)">${item.quantity} × PKR ${parseFloat(item.unit_price).toLocaleString()}</div>
        </div>
      </div>`).join('');
    
    const content = `
      <div style="padding:1.5rem;display:grid;gap:1.5rem">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <div>
            <h4 style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">CUSTOMER INFO</h4>
            <div style="font-weight:600">${order.full_name}</div>
            <div style="color:var(--text-muted);font-size:0.9rem">${order.email}</div>
            <div style="color:var(--text-muted);font-size:0.9rem">${order.phone_number}</div>
          </div>
          <div>
            <h4 style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">SHIPPING ADDRESS</h4>
            <div>${order.address}</div>
            <div>${order.city}${order.state ? ', ' + order.state : ''} ${order.postal_code}</div>
          </div>
        </div>
        
        <div>
          <h4 style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">ORDER ITEMS</h4>
          ${itemsHtml}
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;border-top:2px solid var(--border-color);padding-top:1.5rem">
          <div>
            <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">PAYMENT INFO</div>
            <div style="font-weight:600;margin-bottom:0.3rem">${order.payment_method.toUpperCase()}</div>
            <div style="color:${order.is_paid ? 'var(--success)' : 'var(--danger)'}">
              ${order.is_paid ? '✓ Paid' : '✗ Unpaid'}
            </div>
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">ORDER SUMMARY</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:1.3rem;color:var(--accent)">
              PKR ${parseFloat(order.total_amount).toLocaleString()}
            </div>
            <div style="color:var(--text-muted);font-size:0.85rem">Status: <span class="order-status status-${order.status}">${order.status}</span></div>
          </div>
        </div>
        
        <div>
          <label style="display:block;color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">UPDATE STATUS</label>
          <select id="detailStatusSelect" onchange="updateOrderStatus(${order.id}, this.value); loadAdminOrders()" style="padding:0.5rem;font-size:0.9rem;width:100%;max-width:200px">
            ${['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map(s =>
              `<option value="${s}" ${order.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        
        ${order.notes ? `<div style="background:var(--bg-secondary);padding:1rem;border-radius:0.5rem">
          <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">NOTES</div>
          <div>${order.notes}</div>
        </div>` : ''}
        
        <div style="text-align:right;padding-top:1rem;border-top:1px solid var(--border-color)">
          <div style="color:var(--text-muted);font-size:0.85rem">Ordered on ${new Date(order.created_at).toLocaleString()}</div>
        </div>
      </div>
    `;
    
    document.getElementById('orderDetailContent').innerHTML = content;
    showModal('orderDetailModal');
  } catch(err) {
    toast(getError(err), 'error');
  }
}

async function updateOrderStatus(id, status) {
  try {
    await apiFetch(`/orders/${id}/update_status/`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Order status updated → ${status}`);
    loadAdminOrders();
  } catch(err) { toast(getError(err), 'error'); }
}

// Brand selects for phone form
async function loadBrandsSelect() {
  const brands = Array.isArray(state.allBrands) && state.allBrands.length ? state.allBrands : await apiFetch('/brands/').catch(()=>[]);
  const cats = Array.isArray(state.allCategories) && state.allCategories.length ? state.allCategories : await apiFetch('/categories/').catch(()=>[]);
  state.allBrands = Array.isArray(brands) ? brands : (brands.results || []);
  state.allCategories = Array.isArray(cats) ? cats : (cats.results || []);
  document.getElementById('ph_brand').innerHTML = state.allBrands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  document.getElementById('ph_category').innerHTML = `<option value="">-- None --</option>` + state.allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
async function loadCategoriesSelect() {}

// ===== ADMIN TAB SWITCHING =====
function switchAdminTab(tabName, tabEl) {
  // Hide all tabs
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tabs .tab').forEach(t => t.classList.remove('active'));
  
  // Show selected tab
  const tabEl_el = document.getElementById(`admin-${tabName}`);
  if (tabEl_el) tabEl_el.classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  
  // Load data for the tab
  if (tabName === 'phones') loadAdminPhones();
  if (tabName === 'brands') loadAdminBrands();
  if (tabName === 'categories') loadAdminCategories();
  if (tabName === 'orders-admin') loadAdminOrders();
}

// ===== PHONE CRUD =====
function openAddPhone() {
  document.getElementById('phoneModalTitle').textContent = 'Add New Phone';
  document.getElementById('editPhoneSlug').value = '';
  ['ph_name','ph_slug','ph_discount','ph_ram','ph_storage','ph_battery','ph_display','ph_camera','ph_processor','ph_os','ph_color','ph_desc','ph_image_url'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ph_price').value = '';
  document.getElementById('ph_stock').value = '';
  document.getElementById('ph_condition').value = 'new';
  document.getElementById('ph_featured').checked = false;
  document.getElementById('ph_active').checked = true;
  loadBrandsSelect();
  showModal('addPhoneModal');
}

async function editPhone(slug) {
  try {
    const p = await apiFetch(`/phones/${slug}/`);
    await loadBrandsSelect();
    document.getElementById('phoneModalTitle').textContent = 'Edit Phone';
    document.getElementById('editPhoneSlug').value = slug;
    document.getElementById('ph_name').value = p.name;
    document.getElementById('ph_slug').value = p.slug;
    document.getElementById('ph_price').value = p.price;
    document.getElementById('ph_discount').value = p.discount_price || '';
    document.getElementById('ph_stock').value = p.stock;
    document.getElementById('ph_condition').value = p.condition;
    document.getElementById('ph_ram').value = p.ram || '';
    document.getElementById('ph_storage').value = p.storage || '';
    document.getElementById('ph_battery').value = p.battery || '';
    document.getElementById('ph_display').value = p.display_size || '';
    document.getElementById('ph_camera').value = p.camera || '';
    document.getElementById('ph_processor').value = p.processor || '';
    document.getElementById('ph_os').value = p.os || '';
    document.getElementById('ph_color').value = p.color || '';
    document.getElementById('ph_desc').value = p.description || '';
    document.getElementById('ph_image_url').value = p.image_url || '';
    document.getElementById('ph_featured').checked = p.is_featured;
    document.getElementById('ph_active').checked = p.is_active;
    document.getElementById('ph_brand').value = p.brand;
    document.getElementById('ph_category').value = p.category || '';
    showModal('addPhoneModal');
  } catch(err) { toast(getError(err), 'error'); }
}

async function savePhone() {
  const slug = document.getElementById('editPhoneSlug').value;
  const body = {
    name: document.getElementById('ph_name').value.trim(),
    slug: document.getElementById('ph_slug').value.trim(),
    brand: document.getElementById('ph_brand').value,
    category: document.getElementById('ph_category').value || null,
    price: document.getElementById('ph_price').value,
    discount_price: document.getElementById('ph_discount').value || null,
    stock: document.getElementById('ph_stock').value,
    condition: document.getElementById('ph_condition').value,
    ram: document.getElementById('ph_ram').value.trim(),
    storage: document.getElementById('ph_storage').value.trim(),
    battery: document.getElementById('ph_battery').value.trim(),
    display_size: document.getElementById('ph_display').value.trim(),
    camera: document.getElementById('ph_camera').value.trim(),
    processor: document.getElementById('ph_processor').value.trim(),
    os: document.getElementById('ph_os').value.trim(),
    color: document.getElementById('ph_color').value.trim(),
    description: document.getElementById('ph_desc').value.trim(),
    image_url: document.getElementById('ph_image_url').value.trim() || null,
    is_featured: document.getElementById('ph_featured').checked,
    is_active: document.getElementById('ph_active').checked,
  };
  if (!body.name || !body.slug || !body.brand || !body.price || body.stock === '') return toast('Fill required fields', 'error');
  try {
    if (slug) {
      await apiFetch(`/phones/${slug}/`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Phone updated! ✓');
    } else {
      await apiFetch('/phones/', { method: 'POST', body: JSON.stringify(body) });
      toast('Phone added! ✓');
    }
    closeModal('addPhoneModal');
    loadAdminPhones();
  } catch(err) { toast(getError(err), 'error'); }
}

function deletePhone(slug, name) {
  document.getElementById('confirmMsg').textContent = `Delete "${name}"? This cannot be undone.`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    try {
      await apiFetch(`/phones/${slug}/`, { method: 'DELETE' });
      toast('Phone deleted');
      closeModal('confirmModal');
      loadAdminPhones();
    } catch(err) { toast(getError(err), 'error'); }
  };
  showModal('confirmModal');
}

// ===== BRAND CRUD =====
function openAddBrand() {
  document.getElementById('brandModalTitle').textContent = 'Add Brand';
  document.getElementById('editBrandSlug').value = '';
  document.getElementById('br_name').value = '';
  document.getElementById('br_slug').value = '';
  document.getElementById('br_desc').value = '';
  showModal('addBrandModal');
}

async function editBrand(slug) {
  try {
    const b = await apiFetch(`/brands/${slug}/`);
    document.getElementById('brandModalTitle').textContent = 'Edit Brand';
    document.getElementById('editBrandSlug').value = slug;
    document.getElementById('br_name').value = b.name;
    document.getElementById('br_slug').value = b.slug;
    document.getElementById('br_desc').value = b.description || '';
    showModal('addBrandModal');
  } catch(err) { toast(getError(err), 'error'); }
}

async function saveBrand() {
  const slug = document.getElementById('editBrandSlug').value;
  const body = {
    name: document.getElementById('br_name').value.trim(),
    slug: document.getElementById('br_slug').value.trim(),
    description: document.getElementById('br_desc').value.trim(),
  };
  if (!body.name || !body.slug) return toast('Name and slug required', 'error');
  try {
    if (slug) {
      await apiFetch(`/brands/${slug}/`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Brand updated!');
    } else {
      await apiFetch('/brands/', { method: 'POST', body: JSON.stringify(body) });
      toast('Brand added!');
    }
    closeModal('addBrandModal');
    loadAdminBrands();
    state.allBrands = [];
  } catch(err) { toast(getError(err), 'error'); }
}

function deleteBrand(slug, name) {
  document.getElementById('confirmMsg').textContent = `Delete brand "${name}"?`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    try {
      await apiFetch(`/brands/${slug}/`, { method: 'DELETE' });
      toast('Brand deleted');
      closeModal('confirmModal');
      loadAdminBrands();
      state.allBrands = [];
    } catch(err) { toast(getError(err), 'error'); }
  };
  showModal('confirmModal');
}

// ===== CATEGORY CRUD =====
function openAddCategory() {
  document.getElementById('catModalTitle').textContent = 'Add Category';
  document.getElementById('editCatSlug').value = '';
  document.getElementById('cat_name').value = '';
  document.getElementById('cat_slug').value = '';
  document.getElementById('cat_desc').value = '';
  showModal('addCategoryModal');
}

async function editCategory(slug) {
  try {
    const c = await apiFetch(`/categories/${slug}/`);
    document.getElementById('catModalTitle').textContent = 'Edit Category';
    document.getElementById('editCatSlug').value = slug;
    document.getElementById('cat_name').value = c.name;
    document.getElementById('cat_slug').value = c.slug;
    document.getElementById('cat_desc').value = c.description || '';
    showModal('addCategoryModal');
  } catch(err) { toast(getError(err), 'error'); }
}

async function saveCategory() {
  const slug = document.getElementById('editCatSlug').value;
  const body = {
    name: document.getElementById('cat_name').value.trim(),
    slug: document.getElementById('cat_slug').value.trim(),
    description: document.getElementById('cat_desc').value.trim(),
  };
  if (!body.name || !body.slug) return toast('Name and slug required', 'error');
  try {
    if (slug) {
      await apiFetch(`/categories/${slug}/`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Category updated!');
    } else {
      await apiFetch('/categories/', { method: 'POST', body: JSON.stringify(body) });
      toast('Category added!');
    }
    closeModal('addCategoryModal');
    loadAdminCategories();
    state.allCategories = [];
  } catch(err) { toast(getError(err), 'error'); }
}

function deleteCategory(slug, name) {
  document.getElementById('confirmMsg').textContent = `Delete category "${name}"?`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    try {
      await apiFetch(`/categories/${slug}/`, { method: 'DELETE' });
      toast('Category deleted');
      closeModal('confirmModal');
      loadAdminCategories();
      state.allCategories = [];
    } catch(err) { toast(getError(err), 'error'); }
  };
  showModal('confirmModal');
}

// ============ UTILS ============
function autoSlug(fromId, toId) {
  const val = document.getElementById(fromId).value;
  document.getElementById(toId).value = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ============ INIT ============
window.addEventListener('DOMContentLoaded', async () => {
  loadSession();
  updateNavbar();
  await loadHomeData();
  hideLoader();
  if (state.user) await loadCartBadge();
});
