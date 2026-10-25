import pytest
from app.services.ast_service import ast_service

PYTHON_SAMPLE = """
def calculate_discount(price: float, is_vip: bool, coupon_code: str | None) -> float:
    discount = 0.0
    if is_vip:
        discount += 0.20
    if coupon_code:
        if coupon_code == "SUPER":
            discount += 0.15
        elif coupon_code == "WELCOME":
            discount += 0.05
    return price * (1.0 - discount)
"""

TYPESCRIPT_SAMPLE = """
export function routeRequest(path: string, method: string): boolean {
  if (path === "/api/health") {
    return true;
  }
  if (method === "POST" || method === "PUT") {
    return true;
  }
  return false;
}
"""


def test_python_ast_parsing():
    res = ast_service.parse_code(PYTHON_SAMPLE, "python")
    assert res["language"] == "python"
    assert res["function_count"] >= 1
    assert res["functions"][0]["name"] == "calculate_discount"
    assert res["cyclomatic_complexity"] > 1
    assert not res["has_syntax_errors"]


def test_typescript_ast_parsing():
    res = ast_service.parse_code(TYPESCRIPT_SAMPLE, "typescript")
    assert res["language"] == "typescript"
    assert res["function_count"] >= 1
    assert res["functions"][0]["name"] == "routeRequest"
    assert res["cyclomatic_complexity"] >= 2


def test_ast_node_structure():
    res = ast_service.parse_code("x = 1 + 2", "python")
    assert "ast_preview" in res
    assert res["node_count"] > 0
