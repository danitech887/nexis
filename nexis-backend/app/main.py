import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.services.ollama_service import ollama_service
from app.db.session import init_db

from app.services.prober_service import live_ingress_prober

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexis.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info(f"Initializing {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode...")
    init_db()
    health = await ollama_service.check_health()
    if health.get("model_available"):
        logger.info(f"Ollama connected. Target model '{settings.OLLAMA_MODEL}' is ready.")
    else:
        logger.warning(
            f"Ollama health check returned: {health.get('status')}. "
            f"Target model '{settings.OLLAMA_MODEL}' may need 'ollama pull {settings.OLLAMA_MODEL}'."
        )

    # Start live background prober for enrolled target URLs (every 30 seconds)
    live_ingress_prober.start(interval_seconds=30)

    # Start automated Vercel API sync for cloud build & deployment logs (every 60 seconds)
    from app.services.vercel_api_service import vercel_api_service
    vercel_api_service.start_background_sync(interval_seconds=60)

    yield

    # Shutdown sequence
    live_ingress_prober.stop()
    vercel_api_service.stop_background_sync()
    logger.info("Nexis Core Engine shutting down gracefully.")


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Cross-Origin Resource Sharing configuration for frontend integration
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Core health probe
    @application.get("/health", tags=["Health"])
    async def root_health():
        return {
            "service": settings.PROJECT_NAME,
            "status": "online",
            "environment": settings.ENVIRONMENT,
            "api_version": settings.API_V1_STR,
        }

    # Mount API router
    application.include_router(api_router, prefix=settings.API_V1_STR)

    return application


app = create_application()
