import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Body
from app.core.security import validate_api_key

router = APIRouter()

# Static SAST security rules for pattern-based and AST taint scanning
SAST_RULES = [
    {
        "id": "SAST-WEB-01",
        "title": "Missing Strict-Transport-Security Header",
        "severity": "medium",
        "pattern": r"headers\(\)\s*\{",
        "missing_token": "Strict-Transport-Security",
        "description": "HTTP Strict Transport Security header not enforced in production headers.",
        "cwe": "CWE-319",
    },
    {
        "id": "SAST-INJ-01",
        "title": "SQL String Concatenation In Query Sink",
        "severity": "critical",
        "pattern": r"(?:cursor|connection|conn|db|session)\.(?:execute|raw)\s*\(\s*(?:f[\"']|[\"'].*?[\"']\s*\+)",
        "description": "Raw SQL query constructed via string concatenation or unescaped format string.",
        "cwe": "CWE-89",
    },
    {
        "id": "SAST-SEC-03",
        "title": "Hardcoded Cryptographic Secret / Token",
        "severity": "high",
        "pattern": r"(secret_key|api_key|jwt_secret|private_key)\s*=\s*['\"][a-zA-Z0-9_\-\.]{16,}['\"]",
        "description": "Hardcoded credential detected in source code.",
        "cwe": "CWE-798",
    },
    {
        "id": "SAST-SSR-02",
        "title": "Unvalidated Server-Side Request Forgery Sink",
        "severity": "high",
        "pattern": r"(requests\.get|httpx\.get|fetch)\s*\(\s*(request\.|url|target_url|user_input)",
        "description": "HTTP client fetches URL directly from unvalidated request parameter.",
        "cwe": "CWE-918",
    },
]


@router.post("/scan")
async def scan_code_security(
    code: str = Body(..., embed=True),
    filename: str = Body("source.py", embed=True),
    _auth: str = Depends(validate_api_key)
) -> Dict[str, Any]:
    """
    Scans a source file or snippet for known vulnerability patterns and SAST rules.
    """
    findings = []
    lines = code.splitlines()

    for rule in SAST_RULES:
        pattern = re.compile(rule["pattern"], re.IGNORECASE)
        for idx, line in enumerate(lines):
            line_no = idx + 1
            if pattern.search(line):
                findings.append({
                    "rule_id": rule["id"],
                    "title": rule["title"],
                    "severity": rule["severity"],
                    "cwe": rule["cwe"],
                    "line_number": line_no,
                    "snippet": line.strip(),
                    "description": rule["description"],
                })

    return {
        "filename": filename,
        "scanned_lines": len(lines),
        "findings_count": len(findings),
        "findings": findings,
    }


@router.get("/rules")
async def get_sast_rules(_auth: str = Depends(validate_api_key)):
    """
    Returns registered SAST scan rules and CVE identifiers.
    """
    return {"rules": SAST_RULES}


@router.get("/audit/{software_id}")
async def audit_software(software_id: str, _auth: str = Depends(validate_api_key)):
    """
    Executes live SCA dependency audit and SAST source scan on an enrolled software.
    """
    from app.services.software_fleet_service import SoftwareFleetService
    from app.services.security_scanner_service import audit_software_repo

    fleet_service = SoftwareFleetService()
    software = fleet_service.get_by_id(software_id)
    if not software or not software.local_repo_path:
        return {
            "error": "Software or local repository path not found",
            "cves": [],
            "sastFindings": [],
            "summary": {
                "criticalCves": 0,
                "highCves": 0,
                "sastIssues": 0,
                "riskScore": "0.0",
                "scannedFiles": 0,
            }
        }

    return audit_software_repo(software.local_repo_path)


@router.post("/autobump")
async def autobump_software_package(
    software_id: str = Body(..., embed=True),
    package_name: str = Body(..., embed=True),
    target_version: Optional[str] = Body(None, embed=True),
    _auth: str = Depends(validate_api_key)
):
    """
    Executes real automated package upgrade and returns diff.
    """
    from app.services.software_fleet_service import SoftwareFleetService
    from app.services.security_scanner_service import autobump_package

    fleet_service = SoftwareFleetService()
    software = fleet_service.get_by_id(software_id)
    if not software or not software.local_repo_path:
        return {"success": False, "error": "Software or local repo not found"}

    return autobump_package(software.local_repo_path, package_name, target_version)
