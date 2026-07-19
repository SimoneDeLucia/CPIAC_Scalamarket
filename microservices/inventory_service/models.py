from app import db

class Article(db.Model):
    __tablename__ = 'articles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    total_sales = db.Column(db.Integer, default=0)
    
    inventory = db.relationship('Inventory', backref='article', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'total_sales': self.total_sales
        }

class Inventory(db.Model):
    __tablename__ = 'inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.id'), nullable=False)
    location_id = db.Column(db.Integer, nullable=False) # 1, 2, or 3 for the three branches
    quantity = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'article_id': self.article_id,
            'location_id': self.location_id,
            'quantity': self.quantity
        }
