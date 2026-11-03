"""Authenticated farmer crop CRUD API backed by DynamoDB."""

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
TABLE_NAME = os.environ.get("FARMER_CROPS_TABLE", "FarmerCrops")
table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)


def lambda_handler(event, context):
    if (event.get("httpMethod") or "").upper() == "OPTIONS":
        return response(200, {})
    try:
        user = get_authenticated_user(event)
        user_id = user.get("user_id", user["phone"])
        method = (event.get("httpMethod") or "GET").upper()
        if method == "GET":
            items = table.query(KeyConditionExpression=Key("user_id").eq(user_id)).get("Items", [])
            return response(200, {"success": True, "crops": items})

        body = json.loads(event.get("body") or "{}")
        crop_id = _path_id(event) or body.get("id") or str(uuid.uuid4())
        if method == "POST":
            item = {"user_id": user_id, "crop_id": crop_id, "created_at": int(time.time()), **_crop_fields(body)}
            table.put_item(Item=item)
            return response(201, {"success": True, "crop": item})
        if method == "PATCH":
            values = _crop_fields(body)
            if not values:
                return response(400, {"error": "No crop fields supplied"})
            names = {f"#{name}": name for name in values}
            placeholders = {f":{name}": value for name, value in values.items()}
            update = ", ".join(f"#{name} = :{name}" for name in values)
            table.update_item(
                Key={"user_id": user_id, "crop_id": crop_id},
                UpdateExpression=f"SET {update}",
                ExpressionAttributeNames=names,
                ExpressionAttributeValues=placeholders,
            )
            return response(200, {"success": True, "cropId": crop_id})
        if method == "DELETE":
            table.delete_item(Key={"user_id": user_id, "crop_id": crop_id})
            return response(200, {"success": True, "cropId": crop_id})
        return response(405, {"error": "Method not allowed"})
    except PermissionError as exc:
        return response(403, {"error": str(exc)})
    except Exception:
        logger.exception("Farmer crop request failed")
        return response(500, {"error": "Farmer crop service failed"})


def _path_id(event):
    return (event.get("pathParameters") or {}).get("id")


def _crop_fields(body):
    allowed = {"cropName", "variety", "sowingDate", "expectedHarvestDate", "farmId", "area", "season"}
    return {name: value for name, value in body.items() if name in allowed}
