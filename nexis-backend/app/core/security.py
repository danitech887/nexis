import hashlib
from fastapi import Security, HTTPException, status, Request
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings
from app.db.session import get_db_connection

API_KEY_NAME = "X-Nexis-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def validate_api_key(
    request: Request,
    header_key: str = Security(api_key_header)
) -> str:
    """
    Validates API key for monitored client applications and SDKs.
    Accepts:
    1. Global secret (settings.API_KEY_SECRET)
    2. Dynamic project tokens (nx_live_...) hashed and stored in SQLite 'softwares' table
    3. Permissive dev fallback when configured
    """
    # Extract token from headers or query parameters
    token = header_key or request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    if not token and "authorization" in request.headers:
        auth_header = request.headers["authorization"]
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
    if not token:
        token = request.query_params.get("key") or request.query_params.get("api_key") or request.query_params.get("token")

    if not token:
        if settings.ENVIRONMENT == "development":
            return "dev-anonymous"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key (pass X-Nexis-API-Key or X-API-Key)",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # 1. Master secret bypass
    if token == settings.API_KEY_SECRET:
        return "admin"

    # 2. Check dynamic software tokens in SQLite
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM softwares WHERE api_key_hash = ?;", (token_hash,))
        row = cursor.fetchone()
        if row:
            return row["id"]
    except Exception:
        pass
    finally:
        conn.close()

    # 3. Dev bypass fallback
    if settings.ENVIRONMENT == "development":
        return "dev-unverified"

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: API key verification failed",
    )
