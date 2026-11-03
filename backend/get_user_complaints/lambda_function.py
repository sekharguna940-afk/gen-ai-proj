"""
lambda_function.py — Get complaints, optionally filtered by user phone.

API Gateway route: GET /complaints
Query params:
    phone  — if provided, only return complaints belonging to this phone number
"""

import json
import logging
import os

import boto3
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "Complaints")
REGION = os.environ.get("REGION", "ap-south-1")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}


def lambda_handler(event, context):
    try:
        # Read query string parameters
        params = event.get("queryStringParameters") or {}
        phone = params.get("phone")
        status = params.get("status")
        category = params.get("category")

        filter_expressions = []
        if phone:
            filter_expressions.append(Attr("user_phone").eq(phone))
        if status:
            filter_expressions.append(Attr("status").eq(status))
        if category:
            if category == 'road_issue':
                filter_expressions.append(Attr("category").is_in(['road_issue', 'pothole']))
            elif category == 'waste':
                filter_expressions.append(Attr("category").is_in(['waste', 'garbage']))
            elif category == 'lighting':
                filter_expressions.append(Attr("category").is_in(['lighting', 'streetlight', 'broken_streetlight']))
            else:
                filter_expressions.append(Attr("category").eq(category))

        scan_kwargs = {}
        if filter_expressions:
            combined_filter = filter_expressions[0]
            for expr in filter_expressions[1:]:
                combined_filter = combined_filter & expr
            scan_kwargs["FilterExpression"] = combined_filter

        response = table.scan(**scan_kwargs)
        items = response.get("Items", [])

        return {
            "statusCode": 200,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"success": True, "complaints": items}, default=str),
        }
    except Exception as exc:
        logger.error("DynamoDB read failed: %s", str(exc))
        return {
            "statusCode": 500,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Database read failed"}),
        }
