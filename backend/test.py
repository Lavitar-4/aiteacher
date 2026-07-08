import asyncio
from app.core.ai_provider import get_provider

async def test():
    p = get_provider()
    try:
        async for x in p.stream([{'role': 'user', 'content': 'hi'}], ''):
            print(x)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test())
