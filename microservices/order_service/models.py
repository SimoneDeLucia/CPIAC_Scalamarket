from app import db
from datetime import datetime

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='PENDING') # PENDING, ROUTED, SHIPPED, DELIVERED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    items = db.relationship('OrderItem', backref='order', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'locations': list(set(item.location_id for item in self.items if item.location_id)),
            'items': [item.to_dict() for item in self.items]
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    article_id = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    location_id = db.Column(db.Integer, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'article_id': self.article_id,
            'quantity': self.quantity,
            'location_id': self.location_id
        }

class Logistics(db.Model):
    __tablename__ = 'logistics'
    
    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, nullable=False)
    total_vehicles = db.Column(db.Integer, default=1)
    in_use_vehicles = db.Column(db.Integer, default=0)
    
    @property
    def available_vehicles(self):
        return self.total_vehicles - self.in_use_vehicles
    
    def to_dict(self):
        return {
            'id': self.id,
            'location_id': self.location_id,
            'total_vehicles': self.total_vehicles,
            'in_use_vehicles': self.in_use_vehicles,
            'available_vehicles': self.available_vehicles
        }
