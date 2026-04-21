#!/usr/bin/env python3
"""Estimate DGIST campus satellite rotation, segment building-like rectangles, and export review artifacts.

Usage:
  python3 scripts/campus_align.py \
    --satellite assets/campus-source/dgist_satellite.png \
    --reference assets/campus-source/dgist_reference_white_map.png
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np


@dataclass
class Segment:
    id: str
    bbox: list[int]
    center: list[float]
    area: float
    aspectRatio: float
    angle: float
    rectangularity: float


def read_image(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"Could not read image: {path}")
    return image


def rotate_image(image: np.ndarray, angle_deg: float) -> np.ndarray:
    h, w = image.shape[:2]
    center = (w / 2, h / 2)
    matrix = cv2.getRotationMatrix2D(center, angle_deg, 1.0)
    return cv2.warpAffine(
        image,
        matrix,
        (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT,
    )


def detect_lines(gray: np.ndarray) -> np.ndarray | None:
    edges = cv2.Canny(gray, 80, 180, apertureSize=3)
    return cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=55,
        minLineLength=max(24, min(gray.shape[:2]) // 10),
        maxLineGap=8,
    )


def orthogonal_axis_score(lines: np.ndarray | None) -> tuple[float, int]:
    if lines is None:
        return 0.0, 0

    score = 0.0
    count = 0
    for entry in lines[:, 0, :]:
        x1, y1, x2, y2 = map(float, entry)
        dx = x2 - x1
        dy = y2 - y1
        length = math.hypot(dx, dy)
        if length < 12:
            continue
        angle = abs(math.degrees(math.atan2(dy, dx))) % 180
        dist_to_axis = min(
            abs(angle - 0),
            abs(angle - 90),
            abs(angle - 180),
        )
        line_score = max(0.0, 1.0 - (dist_to_axis / 16.0)) * length
        score += line_score
        count += 1
    return score, count


def estimate_rotation(image: np.ndarray, min_angle: float, max_angle: float, step: float) -> tuple[float, list[dict]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    history: list[dict] = []
    best_angle = 0.0
    best_score = -1.0
    best_count = 0

    for angle in np.arange(min_angle, max_angle + 1e-9, step):
        rotated = rotate_image(gray, angle)
        lines = detect_lines(rotated)
        score, count = orthogonal_axis_score(lines)
        history.append({"angle": round(float(angle), 3), "score": round(float(score), 3), "lineCount": count})
        if score > best_score or (abs(score - best_score) < 1e-6 and count > best_count):
            best_angle = float(angle)
            best_score = float(score)
            best_count = count

    return best_angle, history


def segment_rectangles(image: np.ndarray, min_area_ratio: float = 0.00045) -> list[Segment]:
    h, w = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    bright = cv2.inRange(gray, 155, 255)
    low_sat = cv2.inRange(hsv[:, :, 1], 0, 85)
    mask = cv2.bitwise_and(bright, low_sat)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.dilate(mask, kernel, iterations=1)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = h * w * min_area_ratio
    segments: list[Segment] = []

    idx = 1
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.03 * perimeter, True)
        x, y, bw, bh = cv2.boundingRect(contour)
        rect = cv2.minAreaRect(contour)
        (cx, cy), (rw, rh), angle = rect
        rect_area = max(rw * rh, 1.0)
        rectangularity = float(area / rect_area)
        aspect = float(max(bw, bh) / max(1, min(bw, bh)))

        if len(approx) > 8:
            continue
        if rectangularity < 0.42:
            continue
        if bw < 18 or bh < 18:
            continue

        segments.append(
            Segment(
                id=f"seg-{idx:03d}",
                bbox=[int(x), int(y), int(bw), int(bh)],
                center=[round(float(cx), 2), round(float(cy), 2)],
                area=round(float(area), 2),
                aspectRatio=round(aspect, 3),
                angle=round(float(angle), 3),
                rectangularity=round(rectangularity, 3),
            )
        )
        idx += 1

    segments.sort(key=lambda seg: (seg.center[1], seg.center[0]))
    return segments


def load_seed_labels(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def nearest_label_for_segment(segment: Segment, labels: Iterable[dict], image_w: int, image_h: int) -> tuple[dict | None, float]:
    seg_x = segment.center[0] / image_w
    seg_y = segment.center[1] / image_h
    best = None
    best_dist = 1e9
    for label in labels:
        lx, ly = label["referenceCenterNorm"]
        dist = math.hypot(seg_x - lx, seg_y - ly)
        if dist < best_dist:
            best = label
            best_dist = dist
    return best, float(best_dist)


def save_overlay(image: np.ndarray, segments: list[Segment], out_path: Path, labels: list[dict] | None = None) -> None:
    overlay = image.copy()
    labels = labels or []
    by_id = {label["id"]: label for label in labels}

    for segment in segments:
        x, y, w, h = segment.bbox
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 220, 255), 2)
        caption = segment.id
        mapped = getattr(segment, "mappedLabelId", None)
        if mapped and mapped in by_id:
            caption = by_id[mapped]["shortLabel"]
        cv2.putText(overlay, caption, (x, max(16, y - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 1, cv2.LINE_AA)

    cv2.imwrite(str(out_path), overlay)


def save_reference_overlay(reference: np.ndarray, labels: list[dict], out_path: Path) -> None:
    overlay = reference.copy()
    h, w = overlay.shape[:2]
    for label in labels:
        x = int(label["referenceCenterNorm"][0] * w)
        y = int(label["referenceCenterNorm"][1] * h)
        cv2.circle(overlay, (x, y), 8, (40, 120, 255), 2)
        cv2.putText(overlay, label["shortLabel"], (x + 10, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (40, 120, 255), 2, cv2.LINE_AA)
    cv2.imwrite(str(out_path), overlay)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--satellite", required=True, type=Path)
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--labels", type=Path, default=Path("data/campus_reference_labels.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("assets/campus-processed"))
    parser.add_argument("--min-angle", type=float, default=-15.0)
    parser.add_argument("--max-angle", type=float, default=15.0)
    parser.add_argument("--step", type=float, default=0.25)
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    satellite = read_image(args.satellite)
    reference = read_image(args.reference)
    seed = load_seed_labels(args.labels)
    labels = seed["labels"]

    best_angle, search_history = estimate_rotation(satellite, args.min_angle, args.max_angle, args.step)
    rotated = rotate_image(satellite, best_angle)
    segments = segment_rectangles(rotated)

    export_segments = []
    for segment in segments:
        label, norm_dist = nearest_label_for_segment(segment, labels, rotated.shape[1], rotated.shape[0])
        payload = asdict(segment)
        if label is not None:
            payload["suggestedLabelId"] = label["id"]
            payload["suggestedShortLabel"] = label["shortLabel"]
            payload["matchDistance"] = round(norm_dist, 4)
            payload["matchConfidence"] = round(max(0.0, 1.0 - norm_dist * 2.5), 3)
        export_segments.append(payload)

    rotated_path = args.out_dir / "dgist_satellite_rotated.png"
    overlay_path = args.out_dir / "dgist_satellite_overlay.png"
    reference_overlay_path = args.out_dir / "dgist_reference_overlay.png"
    segments_path = args.out_dir / "dgist_building_segments.json"
    report_path = args.out_dir / "dgist_alignment_report.json"

    cv2.imwrite(str(rotated_path), rotated)
    save_overlay(rotated, segments, overlay_path, labels)
    save_reference_overlay(reference, labels, reference_overlay_path)

    segments_path.write_text(json.dumps({"segments": export_segments}, ensure_ascii=False, indent=2), encoding="utf-8")
    report = {
        "rotation": {
            "estimatedAngleDeg": round(best_angle, 3),
            "searchWindowDeg": [args.min_angle, args.max_angle],
            "searchStepDeg": args.step,
        },
        "inputs": {
            "satellite": str(args.satellite),
            "reference": str(args.reference),
            "labels": str(args.labels),
        },
        "outputs": {
            "rotated": str(rotated_path),
            "satelliteOverlay": str(overlay_path),
            "referenceOverlay": str(reference_overlay_path),
            "segments": str(segments_path),
        },
        "counts": {
            "segments": len(export_segments),
            "seedLabels": len(labels),
        },
        "notes": [
            "Rotation is estimated from line orthogonality, not semantic understanding.",
            "Seed label positions are approximate and require overlay review.",
            "Suggested segment-to-label matches are nearest-anchor guesses, not final truth.",
        ],
        "searchHistory": search_history,
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "estimatedAngleDeg": round(best_angle, 3),
        "segments": len(export_segments),
        "outDir": str(args.out_dir),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
