"""Occlusion / tamper detection using Canny edge detection."""
import cv2
import numpy as np
from typing import List, Dict, Any, Optional

def _overlap_ratio(box_a, box_b) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1: return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    union = max(1, (ax2-ax1)*(ay2-ay1)) + max(1, (bx2-bx1)*(by2-by1)) - inter
    return inter / union if union > 0 else 0.0

def detect_sticker_regions(image_bytes: bytes) -> List[List[int]]:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: return []

        img_h, img_w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Canny edge detection
        edges = cv2.Canny(blurred, 50, 150)
        kernel = np.ones((5, 5), np.uint8)
        dilated = cv2.dilate(edges, kernel, iterations=2)
        
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        regions = []
        min_area = (img_w * img_h) * 0.005 # 0.5% of image
        max_area = (img_w * img_h) * 0.25  # 25% of image

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if not (min_area < area < max_area): continue
            
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
            if len(approx) != 4: continue # Only rectangles
            
            x, y, w, h = cv2.boundingRect(cnt)
            rect_area = w * h
            if rect_area == 0: continue
            
            if (area / rect_area) < 0.75: continue # Must be solid
            regions.append([int(x), int(y), int(x + w), int(y + h)])
            
        return regions
    except Exception as e:
        print(f"[Occlusion] Error: {e}")
        return []

def find_occlusions(image_bytes: bytes, declaration_bboxes: Dict[str, Optional[List[int]]]) -> List[Dict[str, Any]]:
    regions = detect_sticker_regions(image_bytes)
    findings = []
    for field, bbox in declaration_bboxes.items():
        if not bbox or len(bbox) != 4: continue
        for region in regions:
            iou = _overlap_ratio(bbox, region)
            if iou >= 0.15: # 15% overlap threshold
                findings.append({"region": region, "field": field, "iou": round(iou, 3)})
    return findings