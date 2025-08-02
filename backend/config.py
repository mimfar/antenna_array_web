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
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB default
    
    # Cache Configuration
    CACHE_TIMEOUT = int(os.environ.get('CACHE_TIMEOUT', 3600))  # 1 hour default
    CACHE_MAX_SIZE = int(os.environ.get('CACHE_MAX_SIZE', 100))  # 100 items default
    
    # Security Configuration
    MAX_ELEMENTS = int(os.environ.get('MAX_ELEMENTS', 1000))  # Maximum array elements
    MAX_SPACING = float(os.environ.get('MAX_SPACING', 10.0))  # Maximum element spacing
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/app.log')
    LOG_MAX_SIZE = int(os.environ.get('LOG_MAX_SIZE', 10240))  # 10KB default
    LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', 10))
    
    # Server Configuration
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5001))
    
    # Rate Limiting Configuration
    RATE_LIMIT_DEFAULT = os.environ.get('RATE_LIMIT_DEFAULT', '3600 per hour')
    RATE_LIMIT_LINEAR = os.environ.get('RATE_LIMIT_LINEAR', '60 per minute')
    RATE_LIMIT_PLANAR = os.environ.get('RATE_LIMIT_PLANAR', '60 per minute')
    
    # Content Security Policy Configuration
    CSP_ENABLED = os.environ.get('CSP_ENABLED', 'true').lower() == 'true'
    CSP_REPORT_ONLY = os.environ.get('CSP_REPORT_ONLY', 'false').lower() == 'true'
    CSP_REPORT_URI = os.environ.get('CSP_REPORT_URI', '')
    
    # CSP Directives - Use lists instead of split() to preserve quoted strings
    CSP_SCRIPT_SRC = ["'self'", "'nonce-{nonce}'", "https://cdn.plot.ly"]
    CSP_STYLE_SRC = ["'self'", "'unsafe-inline'"]  # unsafe-inline needed for React styles
    CSP_IMG_SRC = ["'self'", "data:", "https:"]
    CSP_CONNECT_SRC = ["'self'", "https://forms.gle"]
    CSP_FONT_SRC = ["'self'"]
    CSP_OBJECT_SRC = ["'none'"]
    CSP_BASE_URI = ["'self'"]
    CSP_FORM_ACTION = ["'self'"]
    CSP_FRAME_ANCESTORS = ["'none'"]

class DevelopmentConfig(Config):
    """Development configuration"""
    ENV = 'development'
    DEBUG = True
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    
class ProductionConfig(Config):
    """Production configuration"""
    ENV = 'production'
    DEBUG = False
    # In production, you should set CORS_ORIGINS via environment variable
    # Example: CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
    
class TestingConfig(Config):
    """Testing configuration"""
    ENV = 'testing'
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