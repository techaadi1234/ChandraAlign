# ChandraAlign

Sub-Pixel Multi-Modal Lunar Image Registration & Change-Detection Engine for Chandrayaan-2 OHRC & LROC NAC imagery.

## Overview
ChandraAlign provides sub-pixel co-registration, optical flow vector fields, tie-point QA matrices, and change detection overlays for high-resolution lunar surface imaging missions.

## Features
- **Curtain Split Slider**: Real-time comparison with dynamic swipe orientation.
- **Dynamic Checkerboard Mode**: Interactive mosaic blend with adjustable tile counts and temporal pulse.
- **Deformation & Flow Vector Grid**: Optical flow displacement visualization with vector magnitude controls.
- **Difference Heatmap**: Sub-pixel change detection & alignment error identification.
- **Telemetry & Tie-Point Matrix**: Real-time pixel RMSE, SSIM, Pearson Correlation, and sub-pixel tie-point validation.

## Getting Started

### Run Server
```bash
python3 server.py
```
Then navigate to `http://localhost:8000` in your web browser.
