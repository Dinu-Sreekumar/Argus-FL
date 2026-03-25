import os
import secrets

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    # Security adjustments for production vs dev
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///db.sqlite3'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Mail settings
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_SENDER_ALIAS = os.environ.get('MAIL_SENDER_ALIAS', 'Argus System')

    # Allowed CORS Origins
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5001",
        "http://127.0.0.1:5001"
    ]
    
    # File Paths (Relative to backend root)
    # Using absolute paths based on where this file is (backend/core/config.py)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend/
    
    MODEL_DIR = os.path.join(BASE_DIR, 'models', 'saved_models')
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    PARTITIONS_DIR = os.path.join(DATA_DIR, 'partitions')
    
    # Ensure directories exist
    @staticmethod
    def init_app(app):
        os.makedirs(Config.MODEL_DIR, exist_ok=True)
        os.makedirs(Config.PARTITIONS_DIR, exist_ok=True)
