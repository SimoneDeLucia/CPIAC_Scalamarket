// Stato dell'applicazione admin
const state = {
    user: null,
    inventory: [],
    orders: [],
    inactivityTimer: null
};

function resetInactivityTimer() {
    if(state.inactivityTimer) clearTimeout(state.inactivityTimer);
    state.inactivityTimer = setTimeout(logoutUser, 5 * 60 * 1000); // 5 minuti
}

function initActivityListeners() {
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(evt => 
        document.addEventListener(evt, resetInactivityTimer, true)
    );
}

function logoutUser() {
    state.user = null;
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
    if(state.inactivityTimer) clearTimeout(state.inactivityTimer);
}

// Elementi DOM
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userGreeting = document.getElementById('user-greeting');
const inventoryList = document.getElementById('inventory-list');
const ordersList = document.getElementById('orders-list');

// Login / Registrazione Admin
document.getElementById('btn-login').addEventListener('click', async () => {
    const user = document.getElementById('admin-username').value;
    const pass = document.getElementById('admin-password').value;
    const role = document.getElementById('auth-role') ? document.getElementById('auth-role').value : 'admin';
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    
    if(!user || !pass) return errorEl.textContent = 'Inserisci le credenziali.';
    
    try {
        const res = await AuthAPI.login(user, pass, role);
        state.user = res.user;
        showDashboard();
    } catch (e) {
        errorEl.textContent = e.message;
    }
});

document.getElementById('btn-register').addEventListener('click', async () => {
    const user = document.getElementById('admin-username').value;
    const pass = document.getElementById('admin-password').value;
    const role = document.getElementById('auth-role') ? document.getElementById('auth-role').value : 'admin';
    const locId = role === 'branch_manager' ? document.getElementById('auth-location').value : null;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    
    if(!user || !pass) return errorEl.textContent = 'Inserisci username e password.';
    
    try {
        const res = await AuthAPI.register(user, pass, role, locId);
        state.user = res.user;
        showDashboard();
    } catch (e) {
        errorEl.textContent = e.message;
    }
});

document.getElementById('btn-logout').addEventListener('click', logoutUser);

// Passaggio a Dashboard
async function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'flex';
    
    const isBranchManager = state.user.role === 'branch_manager';
    const isAdmin = state.user.role === 'admin';
    
    userGreeting.textContent = isBranchManager ? `Gestore Filiale ${state.user.location_id}: ${state.user.username}` : `Admin: ${state.user.username}`;
    
    // UI basata sul ruolo
    document.getElementById('panel-add-article').style.display = isBranchManager ? 'block' : 'none';
    document.getElementById('panel-update-inv').style.display = isBranchManager ? 'block' : 'none';
    document.getElementById('panel-add-logistics').style.display = isBranchManager ? 'block' : 'none';
    document.getElementById('panel-inventory-global').style.display = 'block'; // Visibile a entrambi
    document.getElementById('panel-users').style.display = isAdmin ? 'block' : 'none';
    
    // Se gestore filiale, mostriamo la sua filiale nei testi fissi
    if (isBranchManager) {
        document.getElementById('inv-loc-text').textContent = `Filiale Selezionata: ${state.user.location_id}`;
        document.getElementById('log-loc-text').textContent = `Filiale Selezionata: ${state.user.location_id}`;
    }
    
    // Nascondi le colonne dell'inventario per le filiali che non competono al gestore
    if (isBranchManager) {
        document.querySelector('.col-branch-1').style.display = state.user.location_id === 1 ? 'table-cell' : 'none';
        document.querySelector('.col-branch-2').style.display = state.user.location_id === 2 ? 'table-cell' : 'none';
        document.querySelector('.col-branch-3').style.display = state.user.location_id === 3 ? 'table-cell' : 'none';
    } else {
        document.querySelector('.col-branch-1').style.display = 'table-cell';
        document.querySelector('.col-branch-2').style.display = 'table-cell';
        document.querySelector('.col-branch-3').style.display = 'table-cell';
    }
    
    resetInactivityTimer();
    initActivityListeners();
    
    await loadGlobalData();
}

