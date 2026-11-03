"""Shared JWT and farmer-role authorization helpers for farmer Lambdas."""

import base64
import hashlib
import hmac
import json
import os
import time

import boto3

REGION = os.environ.get("REGION", "ap-south-1")
USERS_TABLE = os.environ.get("USERS_TABLE", "Users")
SECRET_KEY = os.environ.get("JWT_SECRET", "civicai-super-secret-key").encode("utf-8")
dynamodb = boto3.resource("dynamodb", region_name=REGION)


def _decode_part(value):
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("utf-8"))


def get_authenticated_user(event, required_role="farmer"):
    """Verify the bearer token and the role stored in DynamoDB."""
    headers = {str(k).lower(): v for k, v in (event.get("headers") or {}).items()}
    authorization = headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise PermissionError("Authentication is required")

    token = authorization[7:].strip()
    parts = token.split(".")
    if len(parts) != 3:
        raise PermissionError("Invalid authentication token")

    unsigned = f"{parts[0]}.{parts[1]}".encode("utf-8")
    expected = base64.urlsafe_b64encode(
        hmac.new(SECRET_KEY, unsigned, hashlib.sha256).digest()
    ).decode("utf-8").rstrip("=")
    if not hmac.compare_digest(expected, parts[2]):
        raise PermissionError("Invalid authentication token")

    try:
        payload = json.loads(_decode_part(parts[1]))
    except (ValueError, json.JSONDecodeError):
        raise PermissionError("Invalid authentication token")

    if int(payload.get("exp", 0)) <= int(time.time()):
        raise PermissionError("Authentication token has expired")

    phone = payload.get("phone")
    if not phone:
        raise PermissionError("Authentication token has no user")

    user = dynamodb.Table(USERS_TABLE).get_item(Key={"phone": phone}).get("Item")
    if not user or user.get("role") != required_role:
        raise PermissionError("Farmer role is required")

    return user


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, default=str),
    }
