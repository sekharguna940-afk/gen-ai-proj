"""
lambda_function.py — Update Complaint Status

API Gateway route: PATCH /complaints/{id}/status
Body payload: { "status": "in_progress", "notes": "Working on it" }
"""

import json
import logging
import os
import boto3
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "Complaints")
REGION = os.environ.get("REGION", "ap-south-1")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "PATCH,OPTIONS",
}


def lambda_handler(event, context):
    try:
        # Extract incident ID from path parameters
        path_params = event.get("pathParameters") or {}
        incident_id = path_params.get("id")

        if not incident_id:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Missing complaint ID"}),
            }

        # Parse the JSON body
        body = json.loads(event.get("body", "{}"))
        new_status = body.get("status")

        if not new_status:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Missing new status"}),
            }

        # Validate the status
        valid_statuses = ["submitted", "assigned", "in_progress", "resolved", "closed"]
        if new_status not in valid_statuses:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": f"Invalid status. Must be one of: {valid_statuses}"}),
            }

        # Build update expression
        update_expr = "SET #st = :s"
        expr_attr_names = {"#st": "status"}
        expr_attr_values = {":s": new_status}

        # If it's being resolved or closed, we can add a resolved_at timestamp
        if new_status in ["resolved", "closed"]:
            update_expr += ", resolvedAt = :ra"
            expr_attr_values[":ra"] = datetime.utcnow().isoformat() + "Z"

        if body.get("latitude") is not None and body.get("longitude") is not None:
            update_expr += ", latitude = :lat, longitude = :lng"
            expr_attr_values[":lat"] = str(body["latitude"])
            expr_attr_values[":lng"] = str(body["longitude"])
        if body.get("address"):
            update_expr += ", address = :addr"
            expr_attr_values[":addr"] = body["address"]

        # Update the DynamoDB record
        response = table.update_item(
            Key={"incident_id": incident_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues="ALL_NEW"
        )

        updated_item = response.get("Attributes", {})

        return {
            "statusCode": 200,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({
                "success": True, 
                "message": f"Complaint {incident_id} updated to {new_status}",
                "updatedRecord": updated_item
            }, default=str),
        }

    except Exception as exc:
        logger.error(f"Failed to update status: {str(exc)}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Failed to update complaint status"}),
        }
