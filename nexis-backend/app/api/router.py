from fastapi import APIRouter
from app.api.v1 import telemetry, security, quality, remediation, software, vitals, cloud

api_router = APIRouter()

api_router.include_router(vitals.router, prefix="/vitals", tags=["System Vitals"])
api_router.include_router(software.router, prefix="/softwares", tags=["Software Fleet Enrollment"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry Ingestion"])
api_router.include_router(security.router, prefix="/security", tags=["Security Scanning"])
api_router.include_router(quality.router, prefix="/quality", tags=["AST Code Quality"])
api_router.include_router(remediation.router, prefix="/remediation", tags=["Autonomous Remediation"])
api_router.include_router(cloud.router, prefix="/cloud", tags=["Cloud Hosting Providers"])
