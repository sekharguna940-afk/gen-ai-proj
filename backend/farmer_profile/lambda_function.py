"""Authenticated farmer profile API backed by DynamoDB."""

import json
import logging
import os

import boto3
from common.auth import get_authenticated_user, response

logger = logging.getLogger()
logger.setLevel(logging.INFO)
REGION = os.environ.get("REGION", "ap-south-1")
TABLE_NAME = os.environ.get("FARMER_PROFILES_TABLE", "FarmerProfiles")
table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)


def lambda_handler(event, context):
    if (event.get("httpMethod") or "").upper() == "OPTIONS":
        return response(200, {})
    try:
        user = get_authenticated_user(event)
        key = {"user_id": user.get("user_id", user["phone"])}
        method = (event.get("httpMethod") or "GET").upper()
        if method == "GET":
            item = table.get_item(Key=key).get("Item")
            return response(200, {"success": True, "profile": item})
        if method == "PATCH":
            body = json.loads(event.get("body") or "{}")
            allowed = {
                "farmerName", "phone", "village", "district", "state", "farmName",
                "farmLocation", "latitude", "longitude", "landArea", "areaUnit",
                "soilType", "irrigationType",
            }
            values = {name: value for name, value in body.items() if name in allowed}
            if not values:
                return response(400, {"error": "No profile fields supplied"})
            names = {f"#{name}": name for name in values}
            placeholders = {f":{name}": value for name, value in values.items()}
            update = ", ".join(f"#{name} = :{name}" for name in values)
            table.update_item(
                Key=key,
                UpdateExpression=f"SET {update}",
                ExpressionAttributeNames=names,
                ExpressionAttributeValues=placeholders,
            )
            return response(200, {"success": True, "profile": {**key, **values}})
        return response(405, {"error": "Method not allowed"})
    except PermissionError as exc:
        return response(403, {"error": str(exc)})
    except Exception:
        logger.exception("Farmer profile request failed")
        return response(500, {"error": "Farmer profile service failed"})
