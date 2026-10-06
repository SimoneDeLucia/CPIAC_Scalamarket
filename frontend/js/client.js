// Stato dell'applicazione client
const state = {
    user: null,
    catalog: [],
    cart: []
};

// Elementi DOM
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userGreeting = document.getElementById('user-greeting');
const catalogGrid = document.getElementById('catalog-grid');
const cartItems = document.getElementById('cart-items');
const btnPlaceOrder = document.getElementById('btn-place-order');
const orderMessage = document.getElementById('order-message');
const orderStatusResult = document.getElementById('order-status-result');

// Login / Registrazione
document.getElementById('btn-login').addEventListener('click', async () => {
    const user = document.getElementById('client-username').value;
    const pass = document.getElementById('client-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    
    if(!user || !pass) return errorEl.textContent = 'Inserisci le credenziali.';
    
    try {
        const res = await AuthAPI.login(user, pass, 'client');
        state.user = res.user;
        showDashboard();
    } catch (e) {
        errorEl.textContent = e.message;
    }
});

document.getElementById('btn-register').addEventListener('click', async () => {
    const user = document.getElementById('client-username').value;
    const pass = document.getElementById('client-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    
    if(!user || !pass) return errorEl.textContent = 'Inserisci username e password.';
    
    try {
        const res = await AuthAPI.register(user, pass, 'client');
        state.user = res.user;
        showDashboard();
    } catch (e) {
        errorEl.textContent = e.message;
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    state.user = null;
    state.cart = [];
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
});

// Passaggio a Dashboard
async function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'flex';
    userGreeting.textContent = `Ciao, ${state.user.username}`;
    
    await loadCatalog();
    await loadUserOrders();
}

// Caricamento Catalogo
async function loadCatalog() {
    try {
        state.catalog = await InventoryAPI.getCatalog();
        renderCatalog();
    } catch(e) {
        catalogGrid.innerHTML = `<div class="card"><p style="color: var(--danger)">Errore caricamento catalogo.</p></div>`;
    }
}

function renderCatalog() {
    catalogGrid.innerHTML = '';
    if(state.catalog.length === 0) {
        catalogGrid.innerHTML = `<p>Nessun articolo disponibile.</p>`;
        return;
    }
    
    state.catalog.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.description || 'Nessuna descrizione'}</p>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">Disponibilità totale: ${item.total_available} pezzi</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; gap: 0.5rem;">
                <strong style="color: var(--primary); font-size: 1.25rem;">€${item.price.toFixed(2)}</strong>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="number" id="qty-${item.id}" value="1" min="1" max="${item.total_available}" class="form-control" style="width: 60px; padding: 0.2rem;" ${item.total_available === 0 ? 'disabled' : ''}>
                    <button class="btn secondary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;" onclick="addToCart(${item.id})" ${item.total_available === 0 ? 'disabled' : ''}>Aggiungi</button>
                </div>
            </div>
            <div id="err-${item.id}" style="color: var(--danger); font-size: 0.8rem; text-align: right; margin-top: 0.5rem;"></div>
        `;
        catalogGrid.appendChild(div);
    });
}

// Gestione Carrello
window.addToCart = (articleId) => {
    const article = state.catalog.find(a => a.id === articleId);
    if(!article) return;
    
    const qtyInput = document.getElementById(`qty-${articleId}`);
    const errEl = document.getElementById(`err-${articleId}`);
    errEl.textContent = '';
    
    let requestedQty = parseInt(qtyInput.value) || 1;
    if (requestedQty < 1) requestedQty = 1;
    
    const existing = state.cart.find(item => item.article_id === articleId);
    const currentCartQty = existing ? existing.quantity : 0;
    
    if (currentCartQty + requestedQty > article.total_available) {
        errEl.textContent = `Non puoi superare la disponibilità massima (${article.total_available}).`;
        return;
    }
    
    if(existing) {
        existing.quantity += requestedQty;
    } else {
        state.cart.push({
            article_id: articleId,
            name: article.name,
            price: article.price,
            quantity: requestedQty
        });
    }
    qtyInput.value = 1;
    renderCart();
};

function renderCart() {
    if(state.cart.length === 0) {
        cartItems.innerHTML = `<p style="color: var(--text-muted);">Il carrello è vuoto.</p>`;
        btnPlaceOrder.disabled = true;
        return;
    }
    
    btnPlaceOrder.disabled = false;
    let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
    let total = 0;
    
    state.cart.forEach(item => {
        total += item.price * item.quantity;
        html += `
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <span>${item.name} x${item.quantity}</span>
                <span>€${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });
    
    html += `
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 0.5rem; font-size: 1.1rem;">
            <span>Totale:</span>
            <span style="color: var(--primary);">€${total.toFixed(2)}</span>
        </div>
    </div>`;
    
    cartItems.innerHTML = html;
}

// Effettua Ordine
btnPlaceOrder.addEventListener('click', async () => {
    if(state.cart.length === 0) return;
    
    orderMessage.textContent = 'Elaborazione in corso...';
    orderMessage.style.color = 'var(--text-muted)';
    
    try {
        const itemsForApi = state.cart.map(i => ({ article_id: i.article_id, quantity: i.quantity }));
        const res = await OrderAPI.placeOrder(state.user.id, itemsForApi);
        
        orderMessage.innerHTML = `Ordine confermato! (ID: <strong>${res.order.id}</strong>) <br> Filiali coinvolte: ${res.order.locations && res.order.locations.length > 0 ? res.order.locations.join(', ') : 'Nessuna'}`;
        orderMessage.style.color = 'var(--success)';
        
        // Svuota carrello
        state.cart = [];
        renderCart();
        loadUserOrders();
    } catch(e) {
        orderMessage.textContent = e.message;
        orderMessage.style.color = 'var(--danger)';
    }
});

async function loadUserOrders() {
    try {
        const ords = await OrderAPI.getUserOrders(state.user.id);
        const listEl = document.getElementById('user-orders-list');
        let html = '';
        if(ords.length === 0) {
            html = '<p>Nessun ordine effettuato.</p>';
        } else {
            ords.forEach(o => {
                const color = o.status === 'FAILED' ? 'var(--danger)' : 'var(--success)';
                const date = new Date(o.created_at).toLocaleString();
                const numItems = o.items.reduce((acc, i) => acc + i.quantity, 0);
                const locs = o.locations && o.locations.length > 0 ? o.locations.join(', ') : 'N/A';
                
                let itemsList = '<ul style="margin-top: 0.5rem; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-muted);">';
                o.items.forEach(item => {
                    const articleInfo = state.catalog.find(a => a.id === item.article_id);
                    const name = articleInfo ? articleInfo.name : 'Articolo';
                    itemsList += `<li>${name} (x${item.quantity})</li>`;
                });
                itemsList += '</ul>';
                
                html += `<div style="padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong>Ordine #${o.id}</strong> | Stato: <span style="color:${color}">${o.status}</span><br>
                    <span style="font-size: 0.8rem; color: var(--text-muted)">Effettuato il: ${date}</span><br>
                    <strong>Filiali:</strong> ${locs}
                    ${itemsList}
                </div>`;
            });
        }
        listEl.innerHTML = html;
    } catch(e) {
        const listEl = document.getElementById('user-orders-list');
        if (listEl) listEl.innerHTML = `<p style="color:var(--danger)">Errore caricamento ordini.</p>`;
    }
}
