"""
AI Provider — supports Gemini (gemini-2.5-flash).
Uses google-genai SDK directly.
"""
from __future__ import annotations
import json
from typing import AsyncIterator, Optional
from app.core.config import settings
from google import genai
from google.genai import types


class GeminiProvider:
    def __init__(self):
        self.models = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.0-flash", "gemini-3-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        self.client = genai.Client(api_key=settings.gemini_api_key)

    async def stream(self, messages: list[dict], system: str, image: str | None = None) -> AsyncIterator[str]:
        # Convert standard OpenAI-style messages to Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(msg.get("content", ""))]))
            
        if image and image.startswith("data:"):
            import base64
            header, b64_data = image.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0]
            image_bytes = base64.b64decode(b64_data)
            if contents:
                contents[-1].parts.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
        
        config = types.GenerateContentConfig(
            system_instruction=system or None,
            temperature=0.2,
            response_mime_type="application/json"
        )
        last_error = None
        
        for model in self.models:
            try:
                response = self.client.aio.models.generate_content_stream(
                    model=model,
                    contents=contents,
                    config=config,
                )
                chunk_emitted = False
                async for chunk in response:
                    if chunk.text:
                        chunk_emitted = True
                        yield chunk.text
                return  # If successful, we're done
            except Exception as e:
                last_error = e
                if locals().get("chunk_emitted"):
                    break  # Already emitted text, can't switch model seamlessly
                print(f"Model {model} failed: {e}. Trying next...")
                continue
                
        if last_error:
            raise last_error

    async def complete(self, messages: list[dict], system: str, image: str | None = None) -> str:
        contents = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(msg.get("content", ""))]))
            
        if image and image.startswith("data:"):
            import base64
            header, b64_data = image.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0]
            image_bytes = base64.b64decode(b64_data)
            if contents:
                contents[-1].parts.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
            
        config = types.GenerateContentConfig(
            system_instruction=system or None,
            temperature=0.2,
            response_mime_type="application/json"
        )
        last_error = None
        
        for model in self.models:
            try:
                response = await self.client.aio.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
                return response.text or ""
            except Exception as e:
                last_error = e
                print(f"Model {model} failed: {e}. Trying next...")
                continue
                
        if last_error:
            raise last_error
        return ""

    async def check_model(self) -> bool:
        """Check if the Gemini API is reachable."""
        try:
            # A simple quick completion
            await self.complete([{"role": "user", "content": "hi"}], "You are a tester.")
            return True
        except Exception:
            return False


def get_provider():
    return GeminiProvider()
