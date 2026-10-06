from flask import Blueprint, jsonify, request
from models import Order, Logistics
from app import db

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/orders', methods=['GET'])
def get_all_orders():
    location_id_filter = request.args.get('location_id')
    orders = Order.query.all()
    if location_id_filter:
        loc_id = int(location_id_filter)
        # Filter orders to only include those where at least one item has the matching location_id
        filtered_orders = []
        for order in orders:
            if any(item.location_id == loc_id for item in order.items):
                filtered_orders.append(order)
        orders = filtered_orders
        
    return jsonify([order.to_dict() for order in orders])

@admin_bp.route('/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    order = Order.query.get(order_id)
    if order:
        # Logistics is tricky to restore, but we simply delete the order
        db.session.delete(order)
        db.session.commit()
        return jsonify({'message': 'Order deleted successfully'}), 200
    return jsonify({'error': 'Order not found'}), 404

@admin_bp.route('/logistics', methods=['GET'])
def get_logistics():
    location_id_filter = request.args.get('location_id')
    if location_id_filter:
        logistics = Logistics.query.filter_by(location_id=int(location_id_filter)).all()
    else:
        logistics = Logistics.query.all()
    return jsonify([log.to_dict() for log in logistics])

@admin_bp.route('/logistics/<int:location_id>', methods=['DELETE'])
def delete_logistics(location_id):
    log = Logistics.query.filter_by(location_id=location_id).first()
    if log:
        db.session.delete(log)
        db.session.commit()
        return jsonify({'message': 'Logistics entry deleted successfully'}), 200
    return jsonify({'error': 'Logistics entry not found'}), 404

@admin_bp.route('/logistics', methods=['PUT'])
def update_logistics():
    data = request.get_json()
    location_id = data.get('location_id')
    total_vehicles = data.get('total_vehicles')
    
    log = Logistics.query.filter_by(location_id=location_id).first()
    if log:
        log.total_vehicles = total_vehicles
    else:
        log = Logistics(location_id=location_id, total_vehicles=total_vehicles, in_use_vehicles=0)
        db.session.add(log)
        
    db.session.commit()
    return jsonify({'message': 'Logistics updated', 'logistics': log.to_dict()})
