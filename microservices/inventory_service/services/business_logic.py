from app import db
from models import Inventory

def update_inventory(article_id, location_id, new_quantity):
    try:
        inventory_record = Inventory.query.filter_by(article_id=article_id, location_id=location_id).first()
        if inventory_record:
            inventory_record.quantity = new_quantity
            db.session.commit()
            return True
        return False
    except Exception as e:
        db.session.rollback()
        print(f"Error updating inventory: {e}")
        return False

def check_availability(article_id, required_quantity):
    """
    Checks if an article is available in any of the locations.
    This might be called internally or via an API endpoint from the Order Service.
    """
    inventory_records = Inventory.query.filter_by(article_id=article_id).all()
    available_locations = []
    
    for record in inventory_records:
        if record.quantity >= required_quantity:
            available_locations.append({
                'location_id': record.location_id,
                'available_quantity': record.quantity
            })
            
    return available_locations
