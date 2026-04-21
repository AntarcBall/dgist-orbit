# DGIST Orbit Campus Grounding TODO

## Goal
Use the provided white DGIST campus map screenshot plus the existing E7 satellite anchor to turn the E1 to E8 academic spine into usable in-game data.

## Tasks
- [x] Extract E1 to E8 relative bounding boxes and centers from the screenshot
- [x] Save an anchor-based layout reference JSON centered on E7
- [x] Estimate first-pass E1 to E8 lat/lon centers from the E7 anchor and screenshot offsets
- [x] Replace the old mixed campus zone set with an E1 to E8 academic-building route
- [x] Update links, flavor text, boss signatures, and satellite feed to match the E-building route
- [x] Update initial game spawn to the new academic route
- [x] Run syntax validation on edited files
- [x] Commit the completed grounding pass

## Notes
- This is a first-pass georeference, not a final surveyed map.
- E7 is the primary anchor. Other buildings are projected by screenshot-relative offsets and should be refined later against visible satellite footprints.
