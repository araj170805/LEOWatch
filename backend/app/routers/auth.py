from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut
from app.security import (
    create_access_token,
    get_current_user,
    get_user_by_email,
    hash_password,
    verify_password,
)

router = APIRouter()


@router.post("/auth/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if get_user_by_email(db, body.email) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=body.email, password_hash=hash_password(body.password), name=body.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(sub=user.email)
    return TokenOut(token=token, user=UserOut.model_validate(user))


@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = get_user_by_email(db, body.email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(sub=user.email)
    return TokenOut(token=token, user=UserOut.model_validate(user))


@router.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
