import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending transactional emails"""
    
    def __init__(self):
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.from_name = os.getenv('FROM_NAME', 'Whisper Dashboard')
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        # Validate configuration
        if not self.smtp_username or not self.smtp_password:
            logger.warning("Email service not configured - SMTP_USERNAME and SMTP_PASSWORD required")
            self.enabled = False
        else:
            self.enabled = True
    
    async def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content (optional)
            from_name: Sender name (optional)
        
        Returns:
            Dict containing status and message
        """
        if not self.enabled:
            logger.warning("Email service not enabled - skipping email send")
            return {
                "status": "warning",
                "message": "Email service not configured"
            }
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{from_name or self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add text content if provided
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return {
                "status": "success",
                "message": "Email sent successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to send email: {str(e)}"
            }
    
    def get_welcome_email_template(self, user_name: str, user_email: str) -> tuple[str, str]:
        """Generate welcome email template for new users"""
        subject = "Welcome to Whisper Dashboard! 🎉"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Whisper Dashboard</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8fafc;
                }}
                .container {{
                    background: white;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    border-radius: 12px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                }}
                .title {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 10px;
                }}
                .subtitle {{
                    color: #6b7280;
                    font-size: 16px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    color: white;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 8px;
                    font-weight: 600;
                    text-align: center;
                    margin: 20px 0;
                }}
                .features {{
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .feature {{
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                }}
                .feature-icon {{
                    width: 20px;
                    height: 20px;
                    background: #10b981;
                    border-radius: 50%;
                    margin-right: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                }}
                .footer {{
                    text-align: center;
                    color: #6b7280;
                    font-size: 14px;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">W</div>
                    <h1 class="title">Welcome to Whisper Dashboard!</h1>
                    <p class="subtitle">Your AI-powered video analysis platform</p>
                </div>
                
                <div class="content">
                    <p>Hi {user_name},</p>
                    
                    <p>Thank you for joining Whisper Dashboard! We're excited to help you unlock the power of AI-driven video analysis.</p>
                    
                    <div class="features">
                        <h3 style="margin-top: 0; color: #1f2937;">What you can do with your free account:</h3>
                        <div class="feature">
                            <div class="feature-icon">✓</div>
                            <span>Process up to 5 videos per month with AI analysis</span>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">✓</div>
                            <span>Get detailed transcripts and executive summaries</span>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">✓</div>
                            <span>Access your video library and search functionality</span>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">✓</div>
                            <span>Explore AI-powered insights and key takeaways</span>
                        </div>
                    </div>
                    
                    <p>Ready to get started? Process your first video and experience the power of AI-driven video analysis!</p>
                    
                    <div style="text-align: center;">
                        <a href="{self.frontend_url}" class="cta-button">Start Analyzing Videos</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                    <p>Best regards,<br>The Whisper Dashboard Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to Whisper Dashboard!
        
        Hi {user_name},
        
        Thank you for joining Whisper Dashboard! We're excited to help you unlock the power of AI-driven video analysis.
        
        What you can do with your free account:
        • Process up to 5 videos per month with AI analysis
        • Get detailed transcripts and executive summaries
        • Access your video library and search functionality
        • Explore AI-powered insights and key takeaways
        
        Ready to get started? Visit {self.frontend_url} to process your first video!
        
        If you have any questions, feel free to reach out to our support team.
        
        Best regards,
        The Whisper Dashboard Team
        """
        
        return subject, html_content, text_content
    
    def get_subscription_email_template(
        self, 
        user_name: str, 
        plan_name: str, 
        plan_price: float, 
        plan_interval: str,
        plan_features: List[str]
    ) -> tuple[str, str]:
        """Generate subscription confirmation email template"""
        subject = f"Welcome to {plan_name} Plan! 🚀"
        
        features_html = ""
        for feature in plan_features:
            features_html += f'<div class="feature"><div class="feature-icon">✓</div><span>{feature}</span></div>'
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Subscription Confirmation</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8fafc;
                }}
                .container {{
                    background: white;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    border-radius: 12px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                }}
                .title {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 10px;
                }}
                .subtitle {{
                    color: #6b7280;
                    font-size: 16px;
                }}
                .plan-card {{
                    background: linear-gradient(135deg, #f8fafc, #e0e7ff);
                    border: 2px solid #8b5cf6;
                    border-radius: 12px;
                    padding: 24px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .plan-name {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #8b5cf6;
                    margin-bottom: 8px;
                }}
                .plan-price {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 4px;
                }}
                .plan-interval {{
                    color: #6b7280;
                    font-size: 16px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    color: white;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 8px;
                    font-weight: 600;
                    text-align: center;
                    margin: 20px 0;
                }}
                .features {{
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .feature {{
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                }}
                .feature-icon {{
                    width: 20px;
                    height: 20px;
                    background: #10b981;
                    border-radius: 50%;
                    margin-right: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                }}
                .footer {{
                    text-align: center;
                    color: #6b7280;
                    font-size: 14px;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">W</div>
                    <h1 class="title">Subscription Confirmed!</h1>
                    <p class="subtitle">You're all set with your new plan</p>
                </div>
                
                <div class="content">
                    <p>Hi {user_name},</p>
                    
                    <p>Congratulations! Your subscription to the <strong>{plan_name}</strong> plan has been successfully activated.</p>
                    
                    <div class="plan-card">
                        <div class="plan-name">{plan_name} Plan</div>
                        <div class="plan-price">${plan_price:.2f}</div>
                        <div class="plan-interval">per {plan_interval}</div>
                    </div>
                    
                    <div class="features">
                        <h3 style="margin-top: 0; color: #1f2937;">Your plan includes:</h3>
                        {features_html}
                    </div>
                    
                    <p>You now have access to all the premium features! Start exploring your enhanced video analysis capabilities.</p>
                    
                    <div style="text-align: center;">
                        <a href="{self.frontend_url}" class="cta-button">Access Your Dashboard</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>If you have any questions about your subscription, feel free to reach out to our support team.</p>
                    <p>Best regards,<br>The Whisper Dashboard Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        features_text = ""
        for feature in plan_features:
            features_text += f"• {feature}\n"
        
        text_content = f"""
        Subscription Confirmed!
        
        Hi {user_name},
        
        Congratulations! Your subscription to the {plan_name} plan has been successfully activated.
        
        Plan Details:
        • Plan: {plan_name}
        • Price: ${plan_price:.2f} per {plan_interval}
        
        Your plan includes:
        {features_text}
        
        You now have access to all the premium features! Visit {self.frontend_url} to start exploring your enhanced video analysis capabilities.
        
        If you have any questions about your subscription, feel free to reach out to our support team.
        
        Best regards,
        The Whisper Dashboard Team
        """
        
        return subject, html_content, text_content
