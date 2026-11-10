"""Serve the sibling backend with real HTTP/JWT and a synthetic AI provider.

Run with Backend's Python environment. All data and short-lived test
credentials live beneath the OS temporary directory, never in either checkout.
The pause/stop files are local test controls, not additional HTTP endpoints.
"""

import argparse
import json
import os
import signal
import sys
import tempfile
from collections import Counter
from pathlib import Path
from threading import Event
from time import monotonic
from urllib.parse import urlsplit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--descriptor", type=Path, required=True)
    parser.add_argument(
        "--backend", type=Path, default=Path(__file__).resolve().parents[2] / "Backend"
    )
    parser.add_argument("--public-base-url", default="http://127.0.0.1:5173")
    parser.add_argument("--max-seconds", type=int, default=900)
    args = parser.parse_args()
    descriptor = args.descriptor.resolve()
    temp_root = Path(tempfile.gettempdir()).resolve()
    if not descriptor.is_relative_to(temp_root) or descriptor == temp_root:
        parser.error("The descriptor must be inside the OS temporary directory")
    if not 1 <= args.max_seconds <= 1800:
        parser.error("max-seconds must be between 1 and 1800")
    origin = urlsplit(args.public_base_url)
    if (
        origin.scheme != "http"
        or origin.hostname not in {"127.0.0.1", "localhost", "::1"}
        or origin.username
        or origin.password
        or origin.path not in {"", "/"}
        or origin.query
        or origin.fragment
    ):
        parser.error("public-base-url must be a plain loopback HTTP origin")
    backend = args.backend.resolve()
    if not (backend / "tests" / "ab_support.py").is_file():
        parser.error("The sibling Backend test fixture was not found")
    descriptor.parent.mkdir(parents=True, exist_ok=True)
    if descriptor.exists():
        parser.error("Refusing to overwrite an existing descriptor")
    stop_file = descriptor.with_suffix(".stop")
    pause_file = descriptor.with_suffix(".pause")
    if stop_file.exists() or pause_file.exists():
        parser.error("Use a fresh descriptor name without existing control files")
    sys.dont_write_bytecode = True
    sys.path[:0] = [str(backend), str(backend / "src")]
    from tests.ab_support import KEY, MODEL, ab_http_application

    stop = Event()
    for name in ("SIGINT", "SIGTERM", "SIGBREAK"):
        signum = getattr(signal, name, None)
        if signum is not None:
            signal.signal(signum, lambda *_: stop.set())
    summary = {"fixture": "real-http-real-jwt-synthetic-provider", "clean_shutdown": False}
    created_descriptor = False
    try:
        with tempfile.TemporaryDirectory(prefix="team4-browser-db-", dir=descriptor.parent) as state:
            if not Path(state).resolve().is_relative_to(temp_root):
                raise RuntimeError("Temporary state escaped the designated temp directory")
            with ab_http_application(Path(state)) as fixture:
                # Model deployment's public origin without rewriting signed URLs
                # in the frontend. LocalStorage caches this value during init.
                fixture.settings.public_base_url = args.public_base_url.rstrip("/")
                fixture.ctx.storage.base = fixture.settings.public_base_url
                metadata = {
                    "baseUrl": fixture.base_url,
                    "publicBaseUrl": fixture.settings.public_base_url,
                    "ownerToken": fixture.owner_headers["Authorization"].removeprefix("Bearer "),
                    "otherToken": fixture.other_headers["Authorization"].removeprefix("Bearer "),
                    "providerKey": KEY,
                    "modelId": MODEL,
                    "ownerEmail": "owner@ab-fixture.invalid",
                    "otherEmail": "other@ab-fixture.invalid",
                    "pauseFile": str(pause_file),
                    "stopFile": str(stop_file),
                    "pid": os.getpid(),
                }
                fd = os.open(descriptor, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    json.dump(metadata, stream)
                created_descriptor = True
                print("Synthetic backend fixture ready; connection metadata is in the private descriptor.", flush=True)
                deadline = monotonic() + args.max_seconds
                while not stop.is_set() and not stop_file.exists() and monotonic() < deadline:
                    if not pause_file.exists():
                        fixture.ctx.jobs.run_once()
                    stop.wait(0.1)
                summary["provider_calls"] = dict(Counter(kind for kind, _ in fixture.provider.calls))
            summary["clean_shutdown"] = True
    finally:
        if created_descriptor:
            descriptor.unlink(missing_ok=True)
            stop_file.unlink(missing_ok=True)
            pause_file.unlink(missing_ok=True)
        descriptor.with_suffix(".summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("Synthetic backend fixture stopped cleanly.", flush=True)


if __name__ == "__main__":
    main()
