from flask import Blueprint, jsonify, request
from services.business_logic import register_user, authenticate_user
from models import User

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'admin') # Default to admin if not provided
    location_id = data.get('location_id')
    
    # Ensure role is valid
    if role not in ['admin', 'branch_manager']:
        return jsonify({'error': 'Invalid role'}), 400
        
    user = register_user(username, password, role, location_id)
    if user:
        return jsonify({'message': f'{role.capitalize()} registered successfully', 'user': user.to_dict()}), 201
    return jsonify({'error': 'Registration failed'}), 400

@admin_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = authenticate_user(username, password, ['admin', 'branch_manager'])
    if user:
        return jsonify({'message': 'Logged in successfully', 'user': user.to_dict()}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@admin_bp.route('/users', methods=['GET'])
def list_users():
    # TODO: Add authentication and authorization check
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    from app import db
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    return jsonify({'error': 'User not found'}), 404
