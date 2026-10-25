import hashlib
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Dict, Any, Optional
from app.core.security import validate_api_key
from app.db.session import get_db_connection
from app.schemas.software import (
    SoftwareEnrollRequest,
    SoftwareResponse,
    SoftwareEnrollmentResult,
    PathInspectionRequest,
    PathInspectionResponse,
    RepoCloneRequest,
    RepoCloneResponse,
)
from app.services.detector_service import inspect_local_project_path
from app.services.git_clone_service import git_clone_service
from app.services.software_fleet_service import software_fleet_service

router = APIRouter()


@router.get("", response_model=List[SoftwareResponse])
async def list_enrolled_softwares():
    """
    Returns all registered systems and monitored nodes persisted in SQLite.
    """
    return software_fleet_service.list_all()


@router.get("/browse-dirs")
async def browse_directories(path: Optional[str] = Query(None)):
    """
    Lists subdirectories for the interactive local directory picker dialog modal.
    """
    import os
    if not path or not path.strip():
        target = os.path.expanduser("~/Desktop/Projects")
        if not os.path.exists(target):
            target = os.path.expanduser("~")
    else:
        target = os.path.abspath(os.path.expanduser(path.strip()))

    if not os.path.exists(target):
        target = os.path.expanduser("~")

    subdirs = []
    subdirectories = []
    try:
        with os.scandir(target) as entries:
            for e in entries:
                if e.is_dir() and not e.name.startswith("."):
                    subdirs.append(e.name)
                    has_git = os.path.exists(os.path.join(e.path, ".git"))
                    subdirectories.append({
                        "name": e.name,
                        "path": e.path,
                        "has_git": has_git,
                    })
        subdirs.sort()
        subdirectories.sort(key=lambda s: s["name"].lower())
    except Exception as e:
        return {
            "current_path": target,
            "parent_path": os.path.dirname(target),
            "directories": [],
            "subdirectories": [],
            "error": str(e),
        }

    parent = os.path.dirname(target) if target != "/" else None
    return {
        "current_path": target,
        "parent_path": parent,
        "directories": subdirs,
        "subdirectories": subdirectories,
    }


@router.get("/{software_id}", response_model=SoftwareResponse)
async def get_enrolled_software(software_id: str):
    """
    Retrieves a single enrolled software with its active sub-nodes.
    """
    item = software_fleet_service.get_by_id(software_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Software '{software_id}' not found in registry",
        )
    return item


@router.post("/inspect-path", response_model=PathInspectionResponse)
async def inspect_path(req: PathInspectionRequest):
    """
    Real-time local path verification and automatic framework/platform stack detector.
    """
    inspection = inspect_local_project_path(req.local_path)
    return PathInspectionResponse(**inspection)


@router.post("/clone-repo", response_model=RepoCloneResponse)
async def clone_repository(req: RepoCloneRequest):
    """
    Clones a remote Git repository to a local machine destination.
    Inspects the cloned directory to immediately detect stack & signature files.
    """
    clone_res = git_clone_service.clone_repository(
        repo_url=req.repo_url,
        destination_dir=req.destination_parent_dir,
        custom_folder_name=req.custom_folder_name,
        branch=req.branch,
    )
    if not clone_res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=clone_res.get("error", "Failed to clone repository"),
        )

    cloned_path = clone_res["cloned_path"]
    inspection_data = inspect_local_project_path(cloned_path)

    return RepoCloneResponse(
        success=True,
        cloned_path=cloned_path,
        folder_name=clone_res["folder_name"],
        already_existed=clone_res.get("already_existed", False),
        message=clone_res.get("message", "Cloned successfully"),
        inspection=PathInspectionResponse(**inspection_data),
    )


@router.post("/enroll", response_model=SoftwareEnrollmentResult)
async def enroll_software(
    req: SoftwareEnrollRequest,
    request: Request,
):
    """
    Enroll a new software target:
    1. Validates local repository path and platform stack.
    2. Atomically records system & default ingress node in SQLite.
    3. Generates nx_live_... ingest token, stores SHA-256 hash, and returns ready .env block.
    """
    # Extract host for dynamic .env generation
    base_url = str(request.base_url).rstrip("/")
    try:
        result = software_fleet_service.enroll(req, backend_url=base_url)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Enrollment transaction failed: {str(e)}",
        )


@router.delete("/clear/all")
async def delete_all_softwares():
    """
    Clears all registered softwares, sub-nodes, and telemetry logs.
    """
    count = software_fleet_service.delete_all()
    return {"status": "all_deleted", "count": count}


@router.delete("/{software_id}")
async def delete_enrolled_software(software_id: str):
    """
    De-enrolls a software and cascades removal of associated nodes.
    """
    success = software_fleet_service.delete(software_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Software '{software_id}' not found",
        )
    return {"status": "deleted", "id": software_id}
