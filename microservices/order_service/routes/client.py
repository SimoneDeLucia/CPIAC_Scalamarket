from flask import Blueprint, request, jsonify
from models import Order, OrderItem
from services.business_logic import route_order
from app import db

client_bp = Blueprint('client_bp', __name__)

@client_bp.route('/order', methods=['POST'])
def place_order():
    data = request.get_json()
    user_id = data.get('user_id')
    items = data.get('items') # List of {'article_id': X, 'quantity': Y}
    
    # 1. Create Order
    new_order = Order(user_id=user_id)
    db.session.add(new_order)
    db.session.flush() # Get the new_order ID
    
    # 2. Add Items
    for item in items:
        order_item = OrderItem(
            order_id=new_order.id,
            article_id=item['article_id'],
            quantity=item['quantity']
        )
        db.session.add(order_item)
        
    db.session.commit()
    
    # 3. Route Order (Business Logic Requirement 1)
    routed_order = route_order(new_order)
    
    if routed_order:
        return jsonify({'message': 'Order placed and routed', 'order': routed_order.to_dict()}), 201
    else:
        # If routing failed (e.g. no stock or no vehicles)
        new_order.status = 'FAILED'
        db.session.commit()
        return jsonify({'error': 'Order could not be routed due to lack of resources'}), 400

@client_bp.route('/order/<int:order_id>', methods=['GET'])
def get_order_status(order_id):
    order = Order.query.get(order_id)
    if order:
        return jsonify(order.to_dict())
    return jsonify({'error': 'Order not found'}), 404

@client_bp.route('/order/user/<int:user_id>', methods=['GET'])
def get_user_orders(user_id):
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders])
