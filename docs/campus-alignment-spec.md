# DGIST Orbit Campus Alignment and Labeling Spec

## Goal
Realign the in-game campus logic against the actual DGIST campus footprint instead of relying on loosely placed marker points.

This workstream converts the satellite view into a usable structural layer:

1. estimate a small rotation offset for the satellite image, constrained to `0°..15°`
2. rotate the satellite image so the campus axes are visually upright
3. segment rectangular building-like objects from the corrected image
4. use the provided white reference map to assign human labels to those rectangles
5. export a stable machine-readable artifact that later game data can consume

## Why this matters
Recent DGIST Orbit updates made the satellite system more spatial, but the map is still only partially grounded in the real campus. The next step is to make the campus structure itself authoritative.

That means the satellite layer should stop being just background imagery and become a geometry source for:
- zone placement
- route topology
- scan corridors
- relay choke points
- building-centered labeling and mission hooks

## Inputs
Expected source files:
- `assets/campus-source/dgist_satellite.png`
- `assets/campus-source/dgist_reference_white_map.png`

## Outputs
Generated artifacts:
- `assets/campus-processed/dgist_satellite_rotated.png`
- `assets/campus-processed/dgist_satellite_overlay.png`
- `assets/campus-processed/dgist_reference_overlay.png`
- `assets/campus-processed/dgist_building_segments.json`
- `assets/campus-processed/dgist_alignment_report.json`

## Pipeline

### Step 1. Rotation estimation
Constraint:
- search only in a small correction window, default `-15°..15°`

Heuristic:
- detect long straight edges from the satellite image
- score candidate rotations by how strongly the dominant lines collapse toward orthogonal axes
- prefer rotations that make the campus road/building grid look near-vertical / near-horizontal

Implementation note:
- Hough line detection is enough for the first pass
- this is a geometry problem, not a semantic one
- a vision model can be added later for validation, but the baseline should work from CV alone

### Step 2. Segmentation
Segment likely building objects from the corrected satellite image.

First-pass target objects:
- bright roof masses
- long rectangular academic buildings
- research blocks
- gym / field-adjacent building slabs
- parking decks only if they strongly resemble a building block

First-pass exclusions:
- roads
- ponds
- open lawns
- tree cover
- tiny cars or noisy specks

Method:
- grayscale / color preprocessing
- thresholding
- morphological cleanup
- contour extraction
- polygon approximation
- keep rectangular or near-rectangular candidates above minimum area

### Step 3. Reference-map anchoring
Use the white campus map as the semantic anchor.

The white map provides recognizable labels such as:
- E1, E2, E4, E5, E6, E7, E8
- R4, R5, R6, R7
- E15
- S1
- H501
- iM뱅크
- 상동지

The first pass does not need perfect automatic correspondence.
It only needs a stable seed mapping with:
- label name
- type
- approximate reference-map center
- optional alias list
- confidence and notes

### Step 4. Label transfer
For each segmented rectangle, assign:
- `labelId`
- `displayName`
- `kind`
- `confidence`
- `matchingNotes`

Matching uses:
- relative position inside the campus footprint
- rectangle size/aspect ratio
- adjacency to other major blocks
- proximity to ponds / roads / special landmarks from the reference map

### Step 5. Export for gameplay
The processed building geometry should later become the source of truth for:
- zone centroids
- corridor links
- scan relay lines
- control sectors
- future GPS-aware subzones

## Manual review rule
No building labels should be treated as final until the overlay images are visually reviewed.

Required review checks:
- does the chosen rotation make the main campus spine look upright?
- do segmented rectangles cover real major building roofs instead of roads?
- do labels line up with the correct building masses from the white map?

## Initial label scope
This first pass focuses on major, stable, rectangular anchors:
- 에너지시스템공학관 E6동
- 로봇및기계전자공학관 E5동
- 뇌과학관 E4동
- 컨실리언스홀 E7동
- 화학물리학관 E2동
- 대학본부 E1동
- 학술정보관 E8동
- 차세대반도체융합연구소 R6동
- 차세대융복합연구센터 R5동
- 로봇시스템IT융합연구동 R4동
- 아워홈식당 E15동
- 산학협력관 R7동
- 종합체육관 S1동
- 국제관 H501동

## Explicit execution contract
When continuing this work:
1. place the exact user-provided satellite and white-map images into `assets/campus-source/`
2. run `python3 scripts/campus_align.py --satellite ... --reference ...`
3. inspect generated overlays
4. adjust seed labels if any anchor lands on the wrong rectangle
5. only then wire the resulting geometry into live game zones

## Status
- Spec written
- Pipeline scaffold to be implemented now
- Label seed file to be created now
