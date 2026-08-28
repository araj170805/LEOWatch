from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Conjunction, Forecast, User
from app.schemas import HistoryItem, HistorySaveOut
from app.security import get_current_user

router = APIRouter()


class ObjectRef(BaseModel):
    norad_id: int
    name: str


class HistoryIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    object_a: ObjectRef
    object_b: ObjectRef
    tca: str | None = None
    minimum_distance_km: float
    coarse_tca: str | None = None
    coarse_distance_km: float | None = None
    risk: str


def _parse_dt(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid datetime: {value}")


@router.post("/history", response_model=HistorySaveOut)
def save_history(
    body: HistoryIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    forecast = Forecast(
        user_id=current_user.id,
        start_time=_parse_dt(body.tca)
        or _parse_dt(body.coarse_tca)
        or datetime.utcnow(),
        horizon_hours=24,
        step_minutes=1,
        total_points=0,
    )
    db.add(forecast)
    db.flush()

    record = Conjunction(
        forecast_id=forecast.id,
        satellite_a_norad_id=body.object_a.norad_id,
        satellite_b_norad_id=body.object_b.norad_id,
        object_a_name=body.object_a.name,
        object_b_name=body.object_b.name,
        tca=_parse_dt(body.tca) or _parse_dt(body.coarse_tca) or datetime.utcnow(),
        minimum_distance_km=body.minimum_distance_km,
        coarse_tca=_parse_dt(body.coarse_tca) or None,
        coarse_distance_km=body.coarse_distance_km,
        risk_status=body.risk,
        payload=body.model_dump(),
        user_id=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return HistorySaveOut(id=record.id, saved=True)


@router.get("/history", response_model=list[HistoryItem])
def list_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Conjunction)
        .filter(Conjunction.user_id == current_user.id)
        .order_by(Conjunction.created_at.desc())
        .all()
    )
    return [
        HistoryItem(
            id=row.id,
            object_a_name=row.object_a_name,
            object_b_name=row.object_b_name,
            satellite_a_norad_id=row.satellite_a_norad_id,
            satellite_b_norad_id=row.satellite_b_norad_id,
            tca=row.tca,
            minimum_distance_km=row.minimum_distance_km,
            risk=row.risk_status,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/history/{item_id}")
def get_history(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Conjunction)
        .filter(Conjunction.id == item_id, Conjunction.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="History item not found")
    return {
        "id": row.id,
        "satellite_a_norad_id": row.satellite_a_norad_id,
        "satellite_b_norad_id": row.satellite_b_norad_id,
        "object_a_name": row.object_a_name,
        "object_b_name": row.object_b_name,
        "tca": row.tca,
        "minimum_distance_km": row.minimum_distance_km,
        "coarse_tca": row.coarse_tca,
        "coarse_distance_km": row.coarse_distance_km,
        "risk": row.risk_status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "payload": row.payload,
    }
