from __future__ import annotations

import json
import os

import requests


TIMEOUT_SECONDS = 30


def main() -> None:
    supabase_url = os.getenv("SUPABASE_URL")
    api_key = os.getenv("SUPABASE_API_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    ingest_token = os.getenv("SUPABASE_INGEST_TOKEN")
    retention_days = int(os.getenv("ARTICLE_RETENTION_DAYS", "14"))

    if not supabase_url or not api_key or not ingest_token:
        raise RuntimeError(
            "SUPABASE_URL, SUPABASE_API_KEY or SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_INGEST_TOKEN are required.",
        )

    response = requests.post(
        f"{supabase_url}/rest/v1/rpc/run_ingest_maintenance",
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "x-ingest-token": ingest_token,
        },
        json={"retention_days": retention_days},
        timeout=TIMEOUT_SECONDS,
    )
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(
            f"HTTP {response.status_code} from {response.request.method} {response.url}: {response.text.strip()[:2000]}",
        ) from exc
    print(json.dumps(response.json(), indent=2))


if __name__ == "__main__":
    main()
