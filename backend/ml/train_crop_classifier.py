"""Train a crop health classifier from the Rice_and_Maize_Dataset folders."""

import argparse
import json
import random
from pathlib import Path

import torch
from torch import nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset, Subset
from torchvision import models, transforms


class CropDataset(Dataset):
    def __init__(self, root, transform, classes=None):
        self.root = Path(root)
        self.transform = transform
        image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        records = []
        for path in self.root.rglob("*"):
            if path.is_file() and path.suffix.lower() in image_extensions:
                relative = path.relative_to(self.root)
                parts = relative.parts
                if len(parts) >= 3 and parts[1].lower() in {"disease", "insect-pests"}:
                    label = f"{parts[0]}/{parts[2]}"
                elif len(parts) >= 2:
                    label = f"{parts[0]}/{parts[1]}"
                else:
                    continue
                records.append((path, label))
        self.classes = classes or sorted({label for _, label in records})
        self.class_to_idx = {label: index for index, label in enumerate(self.classes)}
        self.samples = [(path, self.class_to_idx[label]) for path, label in records]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        path, label = self.samples[index]
        with Image.open(path) as image:
            image = image.convert("RGB")
        return self.transform(image), label


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path, help="Extracted dataset directory")
    parser.add_argument("--output", type=Path, default=Path("model/crop_health"))
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main():
    args = parse_args()
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    image_size = args.image_size
    normalize = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    train_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(), normalize,
    ])
    eval_transform = transforms.Compose([transforms.Resize((image_size, image_size)), transforms.ToTensor(), normalize])

    train_dataset = CropDataset(args.dataset, train_transform)
    eval_dataset = CropDataset(args.dataset, eval_transform, train_dataset.classes)
    indices = list(range(len(train_dataset)))
    random.Random(args.seed).shuffle(indices)
    val_size = max(1, int(len(indices) * args.val_split))
    train_indices, val_indices = indices[val_size:], indices[:val_size]
    train_set = Subset(train_dataset, train_indices)
    val_set = Subset(eval_dataset, val_indices)
    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True, num_workers=0, pin_memory=torch.cuda.is_available())
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False, num_workers=0, pin_memory=torch.cuda.is_available())

    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    for parameter in model.parameters():
        parameter.requires_grad = False
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(train_dataset.classes))
    model.to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-4, weight_decay=1e-4)
    best_accuracy = 0.0
    args.output.mkdir(parents=True, exist_ok=True)

    for epoch in range(args.epochs):
        model.train()
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                predictions = model(images.to(device)).argmax(dim=1).cpu()
                correct += int((predictions == labels).sum())
                total += labels.numel()
        accuracy = correct / total if total else 0.0
        print(f"epoch={epoch + 1}/{args.epochs} validation_accuracy={accuracy:.4f}")
        if accuracy >= best_accuracy:
            best_accuracy = accuracy
            torch.save({"model": model.state_dict(), "classes": train_dataset.classes, "image_size": image_size}, args.output / "best.pt")
    (args.output / "classes.json").write_text(json.dumps(train_dataset.classes, indent=2), encoding="utf-8")
    print(f"saved={args.output / 'best.pt'} images={len(train_dataset)} classes={len(train_dataset.classes)} device={device}")


if __name__ == "__main__":
    main()