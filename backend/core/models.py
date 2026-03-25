from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from core.extensions import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100))
    email_alerts_enabled = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    last_login_ip = db.Column(db.String(100), nullable=True)
    verification_token = db.Column(db.String(100), unique=True, nullable=True) # Keep for link compatibility (optional)
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    attacker_ip = db.Column(db.String(50), nullable=False)
    payload = db.Column(db.Text)
    action_taken = db.Column(db.String(50), default='BLOCKED')