// Caricamento Dati Globali
async function loadGlobalData() {
    const isBranchManager = state.user && state.user.role === 'branch_manager';
    const isAdmin = state.user && state.user.role === 'admin';
    const locId = isBranchManager ? state.user.location_id : null;
    
    let usersMap = {};
    let usersList = [];

    // Carica Utenti
    try {
        usersList = await AuthAPI.getAllUsers();
        usersList.forEach(u => usersMap[u.id] = u);
        
        const usersListEl = document.getElementById('users-list');
        if (usersListEl) {
            let uHtml = '';
            const clientsAndManagers = usersList.filter(u => u.role === 'client' || u.role === 'branch_manager');
            if (clientsAndManagers.length === 0) uHtml = '<p>Nessun utente o gestore registrato.</p>';
            clientsAndManagers.forEach(u => {
                const badge = u.role === 'branch_manager' ? `<span style="background:var(--secondary); color:white; padding:0.1rem 0.3rem; border-radius:3px; font-size:0.7rem; margin-left:0.5rem;">Gestore Filiale ${u.location_id}</span>` : '';
                uHtml += `<div style="padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>ID: ${u.id}</strong> | <span style="color:var(--primary)">${u.username}</span> ${badge}
                    </div>
                    <button class="btn secondary-btn" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; background-color: var(--danger);" onclick="deleteUser(${u.id})">Elimina</button>
                </div>`;
            });
            usersListEl.innerHTML = uHtml;
        }
    } catch(e) {
        console.error("Errore utenti:", e);
    }

    // Carica Inventario
    try {
        state.inventory = await InventoryAPI.getInventory(locId);
        if (isBranchManager) {
            state.inventory = state.inventory.filter(i => i.branches && i.branches[locId] > 0);
        }
        renderInventoryTable(state.inventory);
    } catch(e) {
        console.error("Errore inventario:", e);
        inventoryList.innerHTML = `<tr><td colspan="7" style="color: var(--danger); padding: 0.5rem;">Errore caricamento dati inventario.</td></tr>`;
    }
    
    // Carica Logistica
    try {
        const logs = await OrderAPI.getLogistics(locId);
        let logHtml = '';
        if(logs.length === 0) logHtml = '<tr><td colspan="5" style="padding:0.5rem;">Nessun dato logistico.</td></tr>';
        logs.forEach(l => {
            let deleteBtnHtml = state.user.role === 'branch_manager' ? 
                `<button class="btn secondary-btn" style="padding: 0.2rem; font-size: 0.7rem; background-color: var(--danger);" onclick="deleteLogistics(${l.location_id})">Elimina</button>` : '';
            logHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.5rem;">Filiale ${l.location_id}</td>
                <td style="padding: 0.5rem; font-weight: bold;">${l.total_vehicles}</td>
                <td style="padding: 0.5rem; color: var(--danger);">${l.in_use_vehicles}</td>
                <td style="padding: 0.5rem; color: var(--success);">${l.available_vehicles}</td>
                <td style="padding: 0.5rem;">${deleteBtnHtml}</td>
            </tr>`;
        });
        document.getElementById('logistics-list').innerHTML = logHtml;
    } catch(e) {
        console.error("Errore logistica:", e);
    }

    // Carica Ordini
    try {
        const ords = await OrderAPI.getAllOrders(locId);
        state.orders = ords;
        
        const ordersTableBody = document.getElementById('orders-table-body');
        if (ordersTableBody) {
            let ordHtml = '';
            if(ords.length === 0) ordHtml = '<tr><td colspan="5" style="padding:0.5rem;">Nessun ordine presente.</td></tr>';
            
            // Colonna "Filiali Coinvolte" nascosta per i branch manager
            const thBranches = document.querySelector('.col-branches');
            if (thBranches) thBranches.style.display = isBranchManager ? 'none' : 'table-cell';
            
            ords.forEach(o => {
                const color = o.status === 'FAILED' ? 'var(--danger)' : 'var(--success)';
                const locs = o.locations && o.locations.length > 0 ? o.locations.join(', ') : 'N/A';
                
                // Estrai nomi prodotti
                const productNames = o.items && o.items.length > 0 ? o.items.map(item => {
                    const art = state.inventory ? state.inventory.find(i => i.id === item.article_id) : null;
                    return art ? `${art.name} (x${item.quantity})` : `Articolo #${item.article_id} (x${item.quantity})`;
                }).join('<br>') : 'Nessuno';
                
                // Estrai nome utente
                const userName = usersMap[o.user_id] ? usersMap[o.user_id].username : `Utente #${o.user_id}`;
                
                let locsCell = isBranchManager ? '' : `<td style="padding: 0.5rem;">${locs}</td>`;
                
                let deleteBtn = isAdmin ? `<button class="btn secondary-btn" style="padding: 0.1rem 0.3rem; font-size: 0.7rem; background-color: var(--danger); margin-left: 0.5rem;" onclick="deleteOrder(${o.id})">Elimina</button>` : '';

                ordHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td style="padding: 0.5rem;"><strong>#${o.id}</strong> ${deleteBtn}</td>
                    <td style="padding: 0.5rem; font-size: 0.8rem;">${productNames}</td>
                    <td style="padding: 0.5rem;">${userName}</td>
                    ${locsCell}
                    <td style="padding: 0.5rem;"><span style="color:${color}">${o.status}</span></td>
                </tr>`;
            });
            ordersTableBody.innerHTML = ordHtml;
        }
    } catch(e) {
        console.error("Errore ordini:", e);
        const ordersTableBody = document.getElementById('orders-table-body');
        if (ordersTableBody) ordersTableBody.innerHTML = '<tr><td colspan="5" style="padding:0.5rem; color:var(--danger)">Errore caricamento ordini.</td></tr>';
    }
}

function renderInventoryTable(items) {
    let invHtml = '';
    if(!items || items.length === 0) {
        inventoryList.innerHTML = '<tr><td colspan="7" style="padding: 0.5rem;">Nessun dato.</td></tr>';
        return;
    }
    const isBranchManager = state.user && state.user.role === 'branch_manager';
    const locId = state.user ? state.user.location_id : null;

    items.forEach(i => {
        let deleteBtnHtml = state.user && state.user.role === 'branch_manager' ? 
            `<button class="btn secondary-btn" style="padding: 0.1rem 0.3rem; font-size: 0.7rem; background-color: var(--danger); margin-left: 0.5rem;" onclick="deleteArticle(${i.id})">Elimina</button>` : '';
        
        let branchCols = '';
        if (isBranchManager) {
            if (locId === 1) branchCols = `<td style="padding: 0.5rem;">${i.branches['1'] || 0}</td><td style="display:none;"></td><td style="display:none;"></td>`;
            else if (locId === 2) branchCols = `<td style="display:none;"></td><td style="padding: 0.5rem;">${i.branches['2'] || 0}</td><td style="display:none;"></td>`;
            else if (locId === 3) branchCols = `<td style="display:none;"></td><td style="display:none;"></td><td style="padding: 0.5rem;">${i.branches['3'] || 0}</td>`;
        } else {
            branchCols = `
                <td style="padding: 0.5rem;">${i.branches['1'] || 0}</td>
                <td style="padding: 0.5rem;">${i.branches['2'] || 0}</td>
                <td style="padding: 0.5rem;">${i.branches['3'] || 0}</td>
            `;
        }

        invHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 0.5rem;">${i.id}</td>
            <td style="padding: 0.5rem; font-weight:bold;">${i.name} ${deleteBtnHtml}</td>
            <td style="padding: 0.5rem; color: var(--primary);">${i.total_available}</td>
            <td style="padding: 0.5rem; color: var(--success);">${i.total_sales || 0}</td>
            ${branchCols}
        </tr>`;
    });
    inventoryList.innerHTML = invHtml;
}

