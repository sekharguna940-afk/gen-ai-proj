"""Train a lightweight CPU-friendly crop classifier from dataset folders."""

import argparse
from pathlib import Path

import joblib
import numpy as np
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split


def collect_images(root):
    extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    records = []
    for path in Path(root).rglob("*"):
        if not path.is_file() or path.suffix.lower() not in extensions:
            continue
        parts = path.relative_to(root).parts
        if len(parts) >= 3 and parts[1].lower() in {"disease", "insect-pests"}:
            label = f"{parts[0]}/{parts[2]}"
        elif len(parts) >= 2:
            label = f"{parts[0]}/{parts[1]}"
        else:
            continue
        records.append((path, label))
    return records


def image_features(path, image_size):
    with Image.open(path) as image:
        pixels = np.asarray(image.convert("RGB").resize((image_size, image_size)), dtype=np.float32)
    return (pixels / 255.0).reshape(-1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, default=Path("model/crop_health/fast_model.joblib"))
    parser.add_argument("--image-size", type=int, default=32)
    args = parser.parse_args()
    records = collect_images(args.dataset)
    classes = sorted({label for _, label in records})
    class_to_index = {label: index for index, label in enumerate(classes)}
    features = np.asarray([image_features(path, args.image_size) for path, _ in records], dtype=np.float32)
    labels = np.asarray([class_to_index[label] for _, label in records])
    train_x, test_x, train_y, test_y = train_test_split(features, labels, test_size=0.2, random_state=42, stratify=labels)
    classifier = LogisticRegression(max_iter=250, C=4, solver="lbfgs", multi_class="auto")
    classifier.fit(train_x, train_y)
    accuracy = accuracy_score(test_y, classifier.predict(test_x))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": classifier, "classes": classes, "image_size": args.image_size}, args.output)
    print(f"saved={args.output} images={len(records)} classes={len(classes)} validation_accuracy={accuracy:.4f}")


if __name__ == "__main__":
    main()