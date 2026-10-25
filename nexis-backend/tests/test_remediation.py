import pytest
from app.schemas.remediation import RemediationPlan, RemediationRequest
from app.services.context_service import context_service


def test_remediation_plan_validation():
    data = {
        "ruleId": "SAST-WEB-01",
        "title": "Missing Strict-Transport-Security Header",
        "rootCause": "Absence of HSTS header leaves connections exposed to SSL strip downgrade attacks.",
        "resolutionStrategy": "Add HSTS header with max-age=63072000 and includeSubDomains.",
        "diffBefore": "headers: {}",
        "diffAfter": 'headers: {"Strict-Transport-Security": "max-age=63072000"}',
        "unitTestCode": "def test_hsts(): assert True",
        "tests": [
            {"name": "test_hsts_header_present", "status": "pass", "assertion": "assert 'Strict-Transport-Security' in headers"}
        ],
    }
    plan = RemediationPlan(**data)
    assert plan.rule_id == "SAST-WEB-01"
    assert len(plan.tests) == 1
    assert plan.tests[0].status == "pass"


def test_unified_diff_generation():
    orig = "def old_calc():\n    return 1\n"
    new = "def old_calc():\n    return 2\n"
    diff = context_service.generate_unified_diff(orig, new, "test.py")
    assert "-    return 1" in diff
    assert "+    return 2" in diff