document.getElementById('search-inventory').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!state.inventory) return;
    const filtered = state.inventory.filter(i => 
        i.name.toLowerCase().includes(term) || i.id.toString().includes(term)
    );
    renderInventoryTable(filtered);
});

// Aggiungi Articolo
document.getElementById('btn-add-article').addEventListener('click', async () => {
    const name = document.getElementById('art-name').value;
    const desc = document.getElementById('art-desc').value;
    const price = parseFloat(document.getElementById('art-price').value);
    
    let quantities = { "1": 0, "2": 0, "3": 0 };
    if (state.user && state.user.role === 'branch_manager') {
        quantities[state.user.location_id.toString()] = parseInt(document.getElementById('art-qty-loc').value) || 0;
    }
    const msg = document.getElementById('msg-add-article');
    
    if(!name || !price) {
        msg.textContent = 'Nome e prezzo richiesti';
        msg.style.color = 'var(--danger)';
        return;
    }
    
    try {
        await InventoryAPI.addArticle({ 
            name, 
            description: desc, 
            price,
            quantities: quantities
        });
        msg.textContent = 'Articolo inserito con successo.';
        msg.style.color = 'var(--success)';
        document.getElementById('art-name').value = '';
        document.getElementById('art-desc').value = '';
        document.getElementById('art-price').value = '';
        if (state.user && state.user.role === 'branch_manager') {
            document.getElementById('art-qty-loc').value = '0';
        }
        loadGlobalData();
    } catch(e) {
        msg.textContent = e.message;
        msg.style.color = 'var(--danger)';
    }
});

