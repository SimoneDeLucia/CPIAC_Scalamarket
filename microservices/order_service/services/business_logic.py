from app import db
from models import Logistics, OrderItem
import requests

import os

INVENTORY_SERVICE_URL = os.environ.get('INVENTORY_SERVICE_URL', 'http://inventory-service:5002')

def route_order(order):
    """
    Business Logic: Routing degli Ordini
    Comunica con l'inventario per allocare i prodotti (eventualmente splittandoli)
    e aggiorna i mezzi logistici delle filiali coinvolte.
    """
    items_payload = [{'article_id': item.article_id, 'quantity': item.quantity} for item in order.items]
    
    # Check if there is at least one vehicle available before proceeding
    available_vehicles = False
    for l in Logistics.query.all():
        if l.available_vehicles > 0:
            available_vehicles = True
            break
            
    if not available_vehicles:
        return None

    
    try:
        response = requests.post(f"{INVENTORY_SERVICE_URL}/admin/internal/allocate", json={'items': items_payload})
        if response.status_code != 200:
            return None # Not enough stock
        
        allocations = response.json().get('allocations', [])
    except Exception as e:
        print(f"Error communicating with inventory: {e}")
        return None

    if not allocations:
        return None

    # Replace original items with allocated items (split by location)
    for item in order.items:
        db.session.delete(item)
    
    locations_involved = set()
    for alloc in allocations:
        new_item = OrderItem(
            order_id=order.id,
            article_id=alloc['article_id'],
            quantity=alloc['quantity'],
            location_id=alloc['location_id']
        )
        db.session.add(new_item)
        locations_involved.add(alloc['location_id'])

    # Update Logistics
    for loc_id in locations_involved:
        logistics = Logistics.query.filter_by(location_id=loc_id).first()
        if logistics:
            logistics.in_use_vehicles += 1

    order.status = 'ROUTED'
    db.session.commit()
    return order
