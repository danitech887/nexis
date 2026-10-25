from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body, Path
from pydantic import BaseModel, Field
from app.services.cloud_provider_service import cloud_provider_service

router = APIRouter()


class VerifyTokenRequest(BaseModel):
    provider: str = Field(..., description="Provider slug: render, vercel, railway, fly, netlify, koyeb, digitalocean, aws, custom")
    api_key: str = Field(..., description="API key or token to test")


@router.get("/providers")
async def get_cloud_providers_catalog():
    """
    Returns the comprehensive catalog of supported cloud hosting platforms,
    their free API capabilities, and step-by-step guides with direct URLs
    showing how users can get their API tokens for free.
    """
    return {
        "providers": cloud_provider_service.get_catalog()
    }


@router.post("/verify")
async def verify_provider_credentials(body: VerifyTokenRequest):
    """
    Tests the provided API token against the cloud hosting platform,
    and returns a discovered list of active web services, deployments, or projects.
    """
    result = await cloud_provider_service.verify_and_discover(body.provider, body.api_key)
    return result


@router.post("/sync/{software_id}")
async def sync_software_cloud_logs(software_id: str = Path(..., description="Software ID slug")):
    """
    Triggers an on-demand sync of runtime and deployment logs from the enrolled
    cloud provider API (Render, Vercel, Railway, etc.) into SQLite.
    """
    result = await cloud_provider_service.sync_software_logs(software_id)
    return result
