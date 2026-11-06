"""Brute-force protection for the password login (in memory - one process, see README).

After 5 wrong passwords for one user name the name is locked for 30 seconds; after 20 failures from one
address within 5 minutes the address is locked for 30 seconds (stops guessing many user names).
Windows sign-in (SSO) does not use passwords and is not affected.
"""

import threading
import time

from fastapi import Request

from app.config import settings

MAX_PER_USER = 5
MAX_PER_IP = 20
WINDOW = 300  # seconds in which failures are counted
LOCK = 30  # seconds of waiting once the limit is reached

_lock = threading.Lock()
_failures: dict[str, list[float]] = {}
_locked_until: dict[str, float] = {}


def client_ip(request: Request) -> str:
    """The browser's address; behind a trusted reverse proxy the first X-Forwarded-For entry."""
    host = request.client.host if request.client else ""
    if host in settings.trusted_proxies:
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return host


def _keys(username: str, ip: str) -> list[tuple[str, int]]:
    return [(f"user:{username.strip().lower()}", MAX_PER_USER), (f"ip:{ip}", MAX_PER_IP)]


def wait_seconds(username: str, ip: str) -> int:
    """>0 while the user name or address is locked."""
    now = time.monotonic()
    with _lock:
        left = max((_locked_until.get(k, 0) - now for k, _ in _keys(username, ip)), default=0)
    return int(left + 0.999) if left > 0 else 0


def failed(username: str, ip: str) -> int:
    """Record a wrong password; returns the waiting time if this attempt reached a limit."""
    now = time.monotonic()
    wait = 0
    with _lock:
        for key, limit in _keys(username, ip):
            recent = [t for t in _failures.get(key, []) if now - t < WINDOW] + [now]
            _failures[key] = recent
            if len(recent) >= limit:
                _locked_until[key] = now + LOCK
                _failures[key] = []
                wait = LOCK
    return wait


def succeeded(username: str) -> None:
    with _lock:
        _failures.pop(f"user:{username.strip().lower()}", None)
        _locked_until.pop(f"user:{username.strip().lower()}", None)


def reset() -> None:  # tests
    with _lock:
        _failures.clear()
        _locked_until.clear()
