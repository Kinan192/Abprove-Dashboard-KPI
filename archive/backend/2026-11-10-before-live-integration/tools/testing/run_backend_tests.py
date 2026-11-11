"""Compatibility entry point for the current backend v2 isolated runner."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("run_backend_v2_tests.py")), run_name="__main__")
