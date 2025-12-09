// ===== Global config =====
const STORAGE_KEY = 'smartqr_orders_v1';

const MENU = [
  {id:1,name:'Paneer Tikka',price:220,desc:'Grilled paneer with spices'},
  {id:2,name:'Classic Burger',price:180,desc:'Beef burger with fries'},
  {id:3,name:'Veg Biryani',price:240,desc:'Aromatic saffron rice'},
  {id:4,name:'Caesar Salad',price:150,desc:'Romaine with parmesan'},
  {id:5,name:'Chocolate Mousse',price:140,desc:'Rich chocolate dessert'},
  {id:6,name:'Masala Dosa',price:120,desc:'Crispy dosa with chutney'}
];

// demo-only staff passwords (FRONTEND – not secure)
const STAFF_PASSWORDS = {
  kitchen: 'kitchen123',
  owner:  'owner123'
};

// state
let cart = {};
let orders = loadOrders();
let currentView = 'customer';
let currentRole = 'customer';  // 'customer' | 'kitchen' | 'owner'

// ===== Storage helpers =====
function loadOrders(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveOrders(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  updateAllViews();
}

// ===== Totals for owner =====
function computeTotals(){
  let totalOrders = orders.length;
  let totalRevenue = 0, paidRevenue = 0, unpaidRevenue = 0;
  for(const o of orders){
    const t = o.total || 0;
    totalRevenue += t;
    if(o.paid) paidRevenue += t; else unpaidRevenue += t;
  }
  return {totalOrders,totalRevenue,paidRevenue,unpaidRevenue};
}
function updateTotalsUI(){
  const t = computeTotals();
  document.getElementById('statOrders').textContent = t.totalOrders;
  document.getElementById('statRevenue').textContent = '₹' + t.totalRevenue;
  document.getElementById('statPaid').textContent = '₹' + t.paidRevenue;
  document.getElementById('statUnpaid').textContent = '₹' + t.unpaidRevenue;
}

// ===== Navigation & role handling =====
function setRole(role){
  currentRole = role;
  document.getElementById('roleLabel').textContent = 'Role: ' + role.charAt(0).toUpperCase() + role.slice(1);

  // show/hide staff-only nav links
  const staffLinks = document.querySelectorAll('.staff-only');
  staffLinks.forEach(btn=>{
    btn.disabled = (role === 'customer');
    btn.style.opacity = (role === 'customer') ? 0.4 : 1;
  });

  // login/logout buttons
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  if(role === 'customer'){
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
  }else{
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
  }

  // if customer was on kitchen/owner, send them back
  if(role === 'customer' && (currentView === 'kitchen' || currentView === 'owner')){
    showView('customer');
  }
}

function showView(view){
  // block access to kitchen/owner for customer
  if((view === 'kitchen' || view === 'owner') && currentRole === 'customer'){
    alert('Only staff can access this module. Please use Staff Login.');
    openLoginModal();
    return;
  }

  currentView = view;
  // views
  ['customer','kitchen','owner'].forEach(v=>{
    document.getElementById('view-'+v).style.display = (v === view ? 'block' : 'none');
  });
  // nav
  ['customer','kitchen','owner'].forEach(v=>{
    document.getElementById('nav-'+v).classList.toggle('active', v === view);
  });
}

// ===== Customer: menu/cart/payment =====
function renderMenu(){
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = '';
  MENU.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'menu-item';
    card.innerHTML = `
      <div class="thumb">${m.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
      <div class="mi-info">
        <div class="mi-name">${m.name}</div>
        <div class="muted">${m.desc}</div>
      </div>
      <div class="mi-actions">
        <div class="price">₹${m.price}</div>
        <button class="btn small" data-add="${m.id}">Add</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = +e.currentTarget.dataset.add;
      addToCart(id);
    });
  });
}

function renderCart(){
  const area = document.getElementById('cartArea');
  area.innerHTML = '';
  const keys = Object.keys(cart);
  if(keys.length === 0){
    area.innerHTML = '<div class="muted">Your cart is empty</div>';
    document.getElementById('paymentArea').style.display = 'none';
    updateCartTotal();
    return;
  }

  keys.forEach(k=>{
    const it = MENU.find(x=>x.id == k);
    const qty = cart[k];
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div>
        <strong>${it.name}</strong>
        <div class="muted">₹${it.price} each</div>
      </div>
      <div class="cart-controls">
        <div class="qty">
          <button data-qminus="${it.id}">-</button>
          <span>${qty}</span>
          <button data-qplus="${it.id}">+</button>
        </div>
        <div>₹${it.price * qty}</div>
      </div>
    `;
    area.appendChild(row);
  });

  area.querySelectorAll('[data-qminus]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = +e.currentTarget.dataset.qminus;
      changeQty(id, -1);
    });
  });
  area.querySelectorAll('[data-qplus]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = +e.currentTarget.dataset.qplus;
      changeQty(id, 1);
    });
  });

  document.getElementById('paymentArea').style.display = 'block';
  updateCartTotal();
}

