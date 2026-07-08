import argparse
import subprocess
import sys
from pathlib import Path

from ai import code_generator
from agents.editor_agent import edit_file


def run_python_file(filepath):
    target = Path(filepath)

    if not target.exists():
        return {
            "success": False,
            "stdout": "",
            "stderr": f"File not found: {target}",
        }

    try:
        result = subprocess.run(
            [sys.executable, str(target)],
            capture_output=True,
            text=True,
            timeout=20,
        )

        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }

    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
        }


def analyze_error(error_text):
    prompt = f"""
You are an autonomous debugger AI.

Analyze this traceback deeply.

Return:
- root cause
- corrected code
- explanation

ERROR:
{error_text}
"""

    return code_generator.generate_code(prompt)


def debug_file(filepath):
    result = run_python_file(filepath)

    if result["success"]:
        return "No errors found."

    return analyze_error(result["stderr"])


def main():
    parser = argparse.ArgumentParser(description="Run a Python file and analyze any traceback.")
    parser.add_argument("filepath", help="Path of the Python file to debug.")
    parser.add_argument(
        "--apply-demo-fix",
        action="store_true",
        help="Apply the built-in demo fix when debugging sample_broken.py.",
    )
    args = parser.parse_args()

    report = debug_file(args.filepath)
    print(report)

    if args.apply_demo_fix and Path(args.filepath).name == "sample_broken.py":
        fixed_code = """def divide(a, b):
    if b == 0:
        return None
    return a / b


print(divide(10, 2))
"""
        edit_file(args.filepath, fixed_code)
        print("\nApplied demo fix. Re-running...\n")
        print(run_python_file(args.filepath))


if __name__ == "__main__":
    main()
