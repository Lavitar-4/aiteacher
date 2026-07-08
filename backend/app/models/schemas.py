from pydantic import BaseModel
from typing import Optional, Any, List


class TeachRequest(BaseModel):
    topic: str
    student_message: str = ""
    session_id: str = "default"


class AskRequest(BaseModel):
    message: str
    session_id: str = "default"


class PrefsRequest(BaseModel):
    session_id: str = "default"
    language: Optional[str] = None
    level: Optional[str] = None
    slow_mode: Optional[bool] = None
    animation_enabled: Optional[bool] = None
