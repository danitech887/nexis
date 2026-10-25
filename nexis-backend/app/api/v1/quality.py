from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Body, HTTPException
from app.core.security import validate_api_key
from app.services.ast_service import ast_service

router = APIRouter()


@router.post("/ast")
async def analyze_ast(
    code: str = Body(..., embed=True),
    language: str = Body("python", embed=True),
    _auth: str = Depends(validate_api_key)
) -> Dict[str, Any]:
    """
    Parses code using Tree-sitter and returns AST node structure and cyclomatic metrics.
    """
    try:
        result = ast_service.parse_code(code=code, language=language)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"AST parsing failed: {str(e)}")


@router.post("/complexity")
async def analyze_complexity(
    code: str = Body(..., embed=True),
    language: str = Body("python", embed=True),
    _auth: str = Depends(validate_api_key)
) -> Dict[str, Any]:
    """
    Calculates cyclomatic complexity score, nesting depth, and function breakdown.
    """
    parse_result = ast_service.parse_code(code=code, language=language)
    cc = parse_result["cyclomatic_complexity"]

    # Health status rating
    rating = "HEALTHY"
    if cc > 15:
        rating = "CRITICAL"
    elif cc > 10:
        rating = "WARNING"
    elif cc > 5:
        rating = "MODERATE"

    return {
        "language": language,
        "cyclomatic_complexity": cc,
        "rating": rating,
        "function_count": parse_result["function_count"],
        "functions": parse_result["functions"],
    }


@router.get("/software/{software_id}")
async def get_software_quality_metrics(
    software_id: str,
    _auth: str = Depends(validate_api_key)
) -> Dict[str, Any]:
    """
    Scans an enrolled software's repository using Tree-sitter AST parser,
    generating cyclomatic complexity, refactor triggers, and OpenAPI specs.
    """
    from app.services.software_fleet_service import SoftwareFleetService
    from app.services.quality_scanner_service import scan_software_quality

    fleet = SoftwareFleetService()
    software = fleet.get_by_id(software_id)
    if not software or not software.local_repo_path:
        return {
            "error": "Software or local repository path not found",
            "fileMetrics": [],
            "endpoints": [],
            "docs": [],
            "summary": {
                "avgComplexity": 0,
                "totalLoc": 0,
                "totalFuncs": 0,
                "refactorTriggersCount": 0,
            }
        }

    return scan_software_quality(software.local_repo_path, software.name, software.repo_url)


from pydantic import BaseModel


class RefactorCommitRequest(BaseModel):
    software_id: str
    file_path: str
    diff_before: str
    diff_after: str
    commit_message: Optional[str] = None
    branch: Optional[str] = "main"


@router.post("/refactor/commit")
async def commit_refactor(
    req: RefactorCommitRequest,
    _auth: str = Depends(validate_api_key)
) -> Dict[str, Any]:
    """
    Applies the decomposed AST patch to the local repository, commits via git,
    and pushes directly to the remote GitHub repository.
    """
    from app.services.git_refactor_service import git_refactor_service

    result = git_refactor_service.commit_and_push(
        software_id=req.software_id,
        file_path=req.file_path,
        diff_before=req.diff_before,
        diff_after=req.diff_after,
        commit_message=req.commit_message,
        branch=req.branch or "main",
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Refactor commit and push failed"),
        )
    return result