function updateCartTotal(){
  let total = 0;
  Object.keys(cart).forEach(k=>{
    const it = MENU.find(x=>x.id == k);
    total += it.price * cart[k];
  });
  document.getElementById('cartTotal').textContent = '₹' + total;
}

function addToCart(id){
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
}
function changeQty(id, delta){
  cart[id] = (cart[id] || 0) + delta;
  if(cart[id] <= 0) delete cart[id];
  renderCart();
}
function clearCart(){
  if(confirm('Clear cart?')){
    cart = {};
    renderCart();
  }
}

function placeOrder(){
  if(Object.keys(cart).length === 0){
    alert('Cart is empty');
    return;
  }
  const order = {
    id: 'ORD' + Date.now().toString().slice(-6),
    items: Object.entries(cart).map(([id,qty])=>{
      const it = MENU.find(m=>m.id == id);
      return {id:it.id,name:it.name,price:it.price,qty};
    }),
    status: 'placed',
    paid: false,
    total: Object.entries(cart).reduce((s,[id,qty])=>{
      const it = MENU.find(m=>m.id == id);
      return s + it.price * qty;
    },0),
    time: new Date().toISOString()
  };
  orders.unshift(order);
  saveOrders();
  cart = {};
  renderCart();
  alert('Order placed. Please pay to confirm (demo).');
}

function payOrder(){
  // find most recent unpaid order
  const unpaid = orders.find(o => !o.paid && o.status !== 'completed');
  if(!unpaid){
    alert('No unpaid order found.');
    return;
  }
  const name = document.getElementById('cardName').value.trim();
  const num  = document.getElementById('cardNumber').value.replace(/\s/g,'');
  if(!name || num.length < 6){
    alert('Enter mock name and card number (demo).');
    return;
  }
  unpaid.paid = true;
  unpaid.payment = {
    method:'card',
    cardName:name,
    cardLast4:num.slice(-4),
    time:new Date().toISOString()
  };
  saveOrders();
  alert('Payment simulated and recorded as PAID.');
}

// ===== Kitchen view =====
function renderKitchen(){
  const area = document.getElementById('kitchenOrders');
  area.innerHTML = '';
  if(orders.length === 0){
    area.innerHTML = '<div class="muted">No orders yet</div>';
    return;
  }
  const active = orders.filter(o => o.status !== 'completed');
  if(active.length === 0){
    area.innerHTML = '<div class="muted">No active orders</div>';
    return;
  }

  active.forEach(o=>{
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-head">
        <div><strong>${o.id}</strong> <span class="muted" style="font-size:11px;">${new Date(o.time).toLocaleTimeString()}</span></div>
        <div>${o.paid ? '<span class="pill paid">PAID</span>' : '<span class="pill unpaid">UNPAID</span>'}</div>
      </div>
      <div class="order-items">
        ${o.items.map(it=>`
          <div class="order-item-row">
            <span>${it.qty} × ${it.name}</span>
            <span class="muted">₹${it.price * it.qty}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-actions">
        ${o.status === 'placed' ? `<button class="btn small" data-status="${o.id}|preparing">Start Preparing</button>` : ''}
        ${o.status === 'preparing' ? `<button class="btn small ghost" data-status="${o.id}|ready">Mark Ready</button>` : ''}
        ${o.status === 'ready' ? `<button class="btn small" data-status="${o.id}|completed">Complete</button>` : ''}
        <span class="muted">Status: <strong style="text-transform:capitalize">${o.status}</strong></span>
      </div>
    `;
    area.appendChild(card);
  });

  area.querySelectorAll('[data-status]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const [id,newStatus] = e.currentTarget.dataset.status.split('|');
      updateStatus(id,newStatus);
    });
  });
}

