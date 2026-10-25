from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.security import validate_api_key
from app.services.vitals_service import vitals_service

router = APIRouter()


@router.get("/{software_id}")
async def get_software_vitals(
    software_id: str,
):
    """
    Returns real-time health score, host memory/cpu pressure, target latency,
    subsystem grades, and active incidents for the selected software.
    """
    data = await vitals_service.get_system_vitals(software_id)
    return data
