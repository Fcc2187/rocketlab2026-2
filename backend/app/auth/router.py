from typing import Annotated

from fastapi import APIRouter
from pydantic import BaseModel, StringConstraints

from app.auth.security import TOKEN_SECONDS, authenticate

router = APIRouter()


class LoginRequest(BaseModel):
    username: Annotated[str, StringConstraints(min_length=1, max_length=120)]
    password: Annotated[str, StringConstraints(min_length=1, max_length=1000)]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = TOKEN_SECONDS


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={401: {"description": "Credenciais inválidas"}},
)
async def login(payload: LoginRequest) -> LoginResponse:
    return LoginResponse(access_token=await authenticate(payload.username, payload.password))
