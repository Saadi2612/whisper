from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from enum import Enum

# Subscription Enums (defined first)
class PlanType(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    TRIALING = "trialing"

class UserPreferences(BaseModel):
    # Signup preferences (required)
    interests: List[str] = Field(default_factory=list)
    age_group: Optional[str] = None
    content_preference: Optional[str] = None
    
    # Profile preferences (optional)
    location: Optional[str] = None
    industry: Optional[str] = None
    purchase_frequency: Optional[str] = None
    product_goals: Optional[str] = None
    
    # Language preferences
    preferred_language: str = Field(default="en", description="User's preferred language for transcripts and analysis")

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    preferences: Optional[UserPreferences] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime = Field(default_factory=datetime.utcnow)
    settings: Dict[str, Any] = Field(default_factory=dict)
    preferences: Optional[UserPreferences] = None
    profile_prompted: bool = False
    subscription_id: Optional[str] = Field(default=None, description="Current subscription ID")
    plan_type: PlanType = Field(default=PlanType.FREE, description="Current plan type")

class UserResponse(BaseModel):
    status: str
    user: Optional[User] = None
    token: Optional[str] = None
    error: Optional[str] = None

class UserSettings(BaseModel):
    auto_process_channels: bool = True
    notification_email: bool = True
    process_frequency: str = "hourly"  # hourly, daily, weekly

class SettingsUpdate(BaseModel):
    auto_process_channels: Optional[bool] = None
    notification_email: Optional[bool] = None
    process_frequency: Optional[str] = None

# Subscription Models
class Plan(BaseModel):
    id: str = Field(..., description="Plan identifier")
    name: str = Field(..., description="Plan display name")
    type: PlanType = Field(..., description="Plan type")
    price: float = Field(..., description="Price in dollars")
    currency: str = Field(default="usd", description="Currency code")
    interval: str = Field(..., description="billing interval: month, year")
    features: List[str] = Field(default_factory=list, description="Plan features")
    video_limit: Optional[int] = Field(default=None, description="Monthly video processing limit")
    is_active: bool = Field(default=True, description="Whether plan is available for subscription")
    stripe_product_id: Optional[str] = Field(default=None, description="Stripe product ID")
    stripe_price_id: Optional[str] = Field(default=None, description="Stripe price ID")

class Subscription(BaseModel):
    id: str = Field(..., description="Subscription ID")
    user_id: str = Field(..., description="User ID")
    plan_id: str = Field(..., description="Plan ID")
    status: SubscriptionStatus = Field(..., description="Subscription status")
    current_period_start: datetime = Field(..., description="Current billing period start")
    current_period_end: datetime = Field(..., description="Current billing period end")
    cancel_at_period_end: bool = Field(default=False, description="Cancel at period end")
    canceled_at: Optional[datetime] = Field(default=None, description="When subscription was canceled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    stripe_subscription_id: Optional[str] = Field(default=None, description="Stripe subscription ID")
    stripe_customer_id: Optional[str] = Field(default=None, description="Stripe customer ID")

class SubscriptionResponse(BaseModel):
    status: str
    subscription: Optional[Subscription] = None
    plan: Optional[Plan] = None
    error: Optional[str] = None

class WebhookEvent(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]
    created: int