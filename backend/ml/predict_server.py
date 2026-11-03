"""Real-time crop health prediction API for the trained classifier."""

import io
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from pathlib import Path

import joblib
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from torchvision import models, transforms

MODEL_PATH = Path(os.getenv("CROP_MODEL_PATH", "model/crop_health/best.pt"))
FAST_MODEL_PATH = Path(os.getenv("CROP_FAST_MODEL_PATH", "model/crop_health/fast_model.joblib"))
WATER_MODEL_PATH = Path(os.getenv("WATER_MODEL_PATH", "model/crop_health/water_footprint_model.pkl"))
water_model = joblib.load(WATER_MODEL_PATH) if WATER_MODEL_PATH.exists() else None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
fast_model = None
if MODEL_PATH.exists():
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    classes = checkpoint["classes"]
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, len(classes))
    model.load_state_dict(checkpoint["model"])
    model.to(device).eval()
    image_size = checkpoint.get("image_size", 224)
elif FAST_MODEL_PATH.exists():
    fast_model = joblib.load(FAST_MODEL_PATH)
    classes = fast_model["classes"]
    image_size = fast_model["image_size"]
else:
    raise RuntimeError(f"Model not found: {MODEL_PATH} or {FAST_MODEL_PATH}. Train it first.")
preprocess = transforms.Compose([
    transforms.Resize((image_size, image_size)), transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
app = FastAPI(title="SAHAYA AI Crop Detection", version="1.0")


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "classes": classes,
        "device": str(device),
        "water_footprint_model": water_model is not None,
    }


@app.post("/calculate-water-footprint")
async def calculate_water_footprint(payload: dict):
    if water_model is None:
        raise HTTPException(status_code=503, detail="Water footprint model is not installed")
    required = ("cropType", "region", "soilType", "irrigationMethod", "rainfall", "temperature", "humidity", "area")
    missing = [field for field in required if payload.get(field) in (None, "")]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing fields: {', '.join(missing)}")
    try:
        import pandas as pd
        input_data = pd.DataFrame([{
            "CropType": payload["cropType"],
            "Region": payload["region"],
            "SoilType": payload["soilType"],
            "IrrigationMethod": payload["irrigationMethod"],
            "Rainfall": float(payload["rainfall"]),
            "Temperature": float(payload["temperature"]),
            "Humidity": float(payload["humidity"]),
        }])
        predicted_footprint = float(water_model.predict(input_data)[0])
        area = float(payload["area"])
        total_water = max(0.0, predicted_footprint * area / 1000)
        daily_water = total_water / 90
        return {
            "success": True,
            "source": "Kisaan-Saathi water footprint model",
            "totalWater": round(total_water, 3),
            "dailyWater": round(daily_water, 3),
            "weeklyWater": round(daily_water * 7, 3),
        }
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid water footprint input: {exc}") from exc


@app.get("/weather")
def weather(latitude: float, longitude: float):
    params = urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        "timezone": "auto",
    })
    try:
        request = Request(f"https://api.open-meteo.com/v1/forecast?{params}", headers={"Accept": "application/json"})
        with urlopen(request, timeout=8) as upstream:
            payload = __import__("json").loads(upstream.read().decode("utf-8"))
        current = payload.get("current", {})
        return {
            "success": True,
            "source": "Open-Meteo",
            "weather": {
                "condition": f"Weather code {current.get('weather_code', 'unavailable')}",
                "temperature": current.get("temperature_2m"),
                "humidity": current.get("relative_humidity_2m"),
                "wind": current.get("wind_speed_10m"),
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Live weather unavailable: {exc}") from exc


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")
    try:
        image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file") from exc
    if fast_model is not None:
        pixels = np.asarray(image.resize((image_size, image_size)), dtype=np.float32).reshape(1, -1) / 255.0
        probabilities = fast_model["model"].predict_proba(pixels)[0]
        index = int(np.argmax(probabilities))
        confidence = float(probabilities[index])
    else:
        with torch.inference_mode():
            probabilities = torch.softmax(model(preprocess(image).unsqueeze(0).to(device)), dim=1)[0]
        index = int(probabilities.argmax())
        confidence = float(probabilities[index])
    label = classes[index]
    crop, _, condition = label.partition("/")
    return {"success": True, "result": {
        "crop": crop, "condition": condition or crop, "label": label,
        "confidence": confidence,
        "advice": "Consult a local agriculture officer before applying treatment.",
    }}