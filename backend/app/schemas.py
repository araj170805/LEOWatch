from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    name: str | None = None
    email: EmailStr
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None = None


class TokenOut(BaseModel):
    token: str
    user: UserOut


class ForecastRequest(BaseModel):
    objects: list[int] = Field(min_length=1, max_length=8)
    horizon_hours: int = Field(default=24, ge=1, le=168)
    step_minutes: int = Field(default=1, ge=1, le=60)


ConjunctionRequest = ForecastRequest
ScreeningRequest = ForecastRequest


class ChatIn(BaseModel):
    question: str
    event: dict | None = None


class HistoryItem(BaseModel):
    id: int
    object_a_name: str
    object_b_name: str
    satellite_a_norad_id: int
    satellite_b_norad_id: int
    tca: datetime
    minimum_distance_km: float
    risk: str
    created_at: datetime


class HistorySaveOut(BaseModel):
    id: int
    saved: bool
