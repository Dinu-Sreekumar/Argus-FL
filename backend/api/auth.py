from flask import Blueprint, request, jsonify, redirect
from flask_login import login_user, logout_user, login_required, current_user
from core.models import User
from core.extensions import db
from utils.notifier import send_verification_email, send_password_reset_email
import logging
import uuid
from datetime import datetime, timedelta

auth = Blueprint('auth', __name__)
logger = logging.getLogger("ArgusAuth")

@auth.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password:
        return jsonify({'error': 'Email and Password required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Generate Token & OTP
    token = str(uuid.uuid4())
    import random
    import string
    otp_code = ''.join(random.choices(string.digits, k=6))
    otp_expiry = datetime.utcnow() + timedelta(minutes=15)

    new_user = User(
        email=email, 
        name=name,
        is_verified=False,
        verification_token=token,
        otp_code=otp_code,
        otp_expiry=otp_expiry
    )
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    logger.info(f"New user registered: {email} | OTP generated")
    
    # Send Verification Email with OTP
    send_verification_email(email, token, otp_code)

    return jsonify({'message': 'Registration successful. Check email for OTP code.'}), 201

@auth.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    
    if not email or not otp:
        return jsonify({'error': 'Email and OTP required'}), 400
        
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if user.is_verified:
        return jsonify({'message': 'User already verified', 'success': True}), 200
        
    if user.otp_code != otp:
        return jsonify({'error': 'Invalid OTP code'}), 400
        
    if user.otp_expiry and datetime.utcnow() > user.otp_expiry:
        return jsonify({'error': 'OTP code expired'}), 400
        
    # Verify User
    user.is_verified = True
    user.verification_token = None
    user.otp_code = None
    user.otp_expiry = None
    db.session.commit()
    
    return jsonify({'message': 'Verification successful', 'success': True}), 200

@auth.route('/api/verify/<token>', methods=['GET'])
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return "Invalid or Expired Token", 400
    
    if user.is_verified:
         return "Account already verified. You can close this window."
         
    user.is_verified = True
    user.verification_token = None # Invalidate token
    db.session.commit()
    
    return "<h1>Account Verified!</h1><p>You may now login to the Argus Dashboard.</p>"

@auth.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    
    # Generic message for security (don't reveal if user exists or not)
    # But for this tailored app, logging connection is fine.
    if user:
        token = str(uuid.uuid4())
        user.reset_token = token
        user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
        
        send_password_reset_email(email, token)
        logger.info(f"Password reset requested for {email}")
        
    return jsonify({'message': 'If an account exists, a reset link has been sent.'}), 200

@auth.route('/api/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.json
    new_password = data.get('password')
    
    if not new_password:
        return jsonify({'error': 'Password is required'}), 400
        
    user = User.query.filter_by(reset_token=token).first()
    
    if not user:
        return jsonify({'error': 'Invalid or expired token'}), 400
        
    if user.reset_token_expiry and datetime.utcnow() > user.reset_token_expiry:
        return jsonify({'error': 'Token has expired'}), 400
        
    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()
    
    logger.info(f"Password reset successful for {user.email}")
    return jsonify({'message': 'Password reset successful. Please login.'}), 200

@auth.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    if not user.is_verified:
        return jsonify({'error': 'Email not verified. Please check your inbox.'}), 403

    login_user(user)
    
    # Track user's login IP for per-user intrusion filtering
    user.last_login_ip = request.remote_addr
    db.session.commit()
    
    logger.info(f"User logged in: {email} from IP {request.remote_addr}")
    return jsonify({'message': 'Login successful', 'user': {'name': user.name, 'email': user.email}})

@auth.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'})

@auth.route('/api/user', methods=['GET'])
def get_user():
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'user': {'name': current_user.name, 'email': current_user.email, 'email_alerts': current_user.email_alerts_enabled}})
    return jsonify({'authenticated': False}), 401

@auth.route('/api/update_preferences', methods=['POST'])
@login_required
def update_preferences():
    data = request.json
    current_user.email_alerts_enabled = data.get('email_alerts_enabled', True)
    db.session.commit()
    return jsonify({'message': 'Preferences updated'})
