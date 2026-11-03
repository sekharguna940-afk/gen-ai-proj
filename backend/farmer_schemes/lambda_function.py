"""Live farmer scheme recommendations from India's Open Government Data API."""

import json
import logging
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from common.auth import get_authenticated_user, response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

API_BASE_URL = os.environ.get("SCHEMES_API_BASE_URL", "https://api.data.gov.in/resource").rstrip("/")
API_KEY = os.environ.get("SCHEMES_API_KEY", "").strip()
RESOURCE_ID = os.environ.get("SCHEMES_RESOURCE_ID", "").strip()


def _value(record, *keys):
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return str(value).strip()
    return ""


def _matches(record, filters):
    searchable = " ".join(str(value) for value in record.values()).lower()
    for value in filters.values():
        if value and str(value).lower() not in searchable:
            return False
    return True


def _normalize(record):
    name = _value(record, "scheme_name", "schemeName", "name", "title") or "Government scheme"
    return {
        "id": _value(record, "scheme_id", "schemeId", "id", "_id") or name,
        "name": name,
        "category": _value(record, "category", "scheme_category", "sector") or "Farmer support",
        "summary": _value(record, "description", "brief_description", "details", "objective") or "See the official scheme details.",
        "benefit": _value(record, "benefits", "benefit", "assistance", "financial_assistance") or "Check official source",
        "state": _value(record, "state", "states", "applicable_state") or "All states",
        "status": _value(record, "status", "scheme_status") or "Available",
        "url": _value(record, "url", "website", "official_url", "link"),
    }


def lambda_handler(event, context):
    if (event.get("httpMethod") or "").upper() == "OPTIONS":
        return response(200, {})

    try:
        get_authenticated_user(event)
    except PermissionError as exc:
        return response(401, {"success": False, "message": str(exc)})

    if not API_KEY or not RESOURCE_ID:
        return response(503, {
            "success": False,
            "message": "Government schemes API is not configured. Set SCHEMES_API_KEY and SCHEMES_RESOURCE_ID.",
            "schemes": [],
        })

    query = event.get("queryStringParameters") or {}
    filters = {
        "state": query.get("state", ""),
        "district": query.get("district", ""),
        "crop": query.get("crop", ""),
    }
    params = urlencode({"api-key": API_KEY, "format": "json", "limit": "1000"})
    url = f"{API_BASE_URL}/{RESOURCE_ID}?{params}"

    try:
        request = Request(url, headers={"Accept": "application/json"})
        with urlopen(request, timeout=8) as upstream:
            payload = json.loads(upstream.read().decode("utf-8"))
        records = payload.get("records", []) if isinstance(payload, dict) else []
        schemes = [_normalize(record) for record in records if isinstance(record, dict) and _matches(record, filters)]
        return response(200, {
            "success": True,
            "source": "data.gov.in",
            "schemes": schemes,
        })
    except Exception as exc:
        logger.exception("Government schemes API request failed")
        return response(502, {
            "success": False,
            "message": "The official government schemes service is temporarily unavailable.",
            "schemes": [],
        })
