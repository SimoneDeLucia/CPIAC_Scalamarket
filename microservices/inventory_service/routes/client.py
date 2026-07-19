from flask import Blueprint, jsonify
from models import Article, Inventory

client_bp = Blueprint('client_bp', __name__)

@client_bp.route('/catalog', methods=['GET'])
def get_catalog():
    # Clients can view the available articles with total aggregated availability
    articles = Article.query.all()
    res = []
    for art in articles:
        d = art.to_dict()
        invs = Inventory.query.filter_by(article_id=art.id).all()
        d['total_available'] = sum(i.quantity for i in invs)
        res.append(d)
    return jsonify(res)

@client_bp.route('/article/<int:article_id>', methods=['GET'])
def get_article(article_id):
    article = Article.query.get(article_id)
    if article:
        return jsonify(article.to_dict())
    return jsonify({'error': 'Article not found'}), 404
