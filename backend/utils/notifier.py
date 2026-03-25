import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import logging
import threading

logger = logging.getLogger("ArgusNotifier")

# SMTP Configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv("MAIL_USERNAME")
SENDER_PASSWORD = os.getenv("MAIL_PASSWORD")
SENDER_ALIAS = os.getenv("MAIL_SENDER_ALIAS", SENDER_EMAIL)

def get_email_template(title, content_html, button_text=None, button_url=None, warning_mode=False):
    """
    Generates a dark-themed HTML email template.
    """
    accent_color = "#DC143C" if warning_mode else "#FFD700" 
    
    button_html = ""
    if button_text and button_url:
        button_html = f"""
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px; margin-bottom: 30px;">
            <tr>
                <td align="center">
                    <a href="{button_url}" target="_blank" style="display: inline-block; padding: 14px 30px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; background: linear-gradient(135deg, #DC143C 0%, #8b0000 100%); border-radius: 4px; box-shadow: 0 4px 15px rgba(220, 20, 60, 0.4); text-transform: uppercase; letter-spacing: 2px;">
                        {button_text}
                    </a>
                </td>
            </tr>
        </table>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{title}</title>
        <style>
            body {{ margin: 0; padding: 0; background-color: #050505; font-family: 'Arial', sans-serif; -webkit-font-smoothing: antialiased; }}
            .container {{ width: 100%; max-width: 600px; margin: 0 auto; background-color: #050505; }}
            .card {{ background-color: #13141b; border: 1px solid #333; border-top: 4px solid {accent_color}; border-radius: 8px; overflow: hidden; margin: 40px 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
            .header {{ padding: 30px 40px; text-align: center; border-bottom: 1px solid #222; }}
            .logo-text {{ font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #FFD700; text-transform: uppercase; }}
            .content {{ padding: 40px; color: #cccccc; line-height: 1.6; font-size: 16px; }}
            .footer {{ padding: 20px; text-align: center; color: #555; font-size: 12px; font-family: 'Courier New', monospace; background-color: #0a0a0e; }}
            h1 {{ color: #ffffff; margin-top: 0; font-size: 22px; font-weight: normal; letter-spacing: 1px; }}
            p {{ margin-bottom: 20px; }}
            .highlight {{ color: #FFD700; font-weight: bold; }}
            .code-block {{ background-color: #000; border: 1px solid #333; color: #00ff00; font-family: 'Courier New', monospace; padding: 15px; border-radius: 4px; font-size: 13px; overflow-x: auto; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div class="logo-text">Argus-FL</div>
                </div>
                <div class="content">
                    <h1>{title}</h1>
                    {content_html}
                    {button_html}
                    <p style="margin-bottom: 0;">Securing the Federated Grid.</p>
                </div>
                <div class="footer">
                    &copy; 2026 Argus Security Systems.<br>
                    This is an automated secure transmission.
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def send_email_async(recipient, subject, html_body, text_body=None, attachment_data=None, attachment_name="report.pdf"):
    """Sends HTML email in a separate thread."""
    def _send():
        try:
            email_user = os.getenv("MAIL_USERNAME")
            email_pass = os.getenv("MAIL_PASSWORD")
            sender_alias = os.getenv("MAIL_SENDER_ALIAS", email_user)
            
            if not email_user or not email_pass:
                logger.warning("SMTP Config missing. Skipping email.")
                return 

            msg = MIMEMultipart('alternative')
            msg['From'] = sender_alias
            msg['To'] = recipient
            msg['Subject'] = subject
            msg['Reply-To'] = sender_alias

            # Attach parts
            if text_body:
                msg.attach(MIMEText(text_body, 'plain'))
            
            # HTML Version (Preferred)
            msg.attach(MIMEText(html_body, 'html'))
            
            # Attach PDF if provided
            if attachment_data:
                # We need to wrap alternative in mixed if verifying attachments, 
                # but standard mixed with html/text alternative part is complex.
                # For simplicity, we just attach application part to the root mixed if needed
                # But 'alternative' subtype treats everything as versions.
                # Switching to 'related' or 'mixed' logic if attachment exists.
                pass 
            
            # Re-build for attachment support if needed (simple override)
            if attachment_data:
                msg_mixed = MIMEMultipart('mixed')
                msg_mixed['From'] = sender_alias
                msg_mixed['To'] = recipient
                msg_mixed['Subject'] = subject
                msg_mixed.attach(MIMEText(html_body, 'html'))
                
                part = MIMEApplication(attachment_data.read(), Name=attachment_name)
                part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
                msg_mixed.attach(part)
                msg = msg_mixed

            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(email_user, email_pass)
            server.sendmail(email_user, recipient, msg.as_string())
            server.quit()
            logger.info(f"HTML Email sent to {recipient}")
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}")

    t = threading.Thread(target=_send)
    t.start()

def send_intrusion_alert(user_email, threat_info, user_name="Agent"):
    from datetime import datetime as dt
    
    attacker_ip = threat_info.get('attacker_ip', 'Unknown')
    target_ip = threat_info.get('target_ip', 'Unknown')
    timestamp = dt.now().strftime('%Y-%m-%d  %H:%M:%S')
    subject = f"⚠ THREAT DETECTED: {attacker_ip}"
    
    html_content = f"""
    <p>Agent <span style="color: #FFD700; font-weight: bold;">{user_name}</span>,</p>
    <p>The Argus Sentry has intercepted a hostile connection targeting your device.</p>
    
    <!-- Threat Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <!-- Attacker IP -->
        <tr>
            <td style="padding: 12px 16px; background: rgba(220, 20, 60, 0.08); border-left: 3px solid #DC143C; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Attacker IP</span>
                <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #DC143C;">{attacker_ip}</span>
            </td>
        </tr>
        <!-- Defender IP -->
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 215, 0, 0.05); border-left: 3px solid #FFD700; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Defender IP</span>
                <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #FFD700;">{target_ip}</span>
            </td>
        </tr>
        <!-- Timestamp -->
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid #555;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Detection Time</span>
                <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #ffffff;">{timestamp}</span>
            </td>
        </tr>
    </table>
    
    <p>The system has automatically <span style="color: #DC143C; font-weight: bold;">BLOCKED</span> this connection and logged the incident.</p>
    """
    
    full_html = get_email_template("INTRUSION ALERT", html_content, warning_mode=True)
    send_email_async(user_email, subject, full_html)

def send_verification_email(user_email, token, otp):
    verify_url = f"http://localhost:5001/api/verify/{token}"
    subject = "Argus - Mission Clearance Code"
    
    html_content = f"""
    <p>Agent,</p>
    <p>Welcome to the <span style="color: #FFD700; font-weight: bold;">Argus Federated Defense Grid</span>.</p>
    <p>To initialize your dashboard credentials and access live telemetry, verify your identity using the clearance code below.</p>
    
    <!-- Verification Details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <!-- OTP Code -->
        <tr>
            <td style="padding: 16px; background: rgba(255, 215, 0, 0.08); border-left: 3px solid #FFD700; border-bottom: 1px solid #222; text-align: center;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">Communication Security Code</span>
                <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #FFD700; letter-spacing: 6px;">{otp}</span>
            </td>
        </tr>
        <!-- Email -->
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid #555;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Registered Identity</span>
                <span style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; color: #ffffff;">{user_email}</span>
            </td>
        </tr>
    </table>
    
    <p>Enter this code in the mission control interface, or use the secure link below.</p>
    """
    
    full_html = get_email_template("IDENTITY VERIFICATION", html_content, button_text="VERIFY ACCESS", button_url=verify_url)
    send_email_async(user_email, subject, full_html)

def send_password_reset_email(user_email, token):
    reset_url = f"http://localhost:3000/reset-password/{token}"
    subject = "Argus - Access Recovery"
    
    html_content = f"""
    <p>Agent,</p>
    <p>A passcode override request has been initiated for your account.</p>
    
    <!-- Reset Details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <!-- Account -->
        <tr>
            <td style="padding: 12px 16px; background: rgba(220, 20, 60, 0.08); border-left: 3px solid #DC143C; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Account</span>
                <span style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; color: #DC143C;">{user_email}</span>
            </td>
        </tr>
        <!-- Window -->
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 215, 0, 0.05); border-left: 3px solid #FFD700; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Secure Window</span>
                <span style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; color: #FFD700;">15 Minutes</span>
            </td>
        </tr>
        <!-- Status -->
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid #555;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Status</span>
                <span style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; color: #ffffff;">Awaiting Confirmation</span>
            </td>
        </tr>
    </table>
    
    <p>Use the secure link below to reset your credentials.</p>
    <p style="color: #666; font-size: 13px;">If you did not request this, disregard this transmission.</p>
    """
    
    full_html = get_email_template("PASSCODE RESET", html_content, button_text="RESET PASSCODE", button_url=reset_url)
    send_email_async(user_email, subject, full_html)
