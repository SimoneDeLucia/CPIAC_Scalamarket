const API_ENDPOINTS = {
    auth: 'http://localhost:5001',
    inventory: 'http://localhost:5002',
    order: 'http://localhost:5003'
};

/**
 * Funzione di utilità per chiamate API generiche
 */
async function fetchApi(service, path, options = {}) {
    const url = `${API_ENDPOINTS[service]}${path}`;
    
    // Add default headers for JSON
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Errore nella richiesta API');
        }
        
        return data;
    } catch (error) {
        console.error(`API Error [${service}${path}]:`, error);
        throw error;
    }
}

// ----------------------------------------------------
// Moduli specifici per i servizi
// ----------------------------------------------------

const AuthAPI = {
    login: async (username, password, role = 'admin') => {
        return fetchApi('auth', `/${role === 'client' ? 'client' : 'admin'}/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    register: async (username, password, role = 'admin', locationId = null) => {
        return fetchApi('auth', `/${role === 'client' ? 'client' : 'admin'}/register`, {
            method: 'POST',
            body: JSON.stringify({ username, password, role, location_id: locationId })
        });
    },
    getAllUsers: async () => {
        return fetchApi('auth', '/admin/users');
    },
    deleteUser: async (userId) => {
        return fetchApi('auth', `/admin/users/${userId}`, { method: 'DELETE' });
    }
};

const InventoryAPI = {
    getCatalog: async () => {
        return fetchApi('inventory', '/client/catalog');
    },
    getInventory: async (locationId = null) => {
        const url = locationId ? `/admin/inventory?location_id=${locationId}` : '/admin/inventory';
        return fetchApi('inventory', url);
    },
    addArticle: async (articleData) => {
        return fetchApi('inventory', '/admin/article', {
            method: 'POST',
            body: JSON.stringify(articleData)
        });
    },
    deleteArticle: async (articleId) => {
        return fetchApi('inventory', `/admin/article/${articleId}`, { method: 'DELETE' });
    },
    updateInventory: async (articleId, locationId, quantity) => {
        return fetchApi('inventory', '/admin/inventory', {
            method: 'PUT',
            body: JSON.stringify({ article_id: articleId, location_id: locationId, quantity })
        });
    }
};

const OrderAPI = {
    placeOrder: async (userId, items) => {
        return fetchApi('order', '/client/order', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, items })
        });
    },
    getOrderStatus: async (orderId) => {
        return fetchApi('order', `/client/order/${orderId}`);
    },
    getUserOrders: async (userId) => {
        return fetchApi('order', `/client/order/user/${userId}`);
    },
    getAllOrders: async (locationId = null) => {
        const url = locationId ? `/admin/orders?location_id=${locationId}` : '/admin/orders';
        return fetchApi('order', url);
    },
    getLogistics: async (locationId = null) => {
        const url = locationId ? `/admin/logistics?location_id=${locationId}` : '/admin/logistics';
        return fetchApi('order', url);
    },
    updateLogistics: async (locationId, totalVehicles) => {
        return fetchApi('order', '/admin/logistics', {
            method: 'PUT',
            body: JSON.stringify({ location_id: locationId, total_vehicles: totalVehicles })
        });
    },
    deleteLogistics: async (locationId) => {
        return fetchApi('order', `/admin/logistics/${locationId}`, { method: 'DELETE' });
    }
};
