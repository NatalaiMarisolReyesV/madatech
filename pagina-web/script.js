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

function switchView(viewName) {
    const storeView = document.getElementById('storeView');
    const valuePropView = document.getElementById('valuePropView');
    const detailView = document.getElementById('detailView');

    storeView.classList.add('hidden');
    valuePropView.classList.add('hidden');
    detailView.classList.add('hidden');

    if (viewName === 'store') {
        storeView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'valueProp') {
        valuePropView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'detail') {
        detailView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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