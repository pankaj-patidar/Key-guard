from pydantic import BaseModel


class LoginRequest(BaseModel):
    # Plain str — login just needs to match the DB value, no RFC validation required
    email:    str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