// Aggiorna Giacenza
document.getElementById('btn-update-inv').addEventListener('click', async () => {
    const artId = document.getElementById('inv-art-id').value;
    const locId = state.user.location_id;
    const qty = document.getElementById('inv-qty').value;
    const msg = document.getElementById('msg-update-inv');
    
    if(!artId || !qty) return;
    
    try {
        await InventoryAPI.updateInventory(parseInt(artId), parseInt(locId), parseInt(qty));
        msg.textContent = 'Giacenza aggiornata.';
        msg.style.color = 'var(--success)';
        loadGlobalData();
    } catch(e) {
        msg.textContent = e.message;
        msg.style.color = 'var(--danger)';
    }
});

// Aggiorna Logistica
document.getElementById('btn-update-log').addEventListener('click', async () => {
    const locId = state.user.location_id;
    const qty = document.getElementById('log-qty').value;
    const msg = document.getElementById('msg-update-log');
    
    if(!qty) return;
    
    try {
        await OrderAPI.updateLogistics(parseInt(locId), parseInt(qty));
        msg.textContent = 'Veicoli aggiornati.';
        msg.style.color = 'var(--success)';
        loadGlobalData();
    } catch(e) {
        msg.textContent = e.message;
        msg.style.color = 'var(--danger)';
    }
});

window.viewOrderDetails = (orderId) => {
    const order = state.orders.find(o => o.id === orderId);
    if(!order) return;
    
    document.getElementById('modal-order-id').textContent = `#${order.id}`;
    
    let html = `
        <p><strong>Utente ID:</strong> ${order.user_id}</p>
        <p><strong>Stato:</strong> ${order.status}</p>
        <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <hr style="border:0; border-top: 1px solid var(--border); margin: 1rem 0;">
        <h4>Articoli Prelevati:</h4>
        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
    `;
    
    if(order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const articleInfo = state.inventory ? state.inventory.find(a => a.id === item.article_id) : null;
            const articleName = articleInfo ? articleInfo.name : `Articolo Sconosciuto`;
            html += `<li style="margin-bottom: 0.5rem;">
                <strong style="color:var(--secondary)">${articleName}</strong> (ID: ${item.article_id}) - Quantità: <span style="color:var(--primary)">${item.quantity}</span> 
                (da Filiale ${item.location_id || 'N/A'})
            </li>`;
        });
    } else {
        html += `<li>Nessun articolo</li>`;
    }
    
    html += `</ul>`;
    
    document.getElementById('modal-order-content').innerHTML = html;
    document.getElementById('order-modal').style.display = 'flex';
};

window.closeOrderModal = () => {
    document.getElementById('order-modal').style.display = 'none';
};

window.deleteUser = async (userId) => {
    if(!confirm("Sei sicuro di voler eliminare questo utente?")) return;
    try {
        await AuthAPI.deleteUser(userId);
        alert("Utente eliminato.");
        await loadGlobalData();
    } catch(e) {
        alert("Errore durante l'eliminazione dell'utente: " + e.message);
    }
};

window.deleteArticle = async (articleId) => {
    if(!confirm("Sei sicuro di voler eliminare questo articolo e le relative giacenze?")) return;
    try {
        await InventoryAPI.deleteArticle(articleId);
        alert("Articolo eliminato.");
        await loadGlobalData();
    } catch(e) {
        alert("Errore durante l'eliminazione dell'articolo: " + e.message);
    }
};

window.deleteLogistics = async (locationId) => {
    if(!confirm(`Sei sicuro di voler eliminare i mezzi della Filiale ${locationId}?`)) return;
    try {
        await OrderAPI.deleteLogistics(locationId);
        alert("Mezzi eliminati.");
        await loadGlobalData();
    } catch(e) {
        alert("Errore durante l'eliminazione della logistica: " + e.message);
    }
};

window.deleteOrder = async (orderId) => {
    if(!confirm(`Sei sicuro di voler eliminare l'ordine #${orderId}?`)) return;
    try {
        await OrderAPI.deleteOrder(orderId);
        alert("Ordine eliminato.");
        await loadGlobalData();
    } catch(e) {
        alert("Errore durante l'eliminazione dell'ordine: " + e.message);
    }
};

// Listeners Modale
document.getElementById('close-order-modal').addEventListener('click', closeOrderModal);
