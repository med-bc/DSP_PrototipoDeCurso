/* ═══════════════════════════════════════════════════════════════
   SaborExpress – app.js
   Sistema de Gestión de Delivery
   Persistencia: localStorage
════════════════════════════════════════════════════════════════ */

/* ─── Inicialización de datos ─── */
const ADMIN_EMAIL    = 'admin@saborexpress.com';
const ADMIN_PASSWORD = 'admin123';
const DELIVERY_FEE   = 3.50;

/* Menú inicial por defecto */
const DEFAULT_MENU = [
  { id:1, name:'Burger Clásica',       category:'Hamburguesas', price:18.9,  desc:'Carne 180g, lechuga, tomate, cheddar y salsa especial.' },
  { id:2, name:'Burger BBQ Doble',      category:'Hamburguesas', price:24.9,  desc:'Doble carne, bacon crujiente y salsa BBQ ahumada.' },
  { id:3, name:'Burger Crispy Chicken', category:'Hamburguesas', price:21.9,  desc:'Pollo apanado, coleslaw y mayo de ajo.' },
  { id:4, name:'Pizza Margarita',       category:'Pizzas',       price:29.9,  desc:'Salsa de tomate, mozzarella fresca y albahaca.' },
  { id:5, name:'Pizza Pepperoni',       category:'Pizzas',       price:33.9,  desc:'Generoso pepperoni y queso mozzarella derretido.' },
  { id:6, name:'Pizza 4 Quesos',        category:'Pizzas',       price:35.9,  desc:'Mozzarella, cheddar, gouda y parmesano.' },
  { id:7, name:'Inca Kola 500ml',       category:'Bebidas',      price:5.5,   desc:'La bebida de sabor nacional, bien helada.' },
  { id:8, name:'Gaseosa Negra 500ml',   category:'Bebidas',      price:5.0,   desc:'Refrescante y burbujeante.' },
  { id:9, name:'Agua Mineral 625ml',    category:'Bebidas',      price:3.5,   desc:'Agua mineral natural sin gas.' },
  { id:10,name:'Brownie de Chocolate',  category:'Postres',      price:9.9,   desc:'Brownie húmedo con chips de chocolate.' },
  { id:11,name:'Cheesecake de Fresa',   category:'Postres',      price:11.9,  desc:'Base de galleta, crema de queso y coulis de fresa.' },
];

const ORDER_STATUSES = ['Pendiente','Preparando','En camino','Entregado'];

/* ─── Helpers localStorage ─── */
const store = {
  get:    k    => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set:    (k,v)=> localStorage.setItem(k, JSON.stringify(v)),
  remove: k    => localStorage.removeItem(k),
};

function initStorage() {
  if (!store.get('se_users'))   store.set('se_users',   []);
  if (!store.get('se_menu'))    store.set('se_menu',    DEFAULT_MENU);
  if (!store.get('se_orders'))  store.set('se_orders',  []);
  if (!store.get('se_nextId'))  store.set('se_nextId',  100);
}

/* ─── Estado de sesión ─── */
let currentUser = null;
let cart        = [];

/* ─── Utilidad: generar ID ─── */
function nextId() {
  const id = (store.get('se_nextId') || 100) + 1;
  store.set('se_nextId', id);
  return id;
}

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('formLogin').classList.toggle('hidden', !isLogin);
  document.getElementById('formRegister').classList.toggle('hidden', isLogin);
  document.getElementById('tabLogin').className = isLogin
    ? 'flex-1 py-3 text-sm font-semibold text-brand border-b-2 border-brand'
    : 'flex-1 py-3 text-sm font-semibold text-ink-muted border-b-2 border-transparent';
  document.getElementById('tabReg').className = !isLogin
    ? 'flex-1 py-3 text-sm font-semibold text-brand border-b-2 border-brand'
    : 'flex-1 py-3 text-sm font-semibold text-ink-muted border-b-2 border-transparent';
}

