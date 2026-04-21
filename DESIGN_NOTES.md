# DGIST Orbit Design Notes

## Immediate correction priorities

### 1. Satellite must become a real game system
Current risk:
- The satellite layer feels too close to a themed viewer or scan button skin.
- Scan output is too weakly tied to where the player is and what surrounds that location.

Desired direction:
- Scanning should depend on spatial relationships.
- Player position should change what can be scanned, what is revealed, and what risks propagate.
- Satellite should inform decision-making, not just deliver flavor text.

Good mechanic directions:
- adjacency-based reveal
- per-zone scan range
- local interference / blind spots
- neighboring threat bleed
- campus-sector coverage objectives
- intel quality depending on scan angle / zone stability / nearby research infrastructure
- progressive unlock of deeper scan layers after stabilizing linked zones

Avoid:
- global scan button that produces mostly interchangeable text regardless of location
- satellite as pure aesthetic dressing

### 2. Re-anchor the map to actual DGIST space
Current risk:
- Some points feel like broad technopolis spread instead of DGIST campus space.
- That weakens both immersion and the gameplay value of movement.

Desired direction:
- Coordinates and relative distances should feel like DGIST itself.
- Zones should be clustered and spaced like a walkable campus, not a city-scale map.
- Landmark naming should reflect plausible DGIST places and relationships.

Practical rule:
Before adding more zones or map mechanics, verify that the existing campus center and zone coordinates plausibly represent DGIST rather than nearby surrounding districts.

### 3. Prefer spatial mechanics over more cosmetic polish
If forced to choose, prefer:
- better positional gameplay
- better DGIST geographic fidelity

over:
- extra decorative UI
- more generic lore text
- more button reshuffling without systemic change

## Current UI problems to fix next

### 4. The screen still reads too much like a dashboard
Current risk:
- Even after the first map-heavy rebalance, the page still has too many dark rounded cards and panel boxes.
- The interface reads as `dashboard + map` instead of `map-first tactical game screen`.

Desired direction:
- Reduce always-visible panel count.
- Let the map dominate the first impression.
- Treat stats, quests, intel, inventory, and dossier as secondary drawers or lighter support modules.

Practical rule:
When a new block is added, ask whether it truly deserves permanent screen space or should collapse into a lighter layer.

### 5. The map overlay is still too bulky
Current risk:
- The left focus overlay on the map is doing useful work, but it is visually too thick and boxy.
- Nested metric cards inside the focus panel make it feel like a pasted dashboard card rather than a sleek targeting HUD.

Desired direction:
- Keep the tactical clarity.
- Make the overlay slimmer, faster to scan, and more like a targeting or orbit console.
- Prefer fewer sub-boxes, more direct hierarchy, and more visual breathing room.

Practical rule:
The overlay should feel like a high-value HUD element, not a mini admin panel sitting on top of the map.

### 6. The top hero/header block is still visually heavy
Current risk:
- The title area still takes meaningful vertical space without adding enough game feel.
- The right-side stat pills feel detached from the fantasy and read like generic product metrics.

Desired direction:
- Compress the header further.
- Make it feel more like a slim tactical status bar than a landing-page hero.
- Move fantasy and atmosphere into the map, orbit elements, and action layer instead of a large top text area.

Practical rule:
The top of the page should answer `where am I, what is my status, what is the current mission` in one quick glance.

### 7. The satellite/orbit fantasy is still under-realized
Current risk:
- The game has map mechanics and orbit references, but the actual visual fantasy of controlling a satellite network is still weaker than it should be.
- The player can understand the systems without emotionally feeling `I am operating a campus-orbit layer`.

Desired direction:
- Push orbit rings, scan radius, link lines, pulses, control zones, and sector pressure harder into the map presentation.
- Make scan, stabilize, and redeploy feel like spatial actions, not just button presses that happen to affect a map.

Practical rule:
When redesigning, prioritize changes that make the player feel the satellite layer directly through the map itself.
