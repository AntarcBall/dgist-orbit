# DGIST Orbit Work Queue

## queued
- Wire the aligned DGIST building segments into live `ZONES` / `ZONE_LINKS` after overlay review.
- Draw scan-shadow corridor wedges directly on the map so blocked downstream sectors read as directional campus blind spots, not just badge state.

## in_progress
- none

## done
- 2026-04-20: Added scan shadow sectors behind unstable first-hop DGIST corridors, so downstream buildings now flip into `음영` coverage state, drop out of the real scan target pool, and explain which hot neighbor is occluding the sweep.
- 2026-04-20: Added sector-origin threat spill previews to the map, focus HUD, stability cards, and popups, so hot DGIST sectors now show which neighboring corridors they are actively pressuring instead of only glowing as isolated danger nodes.
- 2026-04-20: Surfaced live scan interference sources on the map and local scan HUD, so nearby hot sectors now project orange noise vectors and `스캔 노이즈 +N` beacons into the current origin instead of leaving local interference as an abstract number.
- 2026-04-20: Added live scan coverage badges directly onto covered campus sectors, so adjacent or targeted scanable zones now advertise `1링`, `정조준`, or blocked relay state right on the map and can be tapped without hunting through the HUD.
- 2026-04-20: Stability cards now have a `프론티어 보기` action that focuses the matching sector, opens its popup, and projects the same redeploy frontier overlay onto the map, so mobile route comparison no longer depends on the focus radar alone.
- 2026-04-20: Projected redeploy frontier previews directly onto the campus map with gain/loss traces and small scan badges, so the satellite layer now shows where a move opens new coverage before the player commits.
- 2026-04-20: Added redeploy scan-frontier previews to the focus HUD, stability cards, and zone popups so moving between DGIST sectors now shows which areas become newly scannable and which current lines drop away before committing.
- 2026-04-20: Formalized the real-campus alignment milestone, added a DGIST satellite rotation + segmentation + reference-label pipeline spec, seeded major building labels from the white reference map, and added a runnable `scripts/campus_align.py` scaffold that exports rotation/segment review artifacts.
- 2026-04-20: Long-range targeted scans now hard-stop at unstable first-hop relay sectors, with blocked corridor warnings in the scan legend, focus HUD, map traces, and zone popups so remote intel depends on actually holding a usable local relay.
- 2026-04-20: Targeted scan traces now paint the actual slip corridor on the map with a red hazard segment, an in-world relay-loss beacon on the intercept zone, and a faded continuation line toward the original DGIST target.
- 2026-04-20: Targeted remote scans can now slip onto the first unstable relay sector, and both the scan legend plus focus HUD warn when a shaky corridor will catch packets before the intended DGIST destination.
- 2026-04-20: Remote scan relay integrity now depends on the actual corridor states along the chosen campus route, and the scan CTA plus focus HUD both expose whether that link is 선명, 유지, 흔들림, or 불안정.
- 2026-04-20: Replaced the focus HUD's plain connected-sector chips with a radar-anchored sector selector, so retargeting scans and following local campus links now happens from an orbit cluster instead of a flat text row.
- 2026-04-20: Added a compact satellite target legend beside the scan CTA so local versus focused remote scans now show target, coverage, reliability, and route pressure before tapping.
- 2026-04-20: Added compact slot and stat delta chips to gear cards in the inventory dock, so mobile equip decisions now show what each item would replace and which stats go up or down before tapping.
- 2026-04-20: Added a loadout HUD inside the dock with four slot cards and quick derived-stat chips, so equipped gear reads at a glance before opening individual inventory items.
- 2026-04-20: Folded quest tracking and inventory into one tabbed field dock so the sidebar carries one less standing card and mobile play swaps between objectives and gear in-place.
- 2026-04-20: Focused zones inside current coverage now project a directional scan cone and become the actual scan target, so remote intel follows the player’s selected campus trace instead of rotating through abstract remote picks.
- 2026-04-20: Current position now projects visible scan radius rings and campus coverage links on the map, so scan reach and secured neighboring sectors read directly on the playfield instead of hiding in text.
- 2026-04-20: Route links now render as secured, contested, or unstable campus corridors and controlled sectors gain a stronger node ring, so map safety reads directly on the playfield instead of only in sidebar cards.
- 2026-04-20: Merged the always-visible intel and dossier cards into a single tabbed operations console so the sidebar drops one standing panel and the map keeps more visual authority.
- 2026-04-20: Slimmed the map focus overlay into a tighter tactical HUD with compact signal, control, and route rows so the map keeps the visual lead.
- 2026-04-20: Compressed the top header into a tactical status bar so the page opens with a slimmer operations strip instead of a landing-page hero block.
- 2026-04-20: Remote scan detections now surface route pressure, hotspot count, and redeploy guidance inside both the focus card and scan log so distant intel suggests an actual response path.
- 2026-04-20: Added a campus-sector control layer so stabilizing one zone now strengthens neighboring sectors, controlled anchors reduce scan interference and surge risk, and the focus/stability UI now exposes local control strength.
- 2026-04-19: Re-anchored zone coordinates, naming, and adjacency around a DGIST-like campus spine, then made travel cost depend on route hops instead of generic per-zone cost.
- 2026-04-19: Orbit-style combat action cluster replaced the flat text-button stack, making the encounter panel read more like a tactical console.
- 2026-04-19: Added a map-anchored focus overlay so the selected/current zone has a stronger visual frame and direct travel call-to-action.
- 2026-04-19: Turned satellite scanning into a positional system with adjacency, scan range, interference, and neighboring-sector intel instead of a location-agnostic feed.
- 2026-04-19: Replaced generic scan results with zone-relationship-aware intel lines and surfaced connected sectors directly inside the map focus card.
- 2026-04-19: Surfaced the shortest redeploy route inside the focus card as a route strip, so long campus moves read like a planned path instead of abstract hop text.

## blocked
- Need better DGIST-grounded zone placement and campus relationship design before adding many more map features.

## later ideas
- GPS-aware walk mode once the campus topology and scan rules are coherent.
- Satellite imagery/provider integration after the spatial rules are worth visualizing.
- Faction-specific map overlays and research-lab signal behavior.
