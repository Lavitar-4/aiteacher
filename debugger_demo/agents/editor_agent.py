from pathlib import Path


def edit_file(filepath, new_content):
    path = Path(filepath)
    path.write_text(new_content, encoding="utf-8")
    return str(path)
