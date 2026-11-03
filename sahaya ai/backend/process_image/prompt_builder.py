"""
prompt_builder.py — Amazon Nova complaint text generator for CivicAI.

Constructs a structured prompt, invokes Amazon Nova Micro in us-east-1, and returns
a formal municipal complaint description.
"""

import logging
import boto3

logger = logging.getLogger(__name__)

# Nova is in us-east-1
nova_bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-1")

def generate_complaint_text(
    category: str,
    severity: str,
    location: str,
) -> str:
    """
    Generate a formal municipal complaint description using Amazon Nova Micro.
    """
    prompt_text = (
        f"Generate a formal municipal complaint for:\n"
        f"Issue Type: {category}\n"
        f"Severity: {severity}\n"
        f"Location: {location}\n\n"
        f"Write a concise, professional complaint description in 3-4 sentences. "
        f"Return text only, no headers or formatting."
    )

    try:
        logger.info("Sending text generation prompt to Amazon Nova Micro...")
        
        response = nova_bedrock_client.converse(
            modelId="amazon.nova-micro-v1:0",
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt_text}]
                }
            ],
            inferenceConfig={
                "temperature": 0.5,
                "maxTokens": 200
            }
        )
        
        completion = response["output"]["message"]["content"][0]["text"].strip()

        if not completion:
            raise ValueError("Empty completion returned from Nova")

        logger.info("Nova complaint text generated successfully")
        return completion

    except Exception as exc:
        logger.error("Nova text invocation failed: %s", str(exc))
        # Graceful fallback — never let the Lambda crash here
        return (
            f"A {severity.lower()}-severity {category} issue has been reported "
            f"at {location}. Immediate attention is requested from the "
            f"concerned municipal department."
        )
