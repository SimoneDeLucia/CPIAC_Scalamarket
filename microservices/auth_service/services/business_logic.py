from models import User
from app import db
import hashlib

def hash_password(password):
    # This is a basic hash for demonstration. In production, use bcrypt or similar.
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def register_user(username, password, role, location_id=None):
    try:
        if User.query.filter_by(username=username).first():
            return None # User already exists
        
        new_user = User(
            username=username,
            password_hash=hash_password(password),
            role=role,
            location_id=location_id
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user
    except Exception as e:
        db.session.rollback()
        print(f"Error registering user: {e}")
        return None

def authenticate_user(username, password, expected_roles):
    if isinstance(expected_roles, str):
        expected_roles = [expected_roles]
        
    user = User.query.filter_by(username=username).first()
    if user and user.password_hash == hash_password(password) and user.role in expected_roles:
        return user
    return None
