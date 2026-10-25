from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class UnitTestItem(BaseModel):
    name: str = Field(..., description="Test function or spec name")
    status: Literal["pass", "fail", "pending"] = Field("pass", description="Execution status")
    assertion: str = Field(..., description="Core assertion statement or condition")


class RemediationPlan(BaseModel):
    rule_id: str = Field(..., alias="ruleId", description="Rule or incident identifier e.g. SAST-WEB-01")
    title: str = Field(..., description="Brief remediation summary title")
    root_cause: str = Field(..., alias="rootCause", description="Deep technical root cause analysis")
    resolution_strategy: str = Field(..., alias="resolutionStrategy", description="Architectural/implementation strategy")
    diff_before: str = Field(..., alias="diffBefore", description="Original snippet to replace")
    diff_after: str = Field(..., alias="diffAfter", description="Remediated code patch")
    unit_test_code: str = Field(..., alias="unitTestCode", description="Executable test verifying the fix")
    tests: List[UnitTestItem] = Field(default_factory=list, description="List of discrete test assertions")

    model_config = {
        "populate_by_name": True,
    }


class RemediationRequest(BaseModel):
    rule_id: str = Field(..., description="Target rule or vulnerability identifier")
    title: Optional[str] = Field(None, description="Optional issue title")
    origin: Literal["Security (SAST)", "Runtime Crash", "Quality (AST)", "Telemetry Log"] = Field(
        "Security (SAST)", description="Originating diagnostic category"
    )
    severity: Literal["critical", "high", "medium", "low"] = Field("high", description="Severity classification")
    file_path: str = Field(..., description="Relative or absolute path of file to remediate")
    line_number: int = Field(..., description="Line number of violation")
    snippet: str = Field(..., description="Surrounding code snippet context")
    error_message: Optional[str] = Field(None, description="Detailed diagnostic or compiler error message")
    context_window: Optional[int] = Field(None, description="Optional override for context lines")


class RemediationResponse(BaseModel):
    rule_id: str
    remediation: RemediationPlan
    raw_prompt_tokens: Optional[int] = None
    raw_completion_tokens: Optional[int] = None
    model_used: str
    elapsed_seconds: float
