from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'postgresql://admin:password@localhost:5432/order_db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    CORS(app)

    db.init_app(app)

    with app.app_context():
        from routes.client import client_bp
        from routes.admin import admin_bp
        
        app.register_blueprint(client_bp, url_prefix='/client')
        app.register_blueprint(admin_bp, url_prefix='/admin')
        
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5003)
