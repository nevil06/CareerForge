from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import httpx
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login") # Keep for swagger UI

_jwks = None

def get_jwks():
    global _jwks
    if not _jwks:
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        try:
            r = httpx.get(url, timeout=5)
            r.raise_for_status()
            _jwks = r.json()
            print(f"Fetched JWKS from {url}")
        except Exception as e:
            print(f"Failed to fetch JWKS from {url}: {e}")
            _jwks = {}
    return _jwks

def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> User:
    try:
        jwks = get_jwks()
        # Decode the Supabase JWT using the JWKS (supports ES256, RS256, HS256)
        payload = jwt.decode(
            token, 
            jwks, 
            algorithms=["ES256", "RS256", "HS256"], 
            audience="authenticated"
        )
    except JWTError as e:
        print(f"JWT Verification Error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Supabase token: {e}")
        
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload: missing email")
    email = email.lower()

    role_str = payload.get("user_metadata", {}).get("role", "candidate")
    try:
        role = UserRole(role_str)
    except ValueError:
        role = UserRole.candidate

    # Auto-upsert user locally so foreign keys work
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password="supabase-managed", role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account disabled")
        
    return user

def require_candidate(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.candidate:
        raise HTTPException(status_code=403, detail="Candidates only")
    return user

def require_company(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.company:
        raise HTTPException(status_code=403, detail="Companies only")
    return user
