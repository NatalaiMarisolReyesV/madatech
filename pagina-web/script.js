// ===== CONFIGURACION =====
const API_URL = 'http://localhost:3000';

// Los productos ahora vienen de la base de datos (MySQL) a traves de la API
let products = [];

let cart = [];
let currentFilter = 'all';
let searchQuery = '';
let currentUser = null;
let isRegisterMode = false;

document.addEventListener('DOMContentLoaded', cargarProductos);

async function cargarProductos() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '<p class="text-xs text-custom-muted col-span-full">Cargando productos...</p>';
    try {
        const res = await fetch(`${API_URL}/api/productos`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        products = await res.json();
        applyFiltersAndSearch();
    } catch (e) {
        console.error('No se pudo conectar con la API', e);
        grid.innerHTML = '<p class="text-xs text-custom-muted col-span-full">No se pudieron cargar los productos. Revisa que el servidor esté encendido.</p>';
    }
}

function renderProducts(items) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    grid.innerHTML = '';

    if (items.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    items.forEach(product => {
        const card = document.createElement('div');
        card.className = "bg-custom-card rounded-2xl border border-[#86868B]/30 overflow-hidden shadow-xs hover:border-custom-accent transition-all flex flex-col justify-between group";
        card.innerHTML = `
            <div class="relative overflow-hidden cursor-pointer bg-[#ececec] h-48" onclick="openProductDetail(${product.id})">
                <span class="absolute top-3 left-3 z-10 bg-[#131313]/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#86868B]/30">${product.category}</span>
                <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-500">
            </div>
            <div class="p-5 flex flex-col flex-grow justify-between space-y-4">
                <div class="space-y-2 cursor-pointer" onclick="openProductDetail(${product.id})">
                    <div class="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                        <i class="fa-solid fa-star"></i>
                        <span>${product.rating}</span>
                        <span class="text-custom-muted font-normal">(${product.reviewsCount})</span>
                    </div>
                    <h3 class="font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-custom-accent transition-colors">${product.name}</h3>
                    <p class="text-custom-muted text-[11px] line-clamp-2 leading-relaxed">${product.description}</p>
                </div>
                <div class="pt-2 border-t border-[#86868B]/20 flex items-center justify-between">
                    <div>
                        <span class="text-[10px] text-custom-muted block uppercase">Precio</span>
                        <span class="text-sm font-bold text-white">$${product.price.toFixed(2)}</span>
                    </div>
                    <button onclick="addToCart(${product.id})" class="bg-custom-accent hover:bg-blue-600 text-white p-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center border border-custom-accent">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterCategory(category) {
    currentFilter = category;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.textContent.toLowerCase() === category.toLowerCase() || (category === 'all' && btn.textContent === 'TODOS')) {
            btn.className = "cat-btn px-4 py-2 rounded-xl text-xs font-semibold bg-custom-accent text-white border border-custom-accent shadow-xs transition-all";
        } else {
            btn.className = "cat-btn px-4 py-2 rounded-xl text-xs font-semibold bg-custom-card text-custom-muted hover:text-white border border-[#86868B]/30 transition-all shadow-xs";
        }
    });
    applyFiltersAndSearch();
}

function handleSearch(query) {
    searchQuery = query.toLowerCase().trim();
    applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
    let filtered = products;
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category.toLowerCase() === currentFilter.toLowerCase());
    }
    if (searchQuery !== '') {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            p.description.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery)
        );
    }
    renderProducts(filtered);
}

function resetFilters() {
    currentFilter = 'all';
    searchQuery = '';
    document.getElementById('headerSearch').value = '';
    filterCategory('all');
}

function scrollToCatalog() {
    document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' });
}

// FASE 3a: ahora tambien maneja la vista 'orders' (Mis compras)
function switchView(viewName) {
    const storeView = document.getElementById('storeView');
    const valuePropView = document.getElementById('valuePropView');
    const detailView = document.getElementById('detailView');
    const ordersView = document.getElementById('ordersView');

    // Mis compras requiere sesion iniciada
    if (viewName === 'orders' && !sesionToken) {
        showToast('Inicia sesión para ver tus compras', 'fa-triangle-exclamation');
        openAuthModal();
        return;
    }

    storeView.classList.add('hidden');
    valuePropView.classList.add('hidden');
    detailView.classList.add('hidden');
    ordersView.classList.add('hidden');

    if (viewName === 'store') {
        storeView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'valueProp') {
        valuePropView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'detail') {
        detailView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'orders') {
        ordersView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        cargarMisCompras();
    }
}

function openProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const container = document.getElementById('productDetailContent');
    container.innerHTML = `
        <div class="rounded-2xl overflow-hidden bg-[#ececec] border border-[#86868B]/30 h-80 lg:h-full flex items-center justify-center">
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain p-4 mix-blend-multiply">
        </div>
        <div class="space-y-6 flex flex-col justify-between">
            <div class="space-y-3">
                <span class="inline-block bg-custom-subtle text-custom-accent text-[10px] font-bold px-3 py-1 rounded-lg border border-[#86868B]/30">${product.category}</span>
                <h1 class="text-xl sm:text-2xl font-bold text-white">${product.name}</h1>
                <div class="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                    <i class="fa-solid fa-star"></i>
                    <span>${product.rating}</span>
                    <span class="text-custom-muted font-normal">(${product.reviewsCount} valoraciones)</span>
                </div>
                <p class="text-custom-muted text-xs sm:text-sm leading-relaxed">${product.description}</p>
                <div class="pt-2">
                    <h4 class="text-white font-bold text-xs mb-2">Especificaciones técnicas:</h4>
                    <ul class="space-y-1.5 text-xs text-custom-muted">
                        ${product.specs.map(spec => `<li class="flex items-center gap-2"><i class="fa-solid fa-check text-custom-accent text-[10px]"></i> ${spec}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="pt-4 border-t border-[#86868B]/30 flex items-center justify-between">
                <div>
                    <span class="text-[10px] text-custom-muted block uppercase">Precio total</span>
                    <span class="text-xl font-bold text-white">$${product.price.toFixed(2)}</span>
                </div>
                <button onclick="addToCart(${product.id}); switchView('store');" class="bg-custom-accent hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl text-xs shadow-xs transition-all flex items-center gap-2 border border-custom-accent">
                    <i class="fa-solid fa-cart-plus"></i> AGREGAR AL CARRITO
                </button>
            </div>
        </div>
    `;
    switchView('detail');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    showToast(`¡${product.name} agregado al carrito!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        updateCartUI();
    }
}

function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const itemsList = document.getElementById('cartItemsList');
    const subtotalEl = document.getElementById('cartSubtotal');

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    badge.textContent = totalCount;
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    if (cart.length === 0) {
        itemsList.innerHTML = `
            <div class="text-center py-12 space-y-3">
                <div class="w-10 h-10 bg-custom-subtle text-custom-muted rounded-full flex items-center justify-center mx-auto text-sm border border-[#86868B]/30">
                    <i class="fa-solid fa-cart-shopping"></i>
                </div>
                <p class="text-xs text-custom-muted font-medium">Tu carrito está vacío</p>
            </div>
        `;
        return;
    }

    itemsList.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-4 py-3";
        div.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-contain p-1 rounded-xl bg-white border border-[#86868B]/30">
            <div class="flex-grow space-y-1">
                <h4 class="text-xs font-bold text-white line-clamp-1">${item.name}</h4>
                <p class="text-xs font-semibold text-custom-muted">$${item.price.toFixed(2)}</p>
                <div class="flex items-center gap-2 pt-1">
                    <button onclick="updateQuantity(${item.id}, -1)" class="w-6 h-6 rounded-lg bg-custom-subtle border border-[#86868B]/30 text-white flex items-center justify-center text-xs">-</button>
                    <span class="text-xs font-bold text-white w-4 text-center">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)" class="w-6 h-6 rounded-lg bg-custom-subtle border border-[#86868B]/30 text-white flex items-center justify-center text-xs">+</button>
                </div>
            </div>
            <button onclick="removeFromCart(${item.id})" class="text-custom-muted hover:text-red-400 p-2 transition-colors">
                <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
        `;
        itemsList.appendChild(div);
    });
}

function toggleCartModal(open) {
    const modal = document.getElementById('cartModal');
    if (open) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

function checkoutCart() {
    if (cart.length === 0) {
        showToast("Tu carrito está vacío", "fa-triangle-exclamation");
        return;
    }
    showToast("¡Pedido procesado con éxito! Gracias por comprar en MaDaTec.");
    cart = [];
    updateCartUI();
    toggleCartModal(false);
}

function openAuthModal() {
    if (currentUser) {
        if (confirm(`¿Deseas cerrar sesión de ${currentUser.name || currentUser.email}?`)) {
            currentUser = null;
            document.getElementById('userAccountBtnText').textContent = "CUENTA";
            showToast("Sesión cerrada correctamente");
        }
        return;
    }
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById('authModalTitle');
    const nameContainer = document.getElementById('nameFieldContainer');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');

    if (isRegisterMode) {
        title.textContent = "Crear Cuenta";
        nameContainer.classList.remove('hidden');
        document.getElementById('authName').required = true;
        submitBtn.textContent = "Registrarse";
        toggleText.innerHTML = `¿Ya tienes cuenta? <button type="button" onclick="toggleAuthMode()" class="text-white font-semibold hover:underline">Inicia Sesión</button>`;
    } else {
        title.textContent = "Iniciar Sesión";
        nameContainer.classList.add('hidden');
        document.getElementById('authName').required = false;
        submitBtn.textContent = "Iniciar Sesión";
        toggleText.innerHTML = `¿No tienes cuenta? <button type="button" onclick="toggleAuthMode()" class="text-white font-semibold hover:underline">Regístrate</button>`;
    }
}

function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const nameInput = document.getElementById('authName').value;

    currentUser = {
        email: email,
        name: isRegisterMode ? nameInput : (email.split('@')[0])
    };

    document.getElementById('userAccountBtnText').textContent = currentUser.name.toUpperCase();
    closeAuthModal();
    showToast(isRegisterMode ? "¡Cuenta creada exitosamente!" : "¡Sesión iniciada correctamente!");
}

function showToast(message, iconClass = "fa-circle-check") {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastMessage.textContent = message;
    toastIcon.className = `fa-solid ${iconClass} text-custom-accent text-base`;

    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 3500);
}

// ================= FASE 1: CUENTAS REALES (conectadas a la API) =================
let authModo = 'login';            // 'login' o 'registro'
let sesionToken = null;
let sesionUsuario = null;

try {
    sesionToken = localStorage.getItem('madatech_token');
    sesionUsuario = JSON.parse(localStorage.getItem('madatech_usuario') || 'null');
} catch { /* si el navegador no permite localStorage, se sigue sin sesión guardada */ }

function guardarSesion(token, usuario) {
    sesionToken = token;
    sesionUsuario = usuario;
    try {
        localStorage.setItem('madatech_token', token);
        localStorage.setItem('madatech_usuario', JSON.stringify(usuario));
    } catch {}
    actualizarBotonCuenta();
}

function cerrarSesion() {
    sesionToken = null;
    sesionUsuario = null;
    try {
        localStorage.removeItem('madatech_token');
        localStorage.removeItem('madatech_usuario');
    } catch {}
    actualizarBotonCuenta();
    // FASE 3a: si estaba viendo "Mis compras", regresar a la tienda
    const vistaCompras = document.getElementById('ordersView');
    if (vistaCompras && !vistaCompras.classList.contains('hidden')) switchView('store');
    showToast('Sesión cerrada', 'fa-right-from-bracket');
}

function actualizarBotonCuenta() {
    const txt = document.getElementById('userAccountBtnText');
    if (txt) txt.textContent = sesionUsuario ? sesionUsuario.nombre.split(' ')[0].toUpperCase() : 'CUENTA';
    // FASE 3a: el boton MIS COMPRAS solo aparece con sesion iniciada
    const btnCompras = document.getElementById('orderHistoryBtn');
    if (btnCompras) btnCompras.style.display = sesionToken ? '' : 'none';
}

// Los pedidos de la Fase 2 usarán esta función para enviar el token
function authHeaders() {
    return sesionToken
        ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sesionToken }
        : { 'Content-Type': 'application/json' };
}

function openAuthModal() {
    // Si ya inició sesión, el botón CUENTA ofrece cerrar sesión
    if (sesionUsuario) {
        if (confirm('Hola, ' + sesionUsuario.nombre + '.\n¿Quieres cerrar tu sesión?')) cerrarSesion();
        return;
    }
    authModo = 'login';
    pintarModoAuth();
    cerrarRecuperacion();
    mostrarOlvide(false);
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

function toggleAuthMode() {
    authModo = authModo === 'login' ? 'registro' : 'login';
    pintarModoAuth();
}

function pintarModoAuth() {
    const esRegistro = authModo === 'registro';
    mostrarOlvide(false);
    document.getElementById('authModalTitle').textContent = esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión';
    document.getElementById('authSubmitBtn').textContent = esRegistro ? 'Registrarme' : 'Iniciar Sesión';
    document.getElementById('nameFieldContainer').classList.toggle('hidden', !esRegistro);
    document.getElementById('authToggleText').innerHTML = esRegistro
        ? '¿Ya tienes cuenta? <button type="button" onclick="toggleAuthMode()" class="text-white font-semibold hover:underline">Inicia sesión</button>'
        : '¿No tienes cuenta? <button type="button" onclick="toggleAuthMode()" class="text-white font-semibold hover:underline">Regístrate</button>';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const nombre = document.getElementById('authName').value.trim();
    const correo = document.getElementById('authEmail').value.trim();
    const contrasena = document.getElementById('authPassword').value;
    const esRegistro = authModo === 'registro';
    const btn = document.getElementById('authSubmitBtn');

    if (esRegistro && !nombre) { showToast('Escribe tu nombre', 'fa-triangle-exclamation'); return; }

    btn.disabled = true;
    try {
        const resp = await fetch(API_URL + (esRegistro ? '/api/registro' : '/api/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(esRegistro ? { nombre, correo, contrasena } : { correo, contrasena })
        });
        const data = await resp.json();
        if (!resp.ok) {
            // Contraseña incorrecta en el login: ofrecer recuperarla
            mostrarOlvide(!esRegistro && resp.status === 401);
            showToast(data.error || 'No se pudo completar', 'fa-triangle-exclamation');
            return;
        }
        mostrarOlvide(false);
        guardarSesion(data.token, data.usuario);
        closeAuthModal();
        document.getElementById('authPassword').value = '';
        showToast(esRegistro ? '¡Cuenta creada! Bienvenida/o, ' + data.usuario.nombre : 'Bienvenida/o de nuevo, ' + data.usuario.nombre);
    } catch {
        showToast('No se pudo conectar con el servidor', 'fa-triangle-exclamation');
    } finally {
        btn.disabled = false;
    }
}

// Al cargar la página: si había sesión guardada, comprobar con el servidor que sigue válida
document.addEventListener('DOMContentLoaded', async () => {
    actualizarBotonCuenta();
    if (!sesionToken) return;
    try {
        const resp = await fetch(API_URL + '/api/perfil', { headers: authHeaders() });
        if (resp.ok) {
            guardarSesion(sesionToken, await resp.json());
        } else {
            cerrarSesion();   // token vencido o inválido
        }
    } catch { /* servidor apagado: se mantiene la sesión guardada */ }
});

// ============================================================
// FASE 2: Compra real
// Reemplaza a checkoutCart() porque se declara despues.
// ============================================================

const COMPRA_CFG = {
  iva: 0.16,               // los precios YA incluyen IVA
  envioGratisDesde: 1500,  // igual que en backend/pedidos.js
  costoEnvio: 99,
};

function compraMoneda(n) {
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function compraEscapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function compraPrecio(item) {
  return Number(item.price ?? item.precio ?? 0);
}

// Calculo SOLO para mostrar. El servidor recalcula todo con los precios de la BD.
function compraResumen() {
  const suma = cart.reduce((a, i) => a + compraPrecio(i) * i.quantity, 0);
  const envio = suma >= COMPRA_CFG.envioGratisDesde ? 0 : COMPRA_CFG.costoEnvio;
  const subtotal = suma / (1 + COMPRA_CFG.iva);
  return { suma, subtotal, impuestos: suma - subtotal, envio, total: suma + envio };
}

// Boton "Pagar / Comprar" del carrito
function checkoutCart() {
  if (cart.length === 0) {
    showToast('Tu carrito está vacío', 'fa-triangle-exclamation');
    return;
  }
  if (!sesionToken) {
    showToast('Inicia sesión para completar tu compra', 'fa-triangle-exclamation');
    toggleCartModal(false);
    openAuthModal();
    return;
  }
  abrirModalCompra();
}

function cerrarModalCompra() {
  const m = document.getElementById('checkoutModal');
  if (m) m.remove();
}

// ---------- Validacion de tarjeta (NUEVO) ----------
// Numero: exactamente 16 digitos. Vencimiento: MM/AA valido y no vencido. CVV: 3 digitos.
function pagoSoloDigitos(texto) {
  return String(texto || '').replace(/\D/g, '');
}

// Devuelve { numero, venc, cvv } con el mensaje de error de cada campo ('' si esta bien)
function pagoValidarTarjeta(numeroTxt, vencTxt, cvvTxt) {
  const err = { numero: '', venc: '', cvv: '' };

  const num = pagoSoloDigitos(numeroTxt);
  if (num.length === 0) err.numero = 'Escribe el número de tarjeta.';
  else if (num.length < 16) err.numero = `Faltan números: llevas ${num.length} de 16.`;
  else if (num.length > 16) err.numero = `Te pasaste: llevas ${num.length} números y deben ser 16.`;

  const v = String(vencTxt || '').trim();
  if (!v) {
    err.venc = 'Escribe el vencimiento (MM/AA).';
  } else if (!/^\d{2}\/\d{2}$/.test(v)) {
    err.venc = 'Usa el formato MM/AA, por ejemplo 08/28.';
  } else {
    const mes = Number(v.slice(0, 2));
    const anio = 2000 + Number(v.slice(3, 5));
    const hoy = new Date();
    if (mes < 1 || mes > 12) err.venc = 'El mes debe estar entre 01 y 12.';
    else if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) {
      err.venc = 'La tarjeta está vencida.';
    }
  }

  const c = pagoSoloDigitos(cvvTxt);
  if (c.length === 0) err.cvv = 'Escribe el CVV.';
  else if (c.length !== 3 || String(cvvTxt).trim() !== c) err.cvv = 'El CVV debe tener 3 números.';

  return err;
}

// Transferencia: numero de referencia de exactamente 10 digitos
function pagoValidarReferencia(refTxt) {
  const t = String(refTxt || '').trim();
  const d = pagoSoloDigitos(t);
  if (!t) return 'Escribe el número de referencia.';
  if (d.length !== t.length) return 'La referencia solo puede tener números.';
  if (d.length < 10) return `Faltan números: llevas ${d.length} de 10.`;
  if (d.length > 10) return `Te pasaste: llevas ${d.length} números y deben ser 10.`;
  return '';
}

// PayPal: correo de la cuenta de PayPal
function pagoValidarCorreoPaypal(correoTxt) {
  const c = String(correoTxt || '').trim();
  if (!c) return 'Escribe el correo de tu cuenta PayPal.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  return '';
}

function pagoPonerError(campo, mensaje) {
  const p = document.getElementById('pagoErr_' + campo);
  const input = document.querySelector(`#checkoutForm [data-campo="${campo}"]`);
  if (p) {
    p.textContent = mensaje;
    p.classList.toggle('hidden', !mensaje);
  }
  if (input) {
    input.classList.toggle('border-red-500', !!mensaje);
    input.classList.toggle('border-gray-300', !mensaje);
  }
}

// Muestra/oculta los campos de tarjeta segun el metodo elegido
function pagoActualizarMetodo() {
  const f = document.getElementById('checkoutForm');
  if (!f) return;
  const metodo = f.metodo_pago.value;
  const bloqueTarjeta = document.getElementById('pagoTarjeta');
  const info = document.getElementById('pagoInfo');

  bloqueTarjeta.classList.toggle('hidden', metodo !== 'tarjeta');
  document.getElementById('pagoTransferencia').classList.toggle('hidden', metodo !== 'transferencia');
  document.getElementById('pagoPaypal').classList.toggle('hidden', metodo !== 'paypal');

  // Al cambiar de metodo se limpia el aviso rojo general del metodo anterior
  const avisoGeneral = document.getElementById('checkoutError');
  if (avisoGeneral) avisoGeneral.classList.add('hidden');

  const textos = {
    tarjeta: 'Pago simulado: no se cobra nada. No uses una tarjeta real.',
    transferencia: 'Pago simulado: no se hace ninguna transferencia real.',
    paypal: 'Pago simulado: no se cobra nada y no se pide contraseña de PayPal.',
  };
  info.textContent = textos[metodo] || '';
}

function abrirModalCompra() {
  toggleCartModal(false);
  cerrarModalCompra();

  const r = compraResumen();
  const lineas = cart.map((i) => `
    <div class="flex justify-between text-sm py-1">
      <span>${compraEscapar(i.name)} × ${i.quantity}</span>
      <span>${compraMoneda(compraPrecio(i) * i.quantity)}</span>
    </div>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'checkoutModal';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;' +
    'align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white';

  overlay.innerHTML = `
    <div id="checkoutCard" class="bg-white text-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6"
         style="max-height:95vh;overflow-y:auto;">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Finalizar compra</h2>
        <button type="button" id="checkoutCerrar" class="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
      </div>

      <form id="checkoutForm" novalidate>
        <h3 class="font-semibold mb-2">Dirección de envío</h3>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <select name="etiqueta" class="${campo}">
            <option>Casa</option>
            <option>Trabajo</option>
            <option>Otro</option>
          </select>
          <input name="codigo_postal" maxlength="5" inputmode="numeric" placeholder="Código postal" class="${campo}">
        </div>
        <input name="calle" maxlength="255" placeholder="Calle y número" class="${campo} mb-3">
        <input name="ciudad" maxlength="100" placeholder="Ciudad" class="${campo} mb-4">

        <h3 class="font-semibold mb-2">Método de pago</h3>
        <select name="metodo_pago" class="${campo} mb-3">
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
          <option value="paypal">PayPal</option>
        </select>

        <div id="pagoTarjeta" class="mb-2">
          <input name="tarjeta_numero" data-campo="numero" inputmode="numeric" autocomplete="off"
                 maxlength="24" placeholder="Número de tarjeta (16 dígitos)" class="${campo}">
          <p id="pagoErr_numero" class="hidden text-xs text-red-600 mt-1"></p>

          <div class="grid grid-cols-2 gap-3 mt-3">
            <div>
              <input name="tarjeta_venc" data-campo="venc" inputmode="numeric" autocomplete="off"
                     maxlength="5" placeholder="MM/AA" class="${campo}">
              <p id="pagoErr_venc" class="hidden text-xs text-red-600 mt-1"></p>
            </div>
            <div>
              <input name="tarjeta_cvv" data-campo="cvv" type="password" inputmode="numeric" autocomplete="off"
                     maxlength="3" placeholder="CVV (3 dígitos)" class="${campo}">
              <p id="pagoErr_cvv" class="hidden text-xs text-red-600 mt-1"></p>
            </div>
          </div>
        </div>
        <div id="pagoTransferencia" class="mb-2 hidden">
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm mb-3">
            <p class="font-semibold mb-1">Datos para la transferencia</p>
            <p>Banco: <span class="font-medium">MaDaTec Bank (demo)</span></p>
            <p>CLABE: <span class="font-medium">012 345 67890123456 7</span></p>
            <p>Monto a transferir: <span class="font-medium">${compraMoneda(r.total)}</span></p>
          </div>
          <input name="transf_referencia" data-campo="referencia" inputmode="numeric" autocomplete="off"
                 maxlength="14" placeholder="Número de referencia (10 dígitos)" class="${campo}">
          <p id="pagoErr_referencia" class="hidden text-xs text-red-600 mt-1"></p>
        </div>

        <div id="pagoPaypal" class="mb-2 hidden">
          <input name="paypal_correo" data-campo="paypal" type="email" autocomplete="off"
                 maxlength="100" placeholder="Correo de tu cuenta PayPal" class="${campo}">
          <p id="pagoErr_paypal" class="hidden text-xs text-red-600 mt-1"></p>
        </div>

        <p id="pagoInfo" class="text-xs text-gray-500 mb-4"></p>

        <h3 class="font-semibold mb-2">Factura</h3>
        <select name="factura" class="${campo} mb-3">
          <option value="no">¿Necesitas factura? No</option>
          <option value="si">¿Necesitas factura? Sí</option>
        </select>

        <div id="facturaDatos" class="hidden mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
          <p class="text-xs text-gray-500 mb-3">Datos fiscales para tu factura (demostración: no se timbra ante el SAT).</p>
          <input name="fac_rfc" data-campo="fac_rfc" maxlength="13" autocomplete="off" placeholder="RFC (12 o 13 caracteres)" class="${campo} uppercase">
          <p id="pagoErr_fac_rfc" class="hidden text-xs text-red-600 mt-1"></p>

          <input name="fac_razon" data-campo="fac_razon" maxlength="150" autocomplete="off" placeholder="Nombre o razón social" class="${campo} mt-3">
          <p id="pagoErr_fac_razon" class="hidden text-xs text-red-600 mt-1"></p>

          <input name="fac_correo" data-campo="fac_correo" type="email" maxlength="100" autocomplete="off" placeholder="Correo para enviar la factura" class="${campo} mt-3">
          <p id="pagoErr_fac_correo" class="hidden text-xs text-red-600 mt-1"></p>

          <input name="fac_cp" data-campo="fac_cp" maxlength="5" inputmode="numeric" autocomplete="off" placeholder="Código postal fiscal" class="${campo} mt-3">
          <p id="pagoErr_fac_cp" class="hidden text-xs text-red-600 mt-1"></p>

          <select name="fac_regimen" data-campo="fac_regimen" class="${campo} mt-3">
            <option value="">Régimen fiscal</option>
            ${Object.entries(FACTURA_REGIMENES).map(([k, v]) => `<option value="${k}">${k} - ${v}</option>`).join('')}
          </select>
          <p id="pagoErr_fac_regimen" class="hidden text-xs text-red-600 mt-1"></p>

          <select name="fac_uso" data-campo="fac_uso" class="${campo} mt-3">
            <option value="">Uso del CFDI</option>
            ${Object.entries(FACTURA_USOS).map(([k, v]) => `<option value="${k}">${k} - ${v}</option>`).join('')}
          </select>
          <p id="pagoErr_fac_uso" class="hidden text-xs text-red-600 mt-1"></p>
        </div>

        <h3 class="font-semibold mb-2">Resumen</h3>
        <div class="border border-gray-200 rounded-lg p-3 mb-4">
          ${lineas}
          <hr class="my-2">
          <div class="flex justify-between text-sm"><span>Subtotal (sin IVA)</span><span>${compraMoneda(r.subtotal)}</span></div>
          <div class="flex justify-between text-sm"><span>IVA 16%</span><span>${compraMoneda(r.impuestos)}</span></div>
          <div class="flex justify-between text-sm"><span>Envío</span><span>${r.envio === 0 ? 'Gratis' : compraMoneda(r.envio)}</span></div>
          <div class="flex justify-between font-bold mt-1"><span>Total</span><span>${compraMoneda(r.total)}</span></div>
        </div>

        <div id="checkoutError" class="hidden bg-red-100 text-red-700 text-sm rounded-lg p-3 mb-3"></div>

        <div class="flex gap-3">
          <button type="button" id="checkoutCancelar" class="flex-1 border border-gray-300 rounded-lg py-2 hover:bg-gray-100">Cancelar</button>
          <button type="submit" id="checkoutSubmit" class="flex-1 bg-blue-600 text-white font-semibold rounded-lg py-2 hover:bg-blue-700 disabled:opacity-60">Confirmar compra</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('checkoutCerrar').addEventListener('click', cerrarModalCompra);
  document.getElementById('checkoutCancelar').addEventListener('click', cerrarModalCompra);

  const form = document.getElementById('checkoutForm');
  form.addEventListener('submit', enviarPedido);
  form.metodo_pago.addEventListener('change', pagoActualizarMetodo);
  form.factura.addEventListener('change', facturaActualizar);
  form.fac_rfc.addEventListener('input', () => { form.fac_rfc.value = form.fac_rfc.value.toUpperCase(); pagoPonerError('fac_rfc', ''); });
  form.fac_cp.addEventListener('input', () => { form.fac_cp.value = pagoSoloDigitos(form.fac_cp.value).slice(0, 5); pagoPonerError('fac_cp', ''); });
  ['fac_razon', 'fac_correo', 'fac_regimen', 'fac_uso'].forEach((n) =>
    form[n].addEventListener('input', () => pagoPonerError(n, '')));

  // Numero de tarjeta: solo digitos, se agrupa de 4 en 4 y avisa si faltan o sobran
  form.tarjeta_numero.addEventListener('input', () => {
    const digitos = pagoSoloDigitos(form.tarjeta_numero.value).slice(0, 20);
    form.tarjeta_numero.value = digitos.replace(/(.{4})/g, '$1 ').trim();
    pagoPonerError('numero', digitos.length > 16 ? pagoValidarTarjeta(digitos, '', '').numero : '');
  });
  form.tarjeta_numero.addEventListener('blur', () => {
    pagoPonerError('numero', pagoValidarTarjeta(form.tarjeta_numero.value, '', '').numero);
  });

  // Vencimiento: solo digitos y la diagonal se pone sola (MM/AA)
  form.tarjeta_venc.addEventListener('input', () => {
    const d = pagoSoloDigitos(form.tarjeta_venc.value).slice(0, 4);
    form.tarjeta_venc.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
    pagoPonerError('venc', '');
  });
  form.tarjeta_venc.addEventListener('blur', () => {
    pagoPonerError('venc', pagoValidarTarjeta('', form.tarjeta_venc.value, '').venc);
  });

  // CVV: solo digitos, maximo 3
  form.tarjeta_cvv.addEventListener('input', () => {
    form.tarjeta_cvv.value = pagoSoloDigitos(form.tarjeta_cvv.value).slice(0, 3);
    pagoPonerError('cvv', '');
  });
  form.tarjeta_cvv.addEventListener('blur', () => {
    pagoPonerError('cvv', pagoValidarTarjeta('', '', form.tarjeta_cvv.value).cvv);
  });

  // Referencia de transferencia: solo digitos, avisa si faltan o sobran
  form.transf_referencia.addEventListener('input', () => {
    form.transf_referencia.value = pagoSoloDigitos(form.transf_referencia.value).slice(0, 14);
    const n = form.transf_referencia.value.length;
    pagoPonerError('referencia', n > 10 ? pagoValidarReferencia(form.transf_referencia.value) : '');
  });
  form.transf_referencia.addEventListener('blur', () => {
    pagoPonerError('referencia', pagoValidarReferencia(form.transf_referencia.value));
  });

  // Correo PayPal
  form.paypal_correo.addEventListener('input', () => pagoPonerError('paypal', ''));
  form.paypal_correo.addEventListener('blur', () => {
    pagoPonerError('paypal', pagoValidarCorreoPaypal(form.paypal_correo.value));
  });

  pagoActualizarMetodo();
}

function compraMostrarError(texto) {
  const box = document.getElementById('checkoutError');
  if (!box) return;
  box.textContent = texto;
  box.classList.remove('hidden');
}

async function enviarPedido(e) {
  e.preventDefault();
  const f = e.target;
  const btn = document.getElementById('checkoutSubmit');
  document.getElementById('checkoutError').classList.add('hidden');

  const direccion = {
    etiqueta: f.etiqueta.value,
    calle: f.calle.value.trim(),
    ciudad: f.ciudad.value.trim(),
    codigo_postal: f.codigo_postal.value.trim(),
  };

  if (!direccion.calle || !direccion.ciudad) {
    compraMostrarError('Escribe la calle y la ciudad de envío.');
    return;
  }
  if (direccion.codigo_postal && !/^\d{5}$/.test(direccion.codigo_postal)) {
    compraMostrarError('El código postal debe tener 5 números.');
    return;
  }

  const metodo = f.metodo_pago.value;
  let tarjeta = null;

  // Si paga con tarjeta, validar numero (16), vencimiento (MM/AA) y CVV (3)
  if (metodo === 'tarjeta') {
    const err = pagoValidarTarjeta(f.tarjeta_numero.value, f.tarjeta_venc.value, f.tarjeta_cvv.value);
    pagoPonerError('numero', err.numero);
    pagoPonerError('venc', err.venc);
    pagoPonerError('cvv', err.cvv);
    if (err.numero || err.venc || err.cvv) {
      compraMostrarError('Revisa los datos de la tarjeta.');
      return;
    }
    tarjeta = {
      numero: pagoSoloDigitos(f.tarjeta_numero.value),
      vencimiento: f.tarjeta_venc.value.trim(),
      cvv: f.tarjeta_cvv.value,
    };
  }

  // Transferencia: validar numero de referencia (10 digitos)
  let transferencia = null;
  if (metodo === 'transferencia') {
    const eRef = pagoValidarReferencia(f.transf_referencia.value);
    pagoPonerError('referencia', eRef);
    if (eRef) {
      compraMostrarError('Revisa el número de referencia de la transferencia.');
      return;
    }
    transferencia = { referencia: f.transf_referencia.value.trim() };
  }

  // PayPal: validar correo de la cuenta
  let paypal = null;
  if (metodo === 'paypal') {
    const ePay = pagoValidarCorreoPaypal(f.paypal_correo.value);
    pagoPonerError('paypal', ePay);
    if (ePay) {
      compraMostrarError('Revisa el correo de PayPal.');
      return;
    }
    paypal = { correo: f.paypal_correo.value.trim() };
  }

  // Factura (solo si eligio "Si")
  let factura = null;
  if (f.factura.value === 'si') {
    const r = facturaValidar(f);
    ['fac_rfc', 'fac_razon', 'fac_correo', 'fac_cp', 'fac_regimen', 'fac_uso']
      .forEach((c) => pagoPonerError(c, r.errores[c] || ''));
    if (Object.keys(r.errores).length) {
      compraMostrarError('Revisa los datos de facturación.');
      return;
    }
    factura = r.datos;
  }

  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const cuerpo = {
      items: cart.map((i) => ({ id: i.id, cantidad: i.quantity })),
      direccion,
      metodo_pago: metodo,
    };
    if (tarjeta) cuerpo.tarjeta = tarjeta;
    if (transferencia) cuerpo.transferencia = transferencia;
    if (paypal) cuerpo.paypal = paypal;
    if (factura) cuerpo.factura = factura;

    const resp = await fetch(`${API_URL}/api/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + sesionToken,
      },
      body: JSON.stringify(cuerpo),
    });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      compraMostrarError(data.error || 'No se pudo completar la compra.');
      btn.disabled = false;
      btn.textContent = 'Confirmar compra';
      return;
    }

    // Exito: vaciar carrito, mostrar confirmacion y refrescar el stock del catalogo
    cart = [];
    updateCartUI();
    compraMostrarConfirmacion(data);
    cargarProductos();
    showToast('¡Pedido procesado con éxito! Gracias por comprar en MaDaTec.');
  } catch (err) {
    console.error(err);
    compraMostrarError('No se pudo conectar con el servidor. ¿Está encendido?');
    btn.disabled = false;
    btn.textContent = 'Confirmar compra';
  }
}

function compraMostrarConfirmacion(p) {
  const card = document.getElementById('checkoutCard');
  if (!card) return;
  card.innerHTML = `
    <div class="text-center">
      <div class="text-5xl mb-2">✅</div>
      <h2 class="text-xl font-bold mb-1">¡Pedido #${p.id_pedido} confirmado!</h2>
      <p class="text-sm text-gray-500 mb-4">Pago aprobado (simulado)</p>
    </div>
    <div class="border border-gray-200 rounded-lg p-3 mb-4 text-sm">
      <div class="flex justify-between"><span>Subtotal (sin IVA)</span><span>${compraMoneda(p.subtotal)}</span></div>
      <div class="flex justify-between"><span>IVA 16%</span><span>${compraMoneda(p.impuestos)}</span></div>
      <div class="flex justify-between"><span>Envío</span><span>${Number(p.costo_envio) === 0 ? 'Gratis' : compraMoneda(p.costo_envio)}</span></div>
      <div class="flex justify-between font-bold mt-1"><span>Total</span><span>${compraMoneda(p.total)}</span></div>
      <p class="text-xs text-gray-500 mt-2">Transacción: ${compraEscapar(p.id_transaccion)}</p>
      ${p.factura ? `<p class="text-xs text-gray-500 mt-1">Factura solicitada para el RFC ${compraEscapar(p.factura.rfc)}</p>` : ''}
    </div>
    <div class="flex gap-3">
      <button type="button" id="checkoutVerCompras" class="flex-1 border border-gray-300 rounded-lg py-2 hover:bg-gray-100">Ver mis compras</button>
      <button type="button" id="checkoutListo" class="flex-1 bg-blue-600 text-white font-semibold rounded-lg py-2 hover:bg-blue-700">Listo</button>
    </div>`;
  document.getElementById('checkoutListo').addEventListener('click', cerrarModalCompra);
  document.getElementById('checkoutVerCompras').addEventListener('click', () => {
    cerrarModalCompra();
    switchView('orders');
  });
}

// ============================================================
// FASE 3a: MIS COMPRAS (historial de pedidos)
// Usa GET /api/mis-pedidos. Diseno de la pantalla tomado de la
// version de tu companero y adaptado a nuestro backend.
// ============================================================

let historialPedidos = [];

function fechaPedido(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(d);
}

function nombreMetodoPago(m) {
  return { tarjeta: 'Tarjeta', transferencia: 'Transferencia', paypal: 'PayPal' }[m] || m || 'No especificado';
}

async function cargarMisCompras() {
  const lista = document.getElementById('ordersList');
  lista.innerHTML = '<p class="text-sm text-custom-muted">Cargando historial...</p>';

  try {
    const resp = await fetch(API_URL + '/api/mis-pedidos', { headers: authHeaders() });
    const data = await resp.json().catch(() => ({}));

    if (resp.status === 401) {          // sesion vencida
      cerrarSesion();
      switchView('store');
      openAuthModal();
      return;
    }
    if (!resp.ok) throw new Error(data.error || 'No se pudo cargar tu historial');

    historialPedidos = data;

    if (historialPedidos.length === 0) {
      lista.innerHTML = '<div class="bg-custom-card border border-[#86868B]/30 rounded-2xl p-8 text-center text-sm text-custom-muted">Aún no tienes compras registradas.</div>';
      return;
    }

    lista.innerHTML = historialPedidos.map((p) => {
      const pagado = p.estado_pago === 'aprobado';
      const etiquetaPago = pagado
        ? 'Pagado (simulado)'
        : 'Pago: ' + compraEscapar(p.estado_pago || 'pendiente');

      const items = (p.items || []).map((i) => `
        <div class="flex items-center gap-3 py-3">
          <img src="${compraEscapar(i.imagen_url || '')}" alt="${compraEscapar(i.nombre_producto)}"
               class="w-14 h-14 object-contain p-1 rounded-xl bg-white">
          <div class="min-w-0 flex-grow">
            <p class="text-xs font-semibold text-white">${compraEscapar(i.nombre_producto)}</p>
            <p class="text-xs text-custom-muted mt-1">${i.cantidad} × ${compraMoneda(i.precio_unitario)}</p>
          </div>
          <span class="text-xs font-semibold text-white">${compraMoneda(i.subtotal_linea)}</span>
        </div>`).join('');

      return `
        <article class="bg-custom-card border border-[#86868B]/30 rounded-2xl p-5 sm:p-6">
          <div class="flex flex-col sm:flex-row sm:justify-between gap-3 border-b border-[#86868B]/20 pb-4">
            <div>
              <h2 class="font-bold text-white">Compra #${p.id_pedido}</h2>
              <p class="text-xs text-custom-muted mt-1">${compraEscapar(fechaPedido(p.fecha_pedido))}</p>
              <p class="text-xs text-custom-muted mt-1">Método: ${compraEscapar(nombreMetodoPago(p.metodo_pago))}</p>
              <p class="text-xs text-custom-muted mt-1">Transacción: ${compraEscapar(p.id_transaccion || '—')}</p>
              ${p.factura_rfc ? `<p class="text-xs text-custom-muted mt-1">Factura solicitada · RFC ${compraEscapar(p.factura_rfc)}</p>` : ''}
            </div>
            <div class="sm:text-right">
              <p class="text-xs font-semibold ${pagado ? 'text-green-400' : 'text-amber-400'}">${etiquetaPago}</p>
              <p class="text-lg font-bold text-white mt-1">${compraMoneda(p.total)}</p>
            </div>
          </div>
          <div class="divide-y divide-[#86868B]/20">${items}</div>
          <div class="text-xs text-custom-muted space-y-1 pt-3 border-t border-[#86868B]/20">
            <div class="flex justify-between"><span>Subtotal (sin IVA)</span><span>${compraMoneda(p.subtotal)}</span></div>
            <div class="flex justify-between"><span>IVA 16%</span><span>${compraMoneda(p.impuestos)}</span></div>
            <div class="flex justify-between"><span>Envío</span><span>${Number(p.costo_envio) === 0 ? 'Gratis' : compraMoneda(p.costo_envio)}</span></div>
          </div>
          <button onclick="recomprarPedido(${p.id_pedido})"
                  class="mt-4 bg-custom-accent hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold">
            <i class="fa-solid fa-cart-plus mr-1"></i> Agregar de nuevo al carrito
          </button>
        </article>`;
    }).join('');
  } catch (err) {
    console.error(err);
    lista.innerHTML = `<p class="text-sm text-red-400">${compraEscapar(err.message || 'No se pudo cargar tu historial')}</p>`;
  }
}

// Vuelve a poner en el carrito los productos de una compra anterior
function recomprarPedido(idPedido) {
  const pedido = historialPedidos.find((p) => p.id_pedido === idPedido);
  if (!pedido) return;

  let agregados = 0;
  let sinStock = 0;

  for (const it of pedido.items) {
    const producto = products.find((p) => p.id === it.id_producto);
    if (!producto) { sinStock += it.cantidad; continue; }   // ya no esta en el catalogo

    const enCarrito = cart.find((c) => c.id === producto.id);
    const yaTengo = enCarrito ? enCarrito.quantity : 0;
    const cantidad = Math.min(it.cantidad, producto.stock - yaTengo);   // no pasar del stock

    if (cantidad <= 0) { sinStock += it.cantidad; continue; }
    if (cantidad < it.cantidad) sinStock += it.cantidad - cantidad;

    if (enCarrito) enCarrito.quantity += cantidad;
    else cart.push({ ...producto, quantity: cantidad });
    agregados += cantidad;
  }

  if (agregados === 0) {
    showToast('Esos productos ya no están disponibles', 'fa-triangle-exclamation');
    return;
  }

  updateCartUI();
  showToast(sinStock > 0
    ? 'Se agregó lo disponible; algunos productos no tienen stock suficiente'
    : 'Productos agregados de nuevo al carrito');
  toggleCartModal(true);
}
// ============================================================
// FACTURA (opcional en el pago)
// ============================================================
const FACTURA_REGIMENES = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios',
  '606': 'Arrendamiento',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '616': 'Sin obligaciones fiscales',
  '621': 'Incorporación Fiscal',
  '626': 'Régimen Simplificado de Confianza (RESICO)',
};
const FACTURA_USOS = {
  'G01': 'Adquisición de mercancías',
  'G03': 'Gastos en general',
  'S01': 'Sin efectos fiscales',
};

// Devuelve { datos, errores }. Mismas reglas que backend/pedidos.js
function facturaValidar(f) {
  const datos = {
    rfc: f.fac_rfc.value.trim().toUpperCase(),
    razon_social: f.fac_razon.value.trim(),
    correo: f.fac_correo.value.trim(),
    codigo_postal: f.fac_cp.value.trim(),
    regimen_fiscal: f.fac_regimen.value,
    uso_cfdi: f.fac_uso.value,
  };
  const e = {};
  if (!datos.rfc) e.fac_rfc = 'Escribe el RFC.';
  else if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(datos.rfc)) e.fac_rfc = 'RFC no válido. Ejemplo: XAXX010101000';
  if (!datos.razon_social) e.fac_razon = 'Escribe el nombre o razón social.';
  if (!datos.correo) e.fac_correo = 'Escribe el correo para la factura.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo)) e.fac_correo = 'Escribe un correo válido.';
  if (!datos.codigo_postal) e.fac_cp = 'Escribe el código postal fiscal.';
  else if (!/^\d{5}$/.test(datos.codigo_postal)) e.fac_cp = 'El código postal debe tener 5 números.';
  if (!FACTURA_REGIMENES[datos.regimen_fiscal]) e.fac_regimen = 'Elige tu régimen fiscal.';
  if (!FACTURA_USOS[datos.uso_cfdi]) e.fac_uso = 'Elige el uso del CFDI.';
  return { datos, errores: e };
}

function facturaActualizar() {
  const f = document.getElementById('checkoutForm');
  if (!f) return;
  document.getElementById('facturaDatos').classList.toggle('hidden', f.factura.value !== 'si');
}

// ============================================================
// RECUPERAR CONTRASEÑA
// ============================================================
let recuperarCorreo = '';

function mostrarOlvide(mostrar) {
  const box = document.getElementById('forgotLinkBox');
  if (box) box.classList.toggle('hidden', !mostrar);
}

function abrirRecuperacion() {
  recuperarCorreo = '';
  document.getElementById('authForm').classList.add('hidden');
  document.getElementById('authFooter').classList.add('hidden');
  document.getElementById('recoverPanel').classList.remove('hidden');
  document.getElementById('recoverStep1').classList.remove('hidden');
  document.getElementById('recoverStep2').classList.add('hidden');
  document.getElementById('recoverHint').textContent = 'Escribe tu correo y te daremos un código de 6 dígitos.';
  // si ya escribió su correo en el login, se reutiliza
  document.getElementById('recoverEmail').value = document.getElementById('authEmail').value.trim();
}

function cerrarRecuperacion() {
  document.getElementById('recoverPanel').classList.add('hidden');
  document.getElementById('authForm').classList.remove('hidden');
  document.getElementById('authFooter').classList.remove('hidden');
  document.getElementById('recoverCode').value = '';
  document.getElementById('recoverNewPass').value = '';
  document.getElementById('recoverNewPass2').value = '';
}

async function solicitarCodigo(e) {
  e.preventDefault();
  const correo = document.getElementById('recoverEmail').value.trim();
  const btn = document.getElementById('recoverBtn1');
  btn.disabled = true;
  try {
    const resp = await fetch(API_URL + '/api/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) { showToast(data.error || 'No se pudo generar el código', 'fa-triangle-exclamation'); return; }

    recuperarCorreo = correo;
    document.getElementById('recoverStep1').classList.add('hidden');
    document.getElementById('recoverStep2').classList.remove('hidden');
    const demo = document.getElementById('recoverDemoBox');
    if (data.codigo_demo) {
      document.getElementById('recoverDemoCode').textContent = data.codigo_demo;
      demo.classList.remove('hidden');
      document.getElementById('recoverHint').textContent = 'Escribe el código y tu nueva contraseña.';
    } else {
      demo.classList.add('hidden');
      document.getElementById('recoverHint').textContent = 'Si el correo está registrado, se generó un código. Escríbelo junto con tu nueva contraseña.';
    }
  } catch {
    showToast('No se pudo conectar con el servidor', 'fa-triangle-exclamation');
  } finally {
    btn.disabled = false;
  }
}

async function restablecerContrasena(e) {
  e.preventDefault();
  const codigo = document.getElementById('recoverCode').value.trim();
  const p1 = document.getElementById('recoverNewPass').value;
  const p2 = document.getElementById('recoverNewPass2').value;
  if (p1 !== p2) { showToast('Las contraseñas no coinciden', 'fa-triangle-exclamation'); return; }
  if (p1.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres', 'fa-triangle-exclamation'); return; }

  const btn = document.getElementById('recoverBtn2');
  btn.disabled = true;
  try {
    const resp = await fetch(API_URL + '/api/restablecer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: recuperarCorreo, codigo, contrasena: p1 }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) { showToast(data.error || 'No se pudo cambiar la contraseña', 'fa-triangle-exclamation'); return; }

    // Listo: volver al login con el correo ya escrito
    document.getElementById('authEmail').value = recuperarCorreo;
    document.getElementById('authPassword').value = '';
    mostrarOlvide(false);
    cerrarRecuperacion();
    showToast('Contraseña actualizada. Ya puedes iniciar sesión.');
  } catch {
    showToast('No se pudo conectar con el servidor', 'fa-triangle-exclamation');
  } finally {
    btn.disabled = false;
  }
}