from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class Satellite(Base):
    __tablename__ = "satellites"

    id = Column(Integer, primary_key=True, index=True)
    norad_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=_utcnow)


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    horizon_hours = Column(Integer, nullable=False)
    step_minutes = Column(Integer, nullable=False)
    total_points = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=_utcnow)


class Conjunction(Base):
    __tablename__ = "conjunctions"

    id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=True)
    satellite_a_norad_id = Column(Integer, nullable=False)
    satellite_b_norad_id = Column(Integer, nullable=False)
    object_a_name = Column(String, nullable=False)
    object_b_name = Column(String, nullable=False)
    tca = Column(DateTime, nullable=False)
    minimum_distance_km = Column(Float, nullable=False)
    coarse_tca = Column(DateTime, nullable=True)
    coarse_distance_km = Column(Float, nullable=True)
    risk_status = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=_utcnow)
