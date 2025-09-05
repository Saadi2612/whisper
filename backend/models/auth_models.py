from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)

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