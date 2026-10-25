import os
import pytest
from app.db.session import init_db, get_db_connection
from app.services.detector_service import inspect_local_project_path
from app.services.software_fleet_service import software_fleet_service
from app.schemas.software import SoftwareEnrollRequest


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    test_db = str(tmp_path / "test_nexis.db")
    monkeypatch.setattr("app.core.config.settings.SQLITE_DB_PATH", test_db)
    init_db()
    yield


def test_path_inspection_existing():
    # Inspect frontend directory in current repo
    frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend"))
    res = inspect_local_project_path(frontend_path)
    assert res["valid"] is True
    assert res["platform_detected"] in ["TypeScript / Next.js", "TypeScript / React", "Node.js / TypeScript"]
    assert "package.json" in res["signature_files"]


def test_path_inspection_nonexistent():
    res = inspect_local_project_path("/non/existent/path/for/nexis/testing")
    assert res["valid"] is False
    assert "does not exist" in res["error"]


def test_software_enrollment_lifecycle():
    frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend"))
    req = SoftwareEnrollRequest(
        name="Nexis Web Dashboard",
        category="Web API",
        local_repo_path=frontend_path,
        target_url="http://localhost:3000",
        description="Core next.js observability console",
    )

    result = software_fleet_service.enroll(req)
    assert result.software.name == "Nexis Web Dashboard"
    assert result.software.id == "nexis-web-dashboard"
    assert result.api_key_raw.startswith("nx_live_")
    assert "NEXIS_API_KEY=" in result.env_block
    assert len(result.software.nodes) >= 1
    assert result.software.nodes[0].node_type == "INGRESS"

    # Verify listing
    all_softwares = software_fleet_service.list_all()
    assert any(s.id == "nexis-web-dashboard" for s in all_softwares)

    # Verify AI connector was generated (Approach C)
    assert result.connector_generated is True
    assert result.connector_file_name == "nexis-telemetry.ts"
    assert os.path.exists(result.connector_file_path)

    # Cleanup generated test connector
    if result.connector_file_path and os.path.exists(result.connector_file_path):
        os.remove(result.connector_file_path)
    env_file = os.path.join(os.path.dirname(result.connector_file_path), ".env.nexis")
    if os.path.exists(env_file):
        os.remove(env_file)

    # De-enroll
    deleted = software_fleet_service.delete("nexis-web-dashboard")
    assert deleted is True
    assert software_fleet_service.get_by_id("nexis-web-dashboard") is None


def test_ai_connector_django_generation(tmp_path):
    from app.services.ai_connector_service import ai_connector_service
    fake_django_repo = tmp_path / "my_django_app"
    fake_django_repo.mkdir()
    (fake_django_repo / "manage.py").write_text("# Django manage.py")

    res = ai_connector_service.generate_and_install_connector(
        software_id="test-django",
        local_repo_path=str(fake_django_repo),
        raw_token="nx_live_test123",
        platform_detected="Python / Django",
        backend_url="http://localhost:8000",
    )

    assert res["generated"] is True
    assert res["file_name"] == "nexis_telemetry.py"
    assert os.path.exists(res["file_path"])
    content = open(res["file_path"]).read()
    assert "NexisLogHandler" in content
    assert "NexisDjangoMiddleware" in content
    assert "nx_live_test123" in content

