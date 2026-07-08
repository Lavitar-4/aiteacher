from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager


@asynccontextmanager
async def deadline(seconds: int, label: str = "operation"):
    try:
        yield
    except asyncio.TimeoutError as exc:
        raise TimeoutError(f"{label} timed out after {seconds}s") from exc


async def with_timeout(awaitable, seconds: int, label: str = "operation"):
    try:
        return await asyncio.wait_for(awaitable, timeout=seconds)
    except asyncio.TimeoutError as exc:
        raise TimeoutError(f"{label} timed out after {seconds}s") from exc


async def terminate_process(proc: asyncio.subprocess.Process, grace_seconds: float = 2.0):
    if proc.returncode is not None:
        return
    proc.terminate()
    try:
        await asyncio.wait_for(proc.wait(), timeout=grace_seconds)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
