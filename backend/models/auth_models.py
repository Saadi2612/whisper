from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

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