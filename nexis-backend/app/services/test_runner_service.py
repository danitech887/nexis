import asyncio
import os
import tempfile
import time
from typing import Dict, Any, List


class TestRunnerService:
    __test__ = False

    def __init__(self, execution_timeout: float = 15.0):
        self.execution_timeout = execution_timeout

    async def execute_python_test(
        self,
        test_code: str,
        implementation_code: str = "",
    ) -> Dict[str, Any]:
        """
        Executes a generated Python unit test in an isolated temporary runner context.
        """
        start = time.time()
        with tempfile.TemporaryDirectory(prefix="nexis_test_") as tmpdir:
            test_file = os.path.join(tmpdir, "test_target.py")
            module_file = os.path.join(tmpdir, "solution.py")

            with open(module_file, "w", encoding="utf-8") as f:
                f.write(implementation_code)

            # Prepend module import if needed
            full_test_content = (
                "import sys\nimport os\n"
                f"sys.path.insert(0, '{tmpdir}')\n"
                f"{test_code}\n"
            )

            with open(test_file, "w", encoding="utf-8") as f:
                f.write(full_test_content)

            try:
                proc = await asyncio.create_subprocess_exec(
                    "pytest",
                    "-q",
                    "--tb=short",
                    test_file,
                    cwd=tmpdir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=self.execution_timeout
                )
                duration = time.time() - start
                return {
                    "passed": proc.returncode == 0,
                    "returncode": proc.returncode,
                    "stdout": stdout.decode("utf-8", errors="replace"),
                    "stderr": stderr.decode("utf-8", errors="replace"),
                    "duration_seconds": round(duration, 3),
                }
            except asyncio.TimeoutError:
                return {
                    "passed": False,
                    "returncode": -1,
                    "stdout": "",
                    "stderr": f"Execution timed out after {self.execution_timeout}s",
                    "duration_seconds": self.execution_timeout,
                }
            except Exception as e:
                return {
                    "passed": False,
                    "returncode": -2,
                    "stdout": "",
                    "stderr": str(e),
                    "duration_seconds": round(time.time() - start, 3),
                }


test_runner_service = TestRunnerService()
