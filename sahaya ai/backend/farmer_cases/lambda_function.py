"""Authenticated farmer assistance case API backed by DynamoDB."""

import json
import logging
import os
import time
import uuid

import boto3
from boto3.dynamodb.conditions import Key
from common.auth import get_authenticated_user, response

logger = logging.getLogger()
logger.setLevel(logging.INFO)
REGION = os.environ.get("REGION", "ap-south-1")
TABLE_NAME = os.environ.get("FARMER_CASES_TABLE", "FarmerCases")
table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)


def lambda_handler(event, context):
    if (event.get("httpMethod") or "").upper() == "OPTIONS":
        return response(200, {})
    try:
        user = get_authenticated_user(event)
        user_id = user.get("user_id", user["phone"])
        method = (event.get("httpMethod") or "GET").upper()
        if method == "GET":
            items = table.query(
                KeyConditionExpression=Key("user_id").eq(user_id),
                ScanIndexForward=False,
            ).get("Items", [])
            return response(200, {"success": True, "cases": items})
        if method != "POST":
            return response(405, {"error": "Method not allowed"})

        body = json.loads(event.get("body") or "{}")
        required = ["subject", "description"]
        if any(not body.get(field) for field in required):
            return response(400, {"error": "subject and description are required"})
        case_id = str(uuid.uuid4())
        item = {
            "user_id": user_id,
            "case_id": case_id,
            "subject": str(body["subject"])[:200],
            "description": str(body["description"])[:5000],
            "category": body.get("category", "Other"),
            "urgency": body.get("urgency", "Normal"),
            "status": "Open",
            "created_at": int(time.time()),
        }
        table.put_item(Item=item)
        return response(201, {"success": True, "case": item})
    except PermissionError as exc:
        return response(403, {"error": str(exc)})
    except Exception:
        logger.exception("Farmer case request failed")
        return response(500, {"error": "Farmer assistance service failed"})
