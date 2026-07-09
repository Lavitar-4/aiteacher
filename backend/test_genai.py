import asyncio
import os
from google import genai
from google.genai import types

async def main():
    # Use real key for test
    client = genai.Client() # Assumes GEMINI_API_KEY is set locally
    models = ["invalid-model-name", "gemini-1.5-flash"]
    for model in models:
        try:
            print(f"Trying {model}")
            response = client.aio.models.generate_content_stream(
                model=model,
                contents="hello",
            )
            chunk_emitted = False
            async for chunk in response:
                chunk_emitted = True
                print("Got chunk:", chunk.text)
            return
        except Exception as e:
            print(f"Failed {model}: {e}")
            if locals().get("chunk_emitted"):
                print("Already emitted, breaking")
                break
            continue

if __name__ == "__main__":
    asyncio.run(main())
