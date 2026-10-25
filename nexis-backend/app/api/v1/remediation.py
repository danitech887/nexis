from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from app.core.security import validate_api_key
from app.schemas.remediation import (
    RemediationRequest,
    RemediationResponse,
    RemediationPlan,
)
from app.services.ollama_service import ollama_service
from app.services.context_service import context_service
from app.services.test_runner_service import test_runner_service
from app.services.error_locator_service import error_locator_service

router = APIRouter()


@router.post("/locate-source")
async def locate_source_error(
    error_message: str = Body(..., embed=True),
    software_id: str = Body(None, embed=True),
    stack_trace: str = Body(None, embed=True),
    _auth: str = Depends(validate_api_key),
):
    """
    Scans the enrolled software's source repository to pinpoint the exact source file,
    line number, component scope, and synthesizes root cause analysis and patch diff.
    """
    result = error_locator_service.locate_and_remediate(
        error_message=error_message,
        software_id=software_id,
        stack_trace=stack_trace,
    )
    return result


@router.post("/generate", response_model=RemediationResponse)
async def generate_remediation(
    req: RemediationRequest,
    _auth: str = Depends(validate_api_key)
):
    """
    Orchestrates Qwen 2.5 Coder to synthesize a strict JSON patch, root cause, and unit test.
    """
    try:
        result = await ollama_service.generate_remediation(req)
        return RemediationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remediation synthesis failed: {str(e)}")


@router.post("/diff")
async def generate_diff(
    original_code: str = Body(..., embed=True),
    remediated_code: str = Body(..., embed=True),
    filename: str = Body("patch.diff", embed=True),
    _auth: str = Depends(validate_api_key)
):
    """
    Produces a unified git diff between original and patched code.
    """
    diff_text = context_service.generate_unified_diff(
        original_text=original_code,
        modified_text=remediated_code,
        filename=filename,
    )
    return {"filename": filename, "diff": diff_text}


@router.post("/verify")
async def verify_remediation_test(
    test_code: str = Body(..., embed=True),
    implementation_code: str = Body("", embed=True),
    _auth: str = Depends(validate_api_key)
):
    """
    Sandboxed test runner to execute the generated unit test against the patch.
    """
    result = await test_runner_service.execute_python_test(
        test_code=test_code,
        implementation_code=implementation_code,
    )
    return result


@router.get("/health")
async def ollama_health_status(_auth: str = Depends(validate_api_key)):
    """
    Checks Ollama server connectivity and model readiness.
    """
    status = await ollama_service.check_health()
    return status
