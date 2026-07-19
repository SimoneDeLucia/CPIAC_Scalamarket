from flask import Blueprint, jsonify, request
from services.business_logic import register_user, authenticate_user

client_bp = Blueprint('client_bp', __name__)

@client_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = register_user(username, password, 'client')
    if user:
        return jsonify({'message': 'Client registered successfully', 'user': user.to_dict()}), 201
    return jsonify({'error': 'Registration failed'}), 400

@client_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = authenticate_user(username, password, 'client')
    if user:
        return jsonify({'message': 'Client logged in successfully', 'user': user.to_dict()}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@client_bp.route('/profile', methods=['GET'])
def profile():
    # TODO: Add JWT authentication to fetch the profile
    return jsonify({'message': 'Client profile information'})
