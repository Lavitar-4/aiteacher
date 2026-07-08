import asyncio
from app.core.config import settings
from google import genai
from google.genai import types

async def test():
    client = genai.Client(api_key=settings.gemini_api_key)
    
    # Try empty system_instruction
    try:
        config = types.GenerateContentConfig(
            system_instruction="",
            temperature=0.2,
            response_mime_type="application/json"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="test prompt",
            config=config,
        )
        print("Success with empty system")
    except Exception as e:
        print(f"Error with empty system: {e}")

asyncio.run(test())
