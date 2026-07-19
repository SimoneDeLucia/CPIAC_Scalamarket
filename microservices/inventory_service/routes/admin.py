from flask import Blueprint, jsonify, request
from models import Article, Inventory
from app import db
from services.business_logic import update_inventory

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/article', methods=['POST'])
def add_article():
    data = request.get_json()
    new_article = Article(
        name=data.get('name'),
        description=data.get('description'),
        price=data.get('price')
    )
    db.session.add(new_article)
    db.session.commit()
    
    quantities = data.get('quantities', {})
    
    # Initialize inventory using provided quantities or 0
    for loc_id in [1, 2, 3]:
        qty = int(quantities.get(str(loc_id), 0))
        db.session.add(Inventory(article_id=new_article.id, location_id=loc_id, quantity=qty))
    db.session.commit()
    
    return jsonify({'message': 'Article added', 'article': new_article.to_dict()}), 201

@admin_bp.route('/inventory', methods=['PUT'])
def modify_inventory():
    data = request.get_json()
    article_id = data.get('article_id')
    location_id = data.get('location_id')
    new_quantity = data.get('quantity')
    
    success = update_inventory(article_id, location_id, new_quantity)
    if success:
        return jsonify({'message': 'Inventory updated successfully'})
    return jsonify({'error': 'Failed to update inventory'}), 400

@admin_bp.route('/inventory', methods=['GET'])
def view_inventory():
    location_id_filter = request.args.get('location_id')
    articles = Article.query.all()
    res = []
    for art in articles:
        d = art.to_dict()
        invs_query = Inventory.query.filter_by(article_id=art.id)
        if location_id_filter:
            invs_query = invs_query.filter_by(location_id=int(location_id_filter))
        invs = invs_query.all()
        
        d['total_available'] = sum(i.quantity for i in invs)
        d['branches'] = {i.location_id: i.quantity for i in invs}
        
        # Branch managers need to see the article to add inventory, even if currently 0
        res.append(d)
    return jsonify(res)

@admin_bp.route('/article/<int:article_id>', methods=['DELETE'])
def delete_article(article_id):
    article = Article.query.get(article_id)
    if article:
        # Delete associated inventory first
        Inventory.query.filter_by(article_id=article_id).delete()
        db.session.delete(article)
        db.session.commit()
        return jsonify({'message': 'Article deleted successfully'}), 200
    return jsonify({'error': 'Article not found'}), 404

@admin_bp.route('/inventory/<int:article_id>/<int:location_id>', methods=['DELETE'])
def delete_inventory(article_id, location_id):
    inv = Inventory.query.filter_by(article_id=article_id, location_id=location_id).first()
    if inv:
        db.session.delete(inv)
        db.session.commit()
        return jsonify({'message': 'Inventory entry deleted successfully'}), 200
    return jsonify({'error': 'Inventory entry not found'}), 404

@admin_bp.route('/internal/allocate', methods=['POST'])
def allocate_inventory():
    data = request.get_json()
    items = data.get('items', [])
    allocated_result = []
    
    # Check if stock is available
    for req_item in items:
        article_id = req_item.get('article_id')
        qty = req_item.get('quantity')
        invs = Inventory.query.filter_by(article_id=article_id).all()
        total_avail = sum(i.quantity for i in invs)
        if total_avail < qty:
            return jsonify({'error': f'Not enough stock for article {article_id}'}), 400

    # Execute allocation
    for req_item in items:
        article_id = req_item.get('article_id')
        qty_needed = req_item.get('quantity')
        invs = Inventory.query.filter_by(article_id=article_id).order_by(Inventory.location_id).all()
        
        for inv in invs:
            if qty_needed <= 0:
                break
            if inv.quantity > 0:
                taken = min(inv.quantity, qty_needed)
                inv.quantity -= taken
                qty_needed -= taken
                allocated_result.append({
                    'article_id': article_id,
                    'quantity': taken,
                    'location_id': inv.location_id
                })
        
        article = Article.query.get(article_id)
        if article:
            article.total_sales += req_item.get('quantity')

    db.session.commit()
    return jsonify({'allocations': allocated_result})
