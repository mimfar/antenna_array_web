import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
    CORS_METHODS = ['GET', 'POST', 'OPTIONS']
    CORS_ALLOW_HEADERS = ['Content-Type']
    CORS_SUPPORTS_CREDENTIALS = False
    
    # API Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Cache Configuration
    CACHE_TIMEOUT = int(os.environ.get('CACHE_TIMEOUT', 3600))  # 1 hour default
    
    # Security Configuration
    MAX_ELEMENTS = int(os.environ.get('MAX_ELEMENTS', 1000))  # Maximum array elements
    MAX_SPACING = float(os.environ.get('MAX_SPACING', 10.0))  # Maximum element spacing

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    # In production, you should set CORS_ORIGINS via environment variable
    # Example: CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    CORS_ORIGINS = ['http://localhost:3000']

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment"""
    env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default']) 