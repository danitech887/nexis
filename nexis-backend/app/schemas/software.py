from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class SoftwareNodeBase(BaseModel):
    id: str
    software_id: str
    name: str
    node_type: Literal["INGRESS", "COMPUTE", "STORAGE", "ASYNC"] = "INGRESS"
    endpoint_url: Optional[str] = None
    health_status: Literal["HEALTHY", "DEGRADED", "OFFLINE"] = "HEALTHY"


class SoftwareNodeResponse(SoftwareNodeBase):
    created_at: Optional[str] = None


class SoftwareEnrollRequest(BaseModel):
    name: str = Field(..., description="Display name of application e.g. Apex Logistics")
    category: Literal["Web API", "Frontend App", "Microservice", "Mobile", "Desktop"] = Field(
        "Web API", description="Classification category"
    )
    platform: Optional[str] = Field(None, description="Optional stack override e.g. Python / Django")
    local_repo_path: str = Field(..., description="Absolute local path to codebase")
    repo_url: Optional[str] = Field(None, description="Remote Git repository URL e.g. https://github.com/org/repo")
    target_url: Optional[str] = Field(None, description="Live deployment or service endpoint (e.g. frontend / ingress)")
    backend_url: Optional[str] = Field(None, description="Optional backend API service URL if distinct from ingress")
    git_branch: Optional[str] = Field("main", description="Git branch to track or monitor")
    environment: Optional[str] = Field("production", description="Environment: production, staging, development")
    provider: Optional[str] = Field("custom", description="Hosting cloud provider: vercel, render, railway, fly, aws, netlify, koyeb, digitalocean, custom")
    provider_api_key: Optional[str] = Field(None, description="Personal access token / API key for hosting platform")
    provider_project_id: Optional[str] = Field(None, description="Discovered service ID, project ID, or app slug on provider")
    description: Optional[str] = Field(None, description="Functional summary")
    auto_generate_connector: bool = Field(True, description="Whether to generate and install Approach C telemetry connector in repo")


class SoftwareResponse(BaseModel):
    id: str
    name: str
    category: str
    platform: str
    local_repo_path: str
    repo_url: Optional[str] = None
    target_url: Optional[str] = None
    provider: Optional[str] = "custom"
    provider_project_id: Optional[str] = None
    description: Optional[str] = None
    status: str = "ACTIVE"
    health_score: int = 100
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    nodes: List[SoftwareNodeResponse] = Field(default_factory=list)


class SoftwareEnrollmentResult(BaseModel):
    software: SoftwareResponse
    api_key_raw: str = Field(..., description="Unmasked raw API ingest secret displayed once")
    env_block: str = Field(..., description="Ready-to-paste .env configuration snippet")
    connector_file_path: Optional[str] = Field(None, description="Path to generated telemetry connector file")
    connector_file_name: Optional[str] = Field(None, description="Filename of generated connector")
    connector_generated: bool = Field(False, description="Whether connector was generated and installed")
    connector_snippet: Optional[str] = Field(None, description="Preview snippet of the connector code")
    connector_instructions: Optional[str] = Field(None, description="Quick setup instructions")


class PathInspectionRequest(BaseModel):
    local_path: str


class PathInspectionResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    expanded_path: str
    has_git: bool = False
    git_remote_url: Optional[str] = None
    platform_detected: str
    category_suggested: str
    signature_files: List[str] = Field(default_factory=list)
    total_top_level_files: int = 0


class RepoCloneRequest(BaseModel):
    repo_url: str = Field(..., description="Remote Git clone URL (HTTPS or SSH)")
    destination_parent_dir: Optional[str] = Field(None, description="Parent folder on local machine where repo will be cloned")
    custom_folder_name: Optional[str] = Field(None, description="Custom directory name for cloned repo")
    branch: Optional[str] = Field("main", description="Git branch to clone")


class RepoCloneResponse(BaseModel):
    success: bool
    cloned_path: str
    folder_name: str
    already_existed: bool = False
    message: str
    error: Optional[str] = None
    inspection: Optional[PathInspectionResponse] = None