// ===== Owner view =====
function renderOwner(){
  const filter = document.getElementById('ownerFilter').value;
  const tbody  = document.getElementById('ownerTbody');
  tbody.innerHTML = '';

  const filtered = orders.filter(o => filter === 'all' ? true : o.status === filter);
  document.getElementById('ownerTotalCount').textContent = filtered.length;

  if(filtered.length === 0){
    tbody.innerHTML = '<tr><td colspan="7" class="muted">No orders</td></tr>';
  }else{
    filtered.forEach(o=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${new Date(o.time).toLocaleString()}</td>
        <td>${o.items.map(i=>i.qty + '×' + i.name).join(', ')}</td>
        <td>₹${o.total}</td>
        <td>${o.paid ? 'Yes ('+(o.payment?.cardLast4 || '')+')' : 'No'}</td>
        <td style="text-transform:capitalize">${o.status}</td>
        <td>${o.status !== 'completed'
              ? '<button class="btn small" data-owner-set="'+o.id+'">Set</button>'
              : '—'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  tbody.querySelectorAll('[data-owner-set]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.dataset.ownerSet;
      const s = prompt('Set new status (placed / preparing / ready / completed)');
      if(!s) return;
      const allowed = ['placed','preparing','ready','completed'];
      if(!allowed.includes(s)) return alert('Invalid status');
      updateStatus(id,s);
    });
  });

  updateTotalsUI();
}

// ===== Shared status update =====
function updateStatus(id,newStatus){
  const idx = orders.findIndex(o => o.id === id);
  if(idx === -1) return;
  orders[idx].status = newStatus;
  saveOrders();
}

// ===== Staff login modal =====
function openLoginModal(){
  document.getElementById('loginModal').style.display = 'flex';
}
function closeLoginModal(){
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('loginPassword').value = '';
}
function handleLogin(){
  const role = document.getElementById('loginRole').value; // kitchen|owner
  const pw   = document.getElementById('loginPassword').value;
  if(pw === STAFF_PASSWORDS[role]){
    setRole(role);
    showView(role === 'kitchen' ? 'kitchen' : 'owner');
    closeLoginModal();
  }else{
    alert('Wrong password (demo).');
  }
}

// ===== Sync across tabs =====
window.addEventListener('storage', (e)=>{
  if(e.key === STORAGE_KEY){
    orders = loadOrders();
    updateAllViews();
  }
});

// ===== Update all views together =====
function updateAllViews(){
  renderKitchen();
  renderOwner();
  updateTotalsUI();
}

// ===== Attach events & init =====
window.addEventListener('DOMContentLoaded', ()=>{
  // navigation
  document.getElementById('nav-customer').addEventListener('click', ()=>showView('customer'));
  document.getElementById('nav-kitchen').addEventListener('click', ()=>showView('kitchen'));
  document.getElementById('nav-owner').addEventListener('click', ()=>showView('owner'));

  // cart buttons
  document.getElementById('clearCartBtn').addEventListener('click', clearCart);
  document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
  document.getElementById('payBtn').addEventListener('click', payOrder);

  // login/logout
  document.getElementById('loginBtn').addEventListener('click', openLoginModal);
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    setRole('customer');
  });

  // modal buttons
  document.getElementById('loginSubmit').addEventListener('click', handleLogin);
  document.getElementById('loginCancel').addEventListener('click', closeLoginModal);
  document.getElementById('loginModal').addEventListener('click', e=>{
    if(e.target.id === 'loginModal') closeLoginModal();
  });

  // initial role & view
  setRole('customer');
  renderMenu();
  renderCart();
  renderKitchen();
  renderOwner();
  updateTotalsUI();
});
