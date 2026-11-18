#!/usr/bin/env python3
"""Generate a local website asset with KIE; never expose the API key to the browser."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_ROOT = "https://api.kie.ai"
DEFAULT_MODEL = "nano-banana-2"


def request_json(url: str, key: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "DSH-KIE-asset-generator/1.0",
        },
    )
    try:
        with urlopen(request, timeout=45) as response:
            result = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"KIE HTTP error: {error.code}") from error
    if result.get("code") != 200:
        raise RuntimeError(f"KIE API error {result.get('code')}: {result.get('msg', 'unknown error')}")
    return result


def generate(prompt: str, key: str, output: Path, model: str, resolution: str, aspect_ratio: str) -> None:
    created = request_json(
        f"{API_ROOT}/api/v1/jobs/createTask",
        key,
        {
            "model": model,
            "input": {
                "prompt": prompt,
                "image_input": [],
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "output_format": "png",
            },
        },
    )
    task_id = created["data"]["taskId"]
    print(f"Task created: {task_id}; waiting for the image...", flush=True)
    for attempt in range(90):
        time.sleep(3 if attempt < 10 else 6)
        result = request_json(
            f"{API_ROOT}/api/v1/jobs/recordInfo?{urlencode({'taskId': task_id})}", key
        )
        data = result.get("data") or {}
        state = data.get("state")
        if state == "success":
            raw_results = data.get("resultJson") or "{}"
            urls = json.loads(raw_results).get("resultUrls") or []
            if not urls:
                raise RuntimeError("KIE returned no result URLs")
            with urlopen(Request(urls[0], headers={"User-Agent": "DSH-asset-downloader/1.0"}), timeout=90) as response:
                image = response.read()
            if len(image) < 1000:
                raise RuntimeError("Downloaded asset is unexpectedly small")
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(image)
            print(json.dumps({"status": "saved", "file": str(output), "bytes": len(image), "credits": data.get("creditsConsumed")}, ensure_ascii=False))
            return
        if state == "fail":
            raise RuntimeError(f"KIE generation failed: {data.get('failMsg') or data.get('failCode') or 'unknown error'}")
        print(f"Status: {state or 'unknown'}", flush=True)
    raise TimeoutError(f"KIE task {task_id} did not finish within the polling window")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt-file", required=True, type=Path)
    parser.add_argument("--key-file", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--resolution", choices=["1K", "2K", "4K"], default="1K")
    parser.add_argument("--aspect-ratio", default="4:3")
    args = parser.parse_args()
    key = args.key_file.read_text(encoding="utf-8").strip()
    if not key:
        raise ValueError("The KIE credential file is empty")
    prompt = args.prompt_file.read_text(encoding="utf-8").strip()
    generate(prompt, key, args.output, args.model, args.resolution, args.aspect_ratio)


if __name__ == "__main__":
    main()
