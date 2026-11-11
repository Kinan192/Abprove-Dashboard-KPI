"""Current backend integration runner, including Better Auth."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("run_backend_v3_tests.py")), run_name="__main__")