function login() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;

  // Admin hardcoded
  if (email === ADMIN_EMAIL && pass === ADMIN_PASSWORD) {
    currentUser = { id: 0, name: 'Administrador', email: ADMIN_EMAIL, role: 'admin' };
    afterLogin();
    return;
  }

  const users = store.get('se_users') || [];
  const user  = users.find(u => u.email === email && u.password === pass);
  if (!user) {
    document.getElementById('loginError').classList.remove('hidden');
    return;
  }
  document.getElementById('loginError').classList.add('hidden');
  currentUser = user;
  afterLogin();
}

function register() {
  const name    = document.getElementById('regName').value.trim();
  const email   = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass    = document.getElementById('regPass').value;
  const phone   = document.getElementById('regPhone').value.trim();
  const address = document.getElementById('regAddress').value.trim();
  const errEl   = document.getElementById('regError');

  if (!name || !email || !pass || !address) { errEl.textContent='Completa todos los campos obligatorios.'; errEl.classList.remove('hidden'); return; }
  if (pass.length < 6)  { errEl.textContent='La contraseña debe tener al menos 6 caracteres.'; errEl.classList.remove('hidden'); return; }
  if (email === ADMIN_EMAIL) { errEl.textContent='Ese correo está reservado.'; errEl.classList.remove('hidden'); return; }

  const users = store.get('se_users') || [];
  if (users.find(u => u.email === email)) { errEl.textContent='Ya existe una cuenta con ese correo.'; errEl.classList.remove('hidden'); return; }

  const newUser = { id: nextId(), name, email, password: pass, phone, address, role: 'cliente', createdAt: new Date().toISOString() };
  users.push(newUser);
  store.set('se_users', users);

  currentUser = newUser;
  errEl.classList.add('hidden');
  afterLogin();
}

function afterLogin() {
  document.getElementById('userGreeting').textContent = `Hola, ${currentUser.name.split(' ')[0]}`;
  document.getElementById('userGreeting').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');
  showPage('home');
}

