def generate_code(prompt):
    """Small local stand-in for an AI code generator.

    The real project can replace this function with an LLM call. For this
    runnable demo, it extracts the traceback text and returns a useful report.
    """
    error_text = prompt.split("ERROR:", 1)[-1].strip()

    if "ZeroDivisionError" in error_text:
        return """Root cause:
The program divides by zero.

Corrected code:
def divide(a, b):
    if b == 0:
        return None
    return a / b

Explanation:
Check the denominator before division. Returning None is one simple policy; in a real app, you could raise a custom error or show a user-friendly message instead.
"""

    if "ModuleNotFoundError" in error_text:
        return f"""Root cause:
A required Python module could not be imported.

Corrected code:
Install the missing dependency, create the missing local module, or fix the import path.

Explanation:
Python could not resolve one of the imports in the target file.

Traceback:
{error_text}
"""

    return f"""Root cause:
The file failed while running. Read the traceback below for the exact failing line and exception type.

Corrected code:
Update the code at the failing line according to the exception.

Explanation:
This demo analyzer does not call a real LLM yet, but it preserves the traceback and gives a structured debugging response.

Traceback:
{error_text}
"""
