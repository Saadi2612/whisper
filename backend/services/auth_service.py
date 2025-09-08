import os
import jwt
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

class AuthService:
    def __init__(self, db):
        self.db = db
        self.secret_key = os.environ.get('JWT_SECRET_KEY', 'whisper-dashboard-secret-key-2025')
        self.algorithm = 'HS256'
        self.token_expire_hours = 24 * 7  # 1 week
    
    def hash_password(self, password: str) -> str:
        """Hash password with salt"""
        salt = "whisper-salt-2025"
        return hashlib.sha256((password + salt).encode()).hexdigest()
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return self.hash_password(password) == hashed
    
    def create_access_token(self, user_id: str) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(hours=self.token_expire_hours)
        payload = {
            'user_id': user_id,
            'exp': expire,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token is blacklisted
            if await self.is_token_blacklisted(token):
                return None
                
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        try:
            blacklisted_token = await self.db.blacklisted_tokens.find_one({'token': token})
            return blacklisted_token is not None
        except Exception as e:
            # If there's an error checking blacklist, assume token is valid for security
            return False
    
    async def blacklist_token(self, token: str, user_id: str) -> bool:
        """Add token to blacklist"""
        try:
            # Decode token to get expiration time
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm], options={"verify_exp": False})
            exp_timestamp = payload.get('exp')
            
            blacklist_data = {
                'token': token,
                'user_id': user_id,
                'blacklisted_at': datetime.utcnow(),
                'expires_at': datetime.fromtimestamp(exp_timestamp) if exp_timestamp else None
            }
            
            await self.db.blacklisted_tokens.insert_one(blacklist_data)
            return True
        except Exception as e:
            return False
    
    async def cleanup_expired_blacklisted_tokens(self) -> int:
        """Remove expired blacklisted tokens from database"""
        try:
            result = await self.db.blacklisted_tokens.delete_many({
                'expires_at': {'$lt': datetime.utcnow()}
            })
            return result.deleted_count
        except Exception as e:
            return 0
    
    async def create_user(self, email: str, password: str, name: str) -> Dict[str, Any]:
        """Create new user account"""
        try:
            # Check if user exists
            existing_user = await self.db.users.find_one({'email': email})
            if existing_user:
                return {'status': 'error', 'error': 'User already exists'}
            
            # Create user
            user_data = {
                'email': email,
                'password_hash': self.hash_password(password),
                'name': name,
                'created_at': datetime.utcnow(),
                'last_login': datetime.utcnow(),
                'settings': {
                    'auto_process_channels': True,
                    'notification_email': True,
                    'process_frequency': 'hourly'
                }
            }
            
            result = await self.db.users.insert_one(user_data)
            user_id = str(result.inserted_id)
            
            # Create access token
            token = self.create_access_token(user_id)
            
            return {
                'status': 'success',
                'user': {
                    'id': user_id,
                    'email': email,
                    'name': name
                },
                'token': token
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    async def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return token"""
        try:
            user = await self.db.users.find_one({'email': email})
            
            if not user or not self.verify_password(password, user['password_hash']):
                return {'status': 'error', 'error': 'Invalid credentials'}
            
            # Update last login
            await self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'last_login': datetime.utcnow()}}
            )
            
            token = self.create_access_token(str(user['_id']))
            
            return {
                'status': 'success',
                'user': {
                    'id': str(user['_id']),
                    'email': user['email'],
                    'name': user['name']
                },
                'token': token
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            from bson import ObjectId
            user = await self.db.users.find_one({'_id': ObjectId(user_id)})
            
            if user:
                return {
                    'id': str(user['_id']),
                    'email': user['email'],
                    'name': user['name'],
                    'settings': user.get('settings', {})
                }
            return None
            
        except Exception as e:
            return None