function logout() {
  currentUser = null;
  cart = [];
  updateCartBadge();
  showPage('auth');
  document.getElementById('userGreeting').classList.add('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
}

/* ══════════════════════════════════════
   NAVEGACIÓN
══════════════════════════════════════ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  if (name === 'home')     { renderHome(); }
  if (name === 'menu')     { renderMenu(); }
  if (name === 'cart')     { renderCart(); }
  if (name === 'tracking') { renderTracking(); }
  if (name === 'admin')    { renderAdmin(); }
  if (name === 'auth')     { }

  // Highlight nav
  const navMap = { home:'Inicio', menu:'Menú', tracking:'Mis Pedidos', admin:'Admin' };
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.textContent === navMap[name]) b.classList.add('active');
  });
}

/* ══════════════════════════════════════
   HOME
══════════════════════════════════════ */
function renderHome() {
  if (!currentUser) return;
  document.getElementById('heroName').textContent = currentUser.name.split(' ')[0];

  const orders = (store.get('se_orders') || []).filter(o => o.userId === currentUser.id);
  document.getElementById('statPedidos').textContent = orders.length;

  const last = orders[orders.length - 1];
  if (last) {
    document.getElementById('lastOrderCard').classList.remove('hidden');
    document.getElementById('lastOrderInfo').innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs text-ink-muted">Pedido #${last.id}</span>
        <span class="status-badge status-${last.status.toLowerCase().replace(' ','-')}">${last.status}</span>
      </div>
      <p class="text-sm mt-1">${last.items.map(i=>i.name).join(', ')}</p>
      <p class="text-xs text-ink-muted mt-1">Total: <strong>S/ ${last.total.toFixed(2)}</strong></p>
    `;
  }
}

function filterCategory(cat) {
  showPage('menu');
  document.getElementById('categoryFilter').value = cat;
  renderMenu();
}

/* ══════════════════════════════════════
   MENÚ
══════════════════════════════════════ */
function renderMenu() {
  const filter = document.getElementById('categoryFilter')?.value || '';
  const menu   = store.get('se_menu') || [];
  const items  = filter ? menu.filter(p => p.category === filter) : menu;
  const grid   = document.getElementById('menuGrid');
  if (!grid) return;

  grid.innerHTML = items.map(p => `
    <div class="product-card">
      <div class="p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-bold text-sm">${p.name}</h3>
            <p class="text-xs text-ink-muted mt-0.5">${p.category}</p>
          </div>
          <span class="text-brand font-bold text-sm whitespace-nowrap">S/ ${Number(p.price).toFixed(2)}</span>
        </div>
        <p class="text-xs text-ink-muted mt-2 mb-3">${p.desc}</p>
        <button onclick="addToCart(${p.id})" class="btn-primary w-full text-xs py-1.5">Agregar al carrito</button>
      </div>
    </div>
  `).join('');

  if (!items.length) grid.innerHTML = `<p class="col-span-3 text-center text-ink-muted py-12">No hay productos en esta categoría.</p>`;
}

/* ══════════════════════════════════════
   CARRITO
══════════════════════════════════════ */
function addToCart(productId) {
  if (!currentUser) { showToast('Inicia sesión primero'); return; }
  const menu = store.get('se_menu') || [];
  const prod = menu.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(c => c.id === productId);
  if (existing) { existing.qty += 1; }
  else { cart.push({ ...prod, qty: 1 }); }

  updateCartBadge();
  showToast(`${prod.name} añadido`);
}

function updateCartBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartCount').textContent = total;
}

function renderCart() {
  const empty   = document.getElementById('cartEmpty');
  const content = document.getElementById('cartContent');
  const list    = document.getElementById('cartItems');

  if (!cart.length) { empty.classList.remove('hidden'); content.classList.add('hidden'); return; }
  empty.classList.add('hidden'); content.classList.remove('hidden');

  list.innerHTML = cart.map((item, idx) => `
    <div class="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm truncate">${item.name}</p>
        <p class="text-xs text-ink-muted">S/ ${Number(item.price).toFixed(2)} c/u</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
        <span class="font-bold text-sm w-5 text-center">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
      </div>
      <span class="font-bold text-sm text-brand w-16 text-right">S/ ${(item.price * item.qty).toFixed(2)}</span>
      <button class="btn-danger" onclick="removeFromCart(${idx})">✕</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('subtotal').textContent   = `S/ ${subtotal.toFixed(2)}`;
  document.getElementById('totalPrice').textContent = `S/ ${(subtotal + DELIVERY_FEE).toFixed(2)}`;

  // pre-fill address
  if (currentUser?.address) {
    const addrInput = document.getElementById('orderAddress');
    if (!addrInput.value) addrInput.value = currentUser.address;
  }
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartBadge();
  renderCart();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  updateCartBadge();
  renderCart();
}

/* ══════════════════════════════════════
   PEDIDOS
══════════════════════════════════════ */
function placeOrder() {
  if (!currentUser) { showToast('Inicia sesión primero'); return; }
  if (!cart.length) { showToast('Tu carrito está vacío'); return; }

  const address = document.getElementById('orderAddress').value.trim();
  const method  = document.getElementById('payMethod').value;
  const notes   = document.getElementById('orderNotes').value.trim();

  if (!address) { showToast('Ingresa una dirección de entrega'); return; }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const order = {
    id:        nextId(),
    userId:    currentUser.id,
    userName:  currentUser.name,
    items:     cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
    address,
    payMethod: method,
    notes,
    subtotal,
    total:     subtotal + DELIVERY_FEE,
    status:    'Pendiente',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const orders = store.get('se_orders') || [];
  orders.push(order);
  store.set('se_orders', orders);

  // Limpiar carrito
  cart = [];
  updateCartBadge();

  // Mostrar modal
  document.getElementById('modalBody').textContent    = `Tu pedido en ${address}`;
  document.getElementById('modalOrderId').textContent = `#${order.id}`;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal').classList.add('flex');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal').classList.remove('flex');
}

/* ══════════════════════════════════════
   SEGUIMIENTO
══════════════════════════════════════ */
function renderTracking() {
  if (!currentUser) return;
  const allOrders  = store.get('se_orders') || [];
  const myOrders   = allOrders.filter(o => o.userId === currentUser.id).reverse();
  const container  = document.getElementById('ordersList');
  const noOrdersEl = document.getElementById('noOrders');

  if (!myOrders.length) { noOrdersEl.classList.remove('hidden'); container.innerHTML = ''; return; }
  noOrdersEl.classList.add('hidden');

  container.innerHTML = myOrders.map(order => {
    const steps = ORDER_STATUSES;
    const curIdx = steps.indexOf(order.status);
    const stepsHtml = steps.map((s, i) => {
      const isLast  = i === steps.length - 1;
      const dotClass = i < curIdx ? 'done' : i === curIdx ? 'current' : 'pending';
      const lineClass = i < curIdx ? 'done' : '';
      return `
        <div class="track-step">
          <div class="flex flex-col items-center">
            <div class="track-dot ${dotClass}">${i < curIdx ? '✓' : i+1}</div>
            ${!isLast ? `<div class="track-line ${lineClass}"></div>` : ''}
          </div>
          <div class="pt-0.5">
            <p class="text-sm font-semibold ${i === curIdx ? 'text-brand' : i < curIdx ? 'text-ink' : 'text-ink-muted'}">${s}</p>
            ${i === curIdx ? `<p class="text-xs text-ink-muted">En proceso...</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <span class="font-bold text-sm">Pedido #${order.id}</span>
            <span class="text-xs text-ink-muted ml-2">${formatDate(order.createdAt)}</span>
          </div>
          <span class="status-badge status-${order.status.toLowerCase().replace(' ','-')}">${order.status}</span>
        </div>
        <div class="p-5 grid sm:grid-cols-2 gap-5">
          <div>
            <p class="text-xs font-semibold text-ink-muted uppercase mb-2">Productos</p>
            ${order.items.map(i => `<p class="text-sm">${i.name} × ${i.qty}</p>`).join('')}
            <p class="text-sm mt-2 font-bold text-brand">Total: S/ ${order.total.toFixed(2)}</p>
            <p class="text-xs text-ink-muted mt-1">📍 ${order.address}</p>
            <p class="text-xs text-ink-muted">💳 ${order.payMethod}</p>
            ${order.notes ? `<p class="text-xs text-ink-muted">📝 ${order.notes}</p>` : ''}
          </div>
          <div>
            <p class="text-xs font-semibold text-ink-muted uppercase mb-2">Estado del pedido</p>
            ${stepsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════ */
function renderAdmin() {
  const isAdmin = currentUser?.role === 'admin';
  document.getElementById('adminGuard').classList.toggle('hidden', isAdmin);
  document.getElementById('adminContent').classList.toggle('hidden', !isAdmin);
  if (!isAdmin) return;

  renderAdminOrders();
  renderAdminMenu();
  renderAdminUsers();
  updateKPIs();
}

function adminTab(tab) {
  ['pedidos','menu','usuarios'].forEach(t => {
    document.getElementById(`admin${t.charAt(0).toUpperCase()+t.slice(1)}`).classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.admin-tab-btn').forEach((btn, i) => {
    const tabs = ['pedidos','menu','usuarios'];
    const active = tabs[i] === tab;
    btn.className = `admin-tab-btn pb-2 text-sm font-semibold border-b-2 ml-${i?4:0} ${active ? 'border-brand text-brand' : 'border-transparent text-ink-muted'}`;
  });
}

function updateKPIs() {
  const orders = store.get('se_orders') || [];
  document.getElementById('kpiTotal').textContent   = orders.length;
  document.getElementById('kpiPending').textContent  = orders.filter(o=>o.status==='Pendiente').length;
  document.getElementById('kpiProgress').textContent = orders.filter(o=>['Preparando','En camino'].includes(o.status)).length;
  document.getElementById('kpiDone').textContent     = orders.filter(o=>o.status==='Entregado').length;
}

function renderAdminOrders() {
  const orders = (store.get('se_orders') || []).slice().reverse();
  const el = document.getElementById('adminOrdersList');
  if (!orders.length) { el.innerHTML = '<p class="text-ink-muted text-sm">No hay pedidos aún.</p>'; return; }

  el.innerHTML = orders.map(order => `
    <div class="admin-order-card">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <span class="font-bold text-sm">#${order.id}</span>
          <span class="text-xs text-ink-muted ml-2">${order.userName}</span>
          <span class="text-xs text-ink-muted ml-2">${formatDate(order.createdAt)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="status-badge status-${order.status.toLowerCase().replace(' ','-')}">${order.status}</span>
          <select onchange="updateOrderStatus(${order.id}, this.value)" class="form-input py-0.5 text-xs w-auto">
            ${ORDER_STATUSES.map(s=>`<option ${s===order.status?'selected':''}>${s}</option>`).join('')}
            <option ${order.status==='Cancelado'?'selected':''}>Cancelado</option>
          </select>
          <button onclick="deleteOrder(${order.id})" class="btn-danger py-1">Eliminar</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 text-xs text-ink-muted">
        <span>📍 ${order.address}</span>
        <span>💳 ${order.payMethod}</span>
        <span class="font-semibold text-ink">S/ ${order.total.toFixed(2)}</span>
      </div>
      <p class="text-xs text-ink-muted mt-1">${order.items.map(i=>`${i.name}×${i.qty}`).join(' · ')}</p>
    </div>
  `).join('');
}

function deleteOrder(id) {
  if (!confirm('¿Eliminar este pedido permanentemente?')) return;
  const orders = (store.get('se_orders') || []).filter(o => o.id !== id);
  store.set('se_orders', orders);
  renderAdminOrders();
  updateKPIs();
  showToast('Pedido eliminado');
}

function updateOrderStatus(orderId, newStatus) {
  const orders = store.get('se_orders') || [];
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    orders[idx].status    = newStatus;
    orders[idx].updatedAt = new Date().toISOString();
    store.set('se_orders', orders);
    updateKPIs();
    showToast(`Pedido #${orderId} → ${newStatus}`);
  }
}

function renderAdminMenu() {
  const menu = store.get('se_menu') || [];
  document.getElementById('adminMenuList').innerHTML = menu.map(p => `
    <div class="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm">${p.name}</p>
        <p class="text-xs text-ink-muted">${p.category} · S/ ${Number(p.price).toFixed(2)}</p>
        <p class="text-xs text-ink-muted truncate">${p.desc}</p>
      </div>
      <button class="btn-danger" onclick="deleteProduct(${p.id})">Eliminar</button>
    </div>
  `).join('');
}

function addProduct() {
  const name  = document.getElementById('newProdName').value.trim();
  const cat   = document.getElementById('newProdCat').value;
  const price = parseFloat(document.getElementById('newProdPrice').value);
  const desc  = document.getElementById('newProdDesc').value.trim();

  if (!name || !cat || isNaN(price) || price <= 0) { showToast('Completa todos los campos del producto'); return; }

  const menu = store.get('se_menu') || [];
  const newProd = { id: nextId(), name, category: cat, price, desc };
  menu.push(newProd);
  store.set('se_menu', menu);

  // Limpiar campos
  ['newProdName','newProdPrice','newProdDesc'].forEach(id => document.getElementById(id).value = '');
  renderAdminMenu();
  showToast(`${name} agregado al menú`);
}

function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto del menú?')) return;
  const menu = (store.get('se_menu') || []).filter(p => p.id !== id);
  store.set('se_menu', menu);
  renderAdminMenu();
  showToast('Producto eliminado');
}

function renderAdminUsers() {
  const users = store.get('se_users') || [];
  const el = document.getElementById('adminUsersList');
  if (!users.length) { el.innerHTML = '<p class="text-ink-muted text-sm">No hay usuarios registrados.</p>'; return; }

  el.innerHTML = users.map(u => `
    <div class="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
        ${u.name.charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm">${u.name}</p>
        <p class="text-xs text-ink-muted">${u.email} · ${u.phone || 'sin teléfono'}</p>
        <p class="text-xs text-ink-muted truncate">📍 ${u.address}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-ink-muted">Registrado</p>
        <p class="text-xs">${formatDate(u.createdAt)}</p>
      </div>
      <div class="flex flex-col gap-1">
        <button class="btn-secondary text-[10px] py-1" onclick="editUser(${u.id})">Editar</button>
        <button class="btn-danger text-[10px] py-1" onclick="deleteUser(${u.id})">Borrar</button>
      </div>
    </div>
  `).join('');
}

function editUser(id) {
  const users = store.get('se_users') || [];
  const u = users.find(user => user.id === id);
  if (!u) return;

  document.getElementById('editUserId').value = u.id;
  document.getElementById('userName').value = u.name;
  document.getElementById('userEmail').value = u.email;
  document.getElementById('userPass').value = u.password;
  document.getElementById('userPhone').value = u.phone || '';
  document.getElementById('userAddr').value = u.address || '';
  document.getElementById('userRole').value = u.role || 'cliente';

  document.getElementById('userFormTitle').textContent = 'Editar usuario';
  document.getElementById('btnSaveUser').textContent = 'Actualizar usuario';
  document.getElementById('btnCancelUserEdit').classList.remove('hidden');
  document.getElementById('adminUsuarios').scrollIntoView({ behavior: 'smooth' });
}

function cancelUserEdit() {
  document.getElementById('editUserId').value = '';
  ['userName', 'userEmail', 'userPass', 'userPhone', 'userAddr'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('userRole').value = 'cliente';
  document.getElementById('userFormTitle').textContent = 'Agregar usuario';
  document.getElementById('btnSaveUser').textContent = 'Guardar usuario';
  document.getElementById('btnCancelUserEdit').classList.add('hidden');
}

function saveUser() {
  const editId = document.getElementById('editUserId').value;
  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim().toLowerCase();
  const pass = document.getElementById('userPass').value;
  const users = store.get('se_users') || [];

  if (!name || !email || !pass) { showToast('Nombre, correo y clave son obligatorios'); return; }

  if (editId) {
    const idx = users.findIndex(u => u.id == editId);
    if (idx !== -1) users[idx] = { ...users[idx], name, email, password: pass, phone: document.getElementById('userPhone').value, address: document.getElementById('userAddr').value, role: document.getElementById('userRole').value };
  } else {
    if (users.find(u => u.email === email)) { showToast('El correo ya existe'); return; }
    users.push({ id: nextId(), name, email, password: pass, phone: document.getElementById('userPhone').value, address: document.getElementById('userAddr').value, role: document.getElementById('userRole').value, createdAt: new Date().toISOString() });
  }

  store.set('se_users', users);
  cancelUserEdit();
  renderAdminUsers();
  showToast('Usuarios actualizados');
}

function deleteUser(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  const users = (store.get('se_users') || []).filter(u => u.id !== id);
  store.set('se_users', users);
  renderAdminUsers();
  showToast('Usuario eliminado');
}

/* ══════════════════════════════════════
   IMPORT / EXPORT PEDIDOS
══════════════════════════════════════ */
function clearStorage() {
  if (!confirm('¿Estás seguro de borrar todos los datos del sistema? Esta acción no se puede deshacer.')) return;
  localStorage.clear();
  initStorage();
  logout();
  showToast('Storage limpiado correctamente');
}

function exportOrders() {
  const orders = store.get('se_orders') || [];
  if (orders.length === 0) { showToast('No hay pedidos para exportar'); return; }
  
  // Limpieza de emojis al exportar
  const cleanData = JSON.parse(JSON.stringify(orders), (key, value) => {
    if (key === 'emoji') return undefined; // Elimina la propiedad emoji
    if (typeof value === 'string') {
      return value.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    }
    return value;
  });

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanData, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "pedidos_saborexpress.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  showToast('Archivo JSON generado');
}

function importOrders(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const orders = JSON.parse(e.target.result);
      if (Array.isArray(orders)) {
        store.set('se_orders', orders);
        renderAdmin();
        showToast('Pedidos importados con éxito');
      } else { showToast('Formato JSON no válido'); }
    } catch (err) { showToast('Error al leer el archivo'); }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset input
}

/* ══════════════════════════════════════
   UTILIDADES
══════════════════════════════════════ */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  showPage('auth');
});
