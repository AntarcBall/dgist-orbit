import {
  BOSS_SIGNATURES,
  CAMPUS_CENTER,
  ENEMIES,
  FACTIONS,
  ITEMS,
  LOOT_TABLE,
  LORE_SNIPPETS,
  PLAYER_ARCHETYPES,
  QUEST_POOL,
  RANKS,
  SATELLITE_FEED,
  ZONES,
  ZONE_LINKS,
} from './data.js';

const SAVE_KEY = 'dgist-orbit-save-v3';
const INITIAL_STATE = {
  level: 1,
  xp: 0,
  xpGoal: 80,
  hp: 100,
  baseMaxHp: 100,
  energy: 6,
  maxEnergy: 6,
  credits: 25,
  relics: 0,
  scans: 0,
  travelCount: 0,
  bossWins: 0,
  visited: ['e1'],
  currentZoneId: 'e1',
  archetypeId: 'ai',
  factionId: 'library-keepers',
  questProgress: {
    scanCount: 0,
    travelCount: 0,
    bossWins: 0,
    credits: 25,
    equippedCount: 1,
    relics: 0,
  },
  quests: ['scan-3', 'travel-4', 'equip-2'],
  inventory: {
    'signal-emitter': 1,
    'focus-band': 1,
    'battery-pack': 1,
    'field-ration': 1,
  },
  equipment: {
    tool: 'signal-emitter',
    accessory: null,
    arm: null,
    body: null,
  },
  logs: [
    {
      tag: '시작',
      text: 'E1 대학본부에서 첫 수신을 잡았다. 이제 E7을 앵커로 E1부터 E8까지 학술축 전체를 따라 신호 파편을 모아야 한다.',
    },
  ],
  intel: [
    'DGIST Orbit 프로토타입 부팅 완료. 실제 GPS와 위성 API 없이도 캠퍼스 탐사 루프가 작동한다.',
  ],
  activeEncounter: null,
  battle: null,
  zoneStates: {},
};

const heroStats = document.getElementById('hero-stats');
const statusGrid = document.getElementById('status-grid');
const rankText = document.getElementById('rank-text');
const xpBar = document.getElementById('xp-bar');
const encounterCard = document.getElementById('encounter-card');
const zoneFocus = document.getElementById('zone-focus');
const stabilityOverview = document.getElementById('stability-overview');
const questList = document.getElementById('quest-list');
const intelFeed = document.getElementById('intel-feed');
const inventoryList = document.getElementById('inventory-list');
const loadoutSummary = document.getElementById('loadout-summary');
const loadoutText = document.getElementById('loadout-text');
const dossierCard = document.getElementById('dossier-card');
const logisticsTabs = document.getElementById('logistics-tabs');
const questPanel = document.getElementById('quest-panel');
const inventoryPanel = document.getElementById('inventory-panel');
const opsTabs = document.getElementById('ops-tabs');
const intelPanel = document.getElementById('intel-panel');
const dossierPanel = document.getElementById('dossier-panel');
const actionButtons = document.getElementById('action-buttons');
const scanButton = document.getElementById('scan-button');
const scanTargetLegend = document.getElementById('scan-target-legend');
const restButton = document.getElementById('rest-button');
const rerollQuestButton = document.getElementById('reroll-quest');
const resetSaveButton = document.getElementById('reset-save');
const questTemplate = document.getElementById('quest-item-template');
const installButton = document.getElementById('install-button');
const installStatus = document.getElementById('install-status');

const state = loadState();
let deferredInstallPrompt = null;
const zoneById = Object.fromEntries(ZONES.map((zone) => [zone.id, zone]));
let focusedZoneId = state.currentZoneId;
let activeLogisticsTab = 'quests';
let activeOpsTab = 'intel';
const itemById = ITEMS;

normalizeState();

const map = L.map('map', {
  zoomControl: false,
  minZoom: 16,
  maxZoom: 16,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  boxZoom: false,
  keyboard: false,
  attributionControl: true,
}).setView(CAMPUS_CENTER, 16);

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
});

satelliteLayer.addTo(map);

const playerIcon = L.divIcon({
  className: 'player-marker',
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#61d5ff;border:3px solid rgba(255,255,255,.85);box-shadow:0 0 24px rgba(97,213,255,.75)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const playerMarker = L.marker(zoneById[state.currentZoneId].coords, { icon: playerIcon }).addTo(map);
const zoneMarkers = [];
const routeLines = [];
const scanRadiusLayers = [];
const scanLinkLayers = [];
const scanTraceLayers = [];
const scanSlipLayers = [];
const redeployPreviewLayers = [];
const coverageBadgeLayers = [];
const threatOverlayLayers = [];
const zoneGraph = buildZoneGraph();

renderRouteLines();
renderSpatialOverlay();

for (const zone of ZONES) {
  const marker = L.circleMarker(zone.coords, {
    radius: zone.boss ? 10 : 8,
    weight: 2,
    color: zone.boss ? '#ff7c7c' : '#9dff8f',
    fillColor: zone.boss ? '#ff7c7c' : '#9dff8f',
    fillOpacity: state.visited.includes(zone.id) ? 0.85 : 0.45,
  })
    .addTo(map)
    .bindPopup(renderZonePopup(zone), {
      className: 'zone-popup',
    });

  marker.on('click', () => {
    focusZone(zone.id, { openPopup: true, source: 'marker' });
  });
  zoneMarkers.push({ zoneId: zone.id, marker });
}

scanButton.addEventListener('click', satelliteScan);
restButton.addEventListener('click', restAtCurrentZone);
rerollQuestButton.addEventListener('click', rerollQuest);
resetSaveButton.addEventListener('click', () => {
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
});
actionButtons.addEventListener('click', onActionClick);
inventoryList.addEventListener('click', onInventoryClick);
stabilityOverview.addEventListener('click', onStabilityOverviewClick);
zoneFocus.addEventListener('click', onZoneFocusClick);
logisticsTabs.addEventListener('click', onLogisticsTabClick);
opsTabs.addEventListener('click', onOpsTabClick);
installButton.addEventListener('click', installApp);

setupPwaShell();
render();
spawnEncounter(zoneById[state.currentZoneId]);
render();

function loadState() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return structuredClone(INITIAL_STATE);
    return { ...structuredClone(INITIAL_STATE), ...JSON.parse(saved) };
  } catch {
    return structuredClone(INITIAL_STATE);
  }
}

function normalizeState() {
  state.inventory = { ...INITIAL_STATE.inventory, ...(state.inventory || {}) };
  state.equipment = { ...INITIAL_STATE.equipment, ...(state.equipment || {}) };
  state.questProgress = { ...INITIAL_STATE.questProgress, ...(state.questProgress || {}) };
  if (!state.archetypeId) state.archetypeId = INITIAL_STATE.archetypeId;
  if (!state.factionId) state.factionId = INITIAL_STATE.factionId;
  state.zoneStates = normalizeZoneStates(state.zoneStates);
  state.questProgress.credits = state.credits;
  state.questProgress.relics = state.relics;
  state.questProgress.equippedCount = getEquippedCount();
  const maxHp = getMaxHp();
  state.hp = Math.min(maxHp, state.hp || maxHp);
}

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function render() {
  renderHero();
  renderStatus();
  renderFocusedSelection();
  renderStabilityOverview();
  renderEncounter();
  renderQuests();
  renderIntel();
  renderInventory();
  renderDossier();
  renderLogisticsTabs();
  renderOpsTabs();
  syncMarkers();
  document.body.classList.toggle('alert-state', Boolean(state.activeEncounter));
  document.body.classList.toggle('battle-state', Boolean(state.battle));
  persist();
}

function renderFocusedSelection() {
  renderScanButtonState();
  renderZoneFocus();
  highlightRouteLines();
  renderSpatialOverlay();
}

function renderHero() {
  const zone = zoneById[state.currentZoneId];
  const faction = FACTIONS.find((item) => item.id === state.factionId);
  const zoneState = state.zoneStates[state.currentZoneId];
  const top = [
    ['현재 구역', zone.name],
    ['소속', faction?.name || '-'],
    ['안정도', `${zoneState?.stability ?? 0}%`],
  ];
  heroStats.innerHTML = top
    .map(([label, value]) => `<div class="hero-pill"><span>${label}</span><strong>${value}</strong></div>`)
    .join('');
}

function renderStatus() {
  const stats = [
    ['레벨', `${state.level}`],
    ['HP', `${state.hp} / ${getMaxHp()}`],
    ['에너지', `${state.energy} / ${state.maxEnergy}`],
    ['크레딧', `${state.credits}`],
    ['스캔 수', `${state.scans}`],
    ['탐사 구역', `${state.visited.length}`],
    ['모멘텀', `${state.battle?.momentum ?? 0}`],
  ];
  statusGrid.innerHTML = stats
    .map(([label, value]) => `<div class="stat-tile"><span>${label}</span><strong>${value}</strong></div>`)
    .join('');
  xpBar.style.width = `${Math.min(100, (state.xp / state.xpGoal) * 100)}%`;
  rankText.textContent = `${RANKS[Math.min(RANKS.length - 1, state.level - 1)]} · 다음 레벨까지 ${Math.max(0, state.xpGoal - state.xp)} XP`;
}

function renderScanButtonState() {
  scanButton.textContent = '주변 스캔';
  renderScanTargetLegend();
}

function renderScanTargetLegend() {
  if (!scanTargetLegend) return;
  const currentZone = zoneById[state.currentZoneId];
  const coverage = getScanCoverage(state.currentZoneId);
  const interferenceSources = getScanInterferenceSources(state.currentZoneId);
  const reliabilityScore = Math.max(62, 96 - coverage.interference * 9);
  const blindSpotChip = coverage.blindSpots.length
    ? `<span class="scan-target-chip danger">음영 ${coverage.blindSpots.length}</span>`
    : '';
  const noiseChip = interferenceSources.length
    ? `<span class="scan-target-chip warning">노이즈 ${interferenceSources[0].zone.name}</span>`
    : '';
  const note = coverage.blindSpots.length
      ? `현재 광역 스캔은 ${coverage.blindSpots.slice(0, 2).map(({ zone, sourceZone }) => `${zone.name} 음영(${sourceZone.name})`).join(', ')} 뒤쪽이 가려져 있다.`
      : interferenceSources.length
        ? `현재 광역 스캔은 ${interferenceSources.slice(0, 2).map(({ zone, penalty }) => `${zone.name} +${penalty}`).join(', ')} 노이즈에 영향을 받는다.`
        : '';
  scanTargetLegend.innerHTML = `
    <div class="scan-target-card local">
      <div class="scan-target-topline">
        <span class="tag">현장 스캔</span>
        <strong>${currentZone.name}</strong>
      </div>
      <div class="scan-target-chips">
        <span class="scan-target-chip emphasis">현재 위치 + 인접 ${coverage.adjacent.length}</span>
        <span class="scan-target-chip">신뢰 ${reliabilityScore}%</span>
        <span class="scan-target-chip">간섭 ${coverage.interference}</span>
        <span class="scan-target-chip">현장 축</span>
        ${blindSpotChip}
        ${noiseChip}
      </div>
      ${note ? `<p class="scan-target-note">${note}</p>` : ''}
    </div>
  `;
}

function renderEncounter() {
  const zone = zoneById[state.currentZoneId];
  const encounter = state.activeEncounter;
  const logs = state.logs.slice(0, 4);
  encounterCard.innerHTML = '';

  if (state.battle && encounter) {
    encounterCard.innerHTML += `
      <article class="event-box battle-box">
        <span class="tag">전투 중</span>
        <h3>${encounter.name}</h3>
        <p>${encounter.description}</p>
        <div class="battle-stats">
          <div><span>적 HP</span><strong>${Math.max(0, state.battle.enemyHp)} / ${state.battle.enemyMaxHp}</strong></div>
          <div><span>내 HP</span><strong>${state.hp} / ${getMaxHp()}</strong></div>
          <div><span>내 에너지</span><strong>${state.energy} / ${state.maxEnergy}</strong></div>
        </div>
        <div class="intent-preview ${getIntentToneClass(state.battle.enemyIntent)}">
          <div class="intent-preview-head">
            <p class="muted">다음 적 행동</p>
            <span class="intent-badge">${getIntentSeverityLabel(state.battle.enemyIntent)}</span>
          </div>
          <div class="intent-preview-body">
            <strong>${state.battle.enemyIntent.label}</strong>
            <p class="muted">예상 피해 ${state.battle.enemyIntent.damage} · 현재 보호막 기준 ${getProjectedIncomingDamage(state.battle.enemyIntent, state.battle.guard)}</p>
          </div>
        </div>
        <p class="muted">모멘텀 ${state.battle.momentum}/6${state.battle.guard > 0 ? ` · 보호막 ${state.battle.guard}` : ''}</p>
        ${state.battle.bossSignature ? `<p class="boss-signature"><strong>${state.battle.bossSignature.name}</strong> · ${state.battle.phaseLabel}</p>` : ''}
        <p class="muted">${state.battle.bossSignature?.detail || state.battle.lastTurn || '스킬을 선택해 교전을 이어가라.'}</p>
        <p class="muted">${state.battle.lastTurn || '스킬을 선택해 교전을 이어가라.'}</p>
      </article>
    `;
  } else if (encounter) {
    encounterCard.innerHTML += `
      <article class="event-box live-threat-box">
        <span class="tag emergency">${encounter.kind === 'boss' ? '보스 경보' : '현장 위협'}</span>
        <h3>${encounter.name}</h3>
        <p>${encounter.description}</p>
        ${encounter.signature ? `<p class="boss-signature"><strong>${encounter.signature.name}</strong> · ${encounter.signature.intro}</p>` : ''}
        <p class="muted">위험도 ${encounter.power} · 구역 ${zone.name} · 지도에 적 반응 노드가 활성화됐다.</p>
      </article>
    `;
  } else {
    encounterCard.innerHTML += `
      <article class="event-box">
        <span class="tag">안정</span>
        <h3>${zone.name}</h3>
        <p>${zone.story}</p>
        <p class="muted">위성 스캔이나 이동을 통해 새 이벤트를 생성해라.</p>
      </article>
    `;
  }

  logs.forEach((log) => {
    encounterCard.innerHTML += `
      <article class="event-box">
        <span class="tag">${log.tag}</span>
        <p>${log.text}</p>
      </article>
    `;
  });

  actionButtons.innerHTML = state.battle
    ? `
      <div class="orbit-actions battle-orbit">
        <button class="orbit-core primary" data-action="strike">
          <span>기본 공격</span>
          <strong>${Math.max(0, state.battle.enemyHp)} HP</strong>
        </button>
        <div class="orbit-ring">
          <button class="orbit-node ghost" data-action="analyze">
            <span>분석</span>
            <strong>에너지 -1</strong>
          </button>
          <button class="orbit-node ghost" data-action="guard">
            <span>보호막</span>
            <strong>방어 강화</strong>
          </button>
          <button class="orbit-node ghost" data-action="burst" ${state.battle.momentum >= 3 ? '' : 'disabled'}>
            <span>버스트</span>
            <strong>${state.battle.momentum}/3 모멘텀</strong>
          </button>
          <button class="orbit-node ghost" data-action="jam" ${state.battle.jamCooldown ? 'disabled' : ''}>
            <span>재밍</span>
            <strong>${state.battle.jamCooldown ? `재사용 ${state.battle.jamCooldown}턴` : '에너지 -2'}</strong>
          </button>
          <button class="orbit-node ghost" data-action="use-battery" ${state.inventory['battery-pack'] ? '' : 'disabled'}>
            <span>배터리</span>
            <strong>${state.inventory['battery-pack'] || 0}개 보유</strong>
          </button>
        </div>
      </div>
    `
    : `
      <div class="orbit-actions field-orbit ${encounter ? 'field-orbit-live' : 'field-orbit-idle'}">
        <button class="orbit-core primary" data-action="engage" ${encounter ? '' : 'disabled'}>
          <span>${encounter ? '교전 시작' : '교전 대기'}</span>
          <strong>${encounter ? encounter.name : zone.name}</strong>
        </button>
        <div class="orbit-ring compact">
          <button class="orbit-node ghost" data-action="stabilize">
            <span>안정화</span>
            <strong>구역 복구</strong>
          </button>
        </div>
      </div>
    `;
}

function renderZoneFocus() {
  const zone = zoneById[focusedZoneId] || zoneById[state.currentZoneId];
  if (!zone) {
    zoneFocus.innerHTML = '';
    return;
  }
  const zoneState = state.zoneStates[zone.id];
  const isCurrent = zone.id === state.currentZoneId;
  const travelCost = getTravelCost(zone.id);
  const travelHops = getRouteDistance(state.currentZoneId, zone.id);
  const travelRoute = getShortestRoute(state.currentZoneId, zone.id);
  const currentCoverage = getScanCoverage(state.currentZoneId);
  const focusCoverage = getScanCoverage(zone.id);
  const focusControl = getSectorControl(zone.id);
  const sectorIds = isCurrent ? currentCoverage.adjacent : getNeighbors(zone.id);
  const sectorChips = sectorIds.length
    ? sectorIds
        .map((neighborId) => `<span class="zone-sector-chip ${neighborId === state.currentZoneId ? 'active' : ''}">${zoneById[neighborId].name}</span>`)
        .join('')
    : '<span class="zone-sector-chip empty">인접 섹터 없음</span>';
  const orbitNodes = buildFocusOrbitNodes(zone.id, sectorIds, isCurrent);
  const orbitMarkup = renderFocusOrbitMarkup(zone, orbitNodes, isCurrent);
  const routeStops = travelRoute.length
    ? travelRoute
        .map((routeZoneId, index) => {
          const routeZone = zoneById[routeZoneId];
          const classes = [
            'route-stop',
            routeZoneId === state.currentZoneId ? 'origin' : '',
            routeZoneId === zone.id ? 'target' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const arrow = index < travelRoute.length - 1 ? '<span class="route-arrow" aria-hidden="true">→</span>' : '';
          return `<span class="${classes}">${routeZone.name}</span>${arrow}`;
        })
        .join('')
    : '<span class="route-stop empty">경로 데이터 없음</span>';
  const interferenceSources = getScanInterferenceSources(state.currentZoneId);
  const scanNote = isCurrent
    ? `현재 위치 주변 스캔 · 인접 ${currentCoverage.adjacent.length}개 · 간섭 ${currentCoverage.interference}${currentCoverage.blindSpots.length ? ` · 음영 ${currentCoverage.blindSpots.length}` : ''}${interferenceSources.length ? ` · 노이즈 ${interferenceSources[0].zone.name}` : ''}`
    : `이 구역은 이동 후 주변 스캔 가능`;
  const controlStateLabel = focusControl.controlled
    ? focusControl.securedNeighbors.length >= 2
      ? '섹터 제어망 안정'
      : '제어 앵커 확보'
    : '제어권 미확보';
  const controlSummary = focusControl.controlled
    ? `스캔 보정 +${focusControl.interferenceReduction} · 위기 감쇠 ${focusControl.surgeReduction}`
    : '주변 안전 섹터를 더 안정화하면 스캔 노이즈와 위기 전파를 줄일 수 있다.';
  const controlChips = focusControl.securedNeighbors.length
    ? focusControl.securedNeighbors
        .map((neighborId) => `<span class="zone-sector-chip control">${zoneById[neighborId].name}</span>`)
        .join('')
    : '<span class="zone-sector-chip empty">연결된 안정 섹터 없음</span>';
  const localBlindSpotChips = isCurrent && currentCoverage.blindSpots.length
    ? currentCoverage.blindSpots.slice(0, 4).map(({ zone: blindZone, sourceZone, severity }) => `<span class="zone-sector-chip ${severity === 'high' ? 'danger-chip' : 'warning-chip'}">${blindZone.name} · ${sourceZone.name} 뒤</span>`).join('')
    : '';
  const threatSpill = getThreatSpillPreview(zone.id);
  const threatSpillChips = threatSpill.activePressures?.length
    ? threatSpill.activePressures.slice(0, 3).map((entry) => `<span class="zone-sector-chip ${entry.severity === 'high' ? 'danger-chip' : entry.severity === 'medium' ? 'warning-chip' : 'frontier'}">${entry.zone.name} · ${entry.label}</span>`).join('')
    : '<span class="zone-sector-chip empty">즉시 압박 중인 인접 섹터 없음</span>';
  const nearbyScanChips = focusCoverage.adjacent.length
    ? focusCoverage.adjacent.slice(0, 4).map((zoneId) => `<span class="zone-sector-chip frontier">${zoneById[zoneId].name}</span>`).join('')
    : '<span class="zone-sector-chip empty">인접 스캔 대상 없음</span>';
  const routePressure = getRoutePressure(state.currentZoneId, zone.id);
  const routePressureLabel = routePressure.severity === 'high'
    ? '고압 경로'
    : routePressure.severity === 'medium'
      ? '주의 경로'
      : routePressure.severity === 'none'
        ? '현 위치'
        : '안정 경로';
  const routeNote = isCurrent
    ? '현재 배치된 중심 섹터'
    : travelHops === Infinity
      ? '직결 루트 없음'
      : `${travelHops}홉 재배치 · 이동 비용 ${travelCost}`;
  const routeHint = isCurrent
    ? '현 위치 기준 캠퍼스 작전 시작점'
    : travelRoute.length > 1
      ? `권장 재배치 루트, ${travelRoute.length - 1}구간 이동`
      : '재배치 루트를 계산할 수 없음';
  const pressureSummary = isCurrent
    ? '현재 위치에서 주변 신호만 확인한다.'
    : routePressure.summary;
  zoneFocus.innerHTML = `
    <article class="zone-focus-card zone-focus-hud ${isCurrent ? 'current' : ''}">
      <div class="zone-focus-head zone-focus-topline">
        <div class="zone-focus-title-block">
          <div class="zone-focus-title-row">
            <span class="tag">${isCurrent ? '현재 궤도' : '선택 구역'}</span>
            <span class="zone-focus-kind">${zone.kind.toUpperCase()}</span>
          </div>
          <h3>${zone.name}</h3>
          <p class="zone-focus-summary">${zone.story}</p>
        </div>
        <div class="zone-focus-visual zone-focus-network-view">
          ${orbitMarkup}
          <span class="zone-focus-landmark">${zone.landmark}</span>
        </div>
      </div>
      <div class="zone-focus-metrics zone-focus-metrics-compact">
        <div><span>안정도</span><strong>${zoneState.stability}%</strong></div>
        <div><span>위협도</span><strong>${zoneState.threat}</strong></div>
        <div><span>난도</span><strong>${zone.difficulty}</strong></div>
        <div><span>스캔</span><strong>${isCurrent ? `${currentCoverage.range}링` : `${Math.max(1, getScanCoverage(zone.id).range)}링`}</strong></div>
      </div>
      <div class="zone-focus-stack">
        <div class="zone-hud-row">
          <div class="zone-hud-labels">
            <span>접속 섹터</span>
            <strong>${scanNote}</strong>
          </div>
          <div class="zone-focus-selector-caption">${isCurrent ? '주변 섹터는 정보 확인용이다. 스캔은 현재 위치에서만 돈다.' : '연결 섹터를 확인하고 이동 루트를 고른다.'}</div>
          <div class="zone-sector-chips secondary">${sectorChips}</div>
        </div>
        <div class="zone-hud-row control-block ${focusControl.controlled ? 'active' : ''}">
          <div class="zone-hud-labels">
            <span>캠퍼스 제어망</span>
            <strong>${controlStateLabel}</strong>
          </div>
          <div class="zone-hud-pills">
            <span class="zone-hud-pill">안전 ${focusControl.securedNeighbors.length}</span>
            <span class="zone-hud-pill">반사 ${focusControl.controlled ? `+${focusControl.rangeBonus}` : '+0'}</span>
            <span class="zone-hud-pill">차단 ${focusControl.controlled ? `-${focusControl.surgeReduction}%` : '0%'}</span>
          </div>
          <div class="zone-sector-chips">${controlChips}</div>
          <p class="muted zone-route-hint">${controlSummary}</p>
        </div>
        <div class="zone-hud-row frontier-block active">
          <div class="zone-hud-labels">
            <span>${isCurrent ? '현 위치 주변' : '이동 후 주변'}</span>
            <strong>${isCurrent ? `인접 ${focusCoverage.adjacent.length}개 섹터` : `인접 ${focusCoverage.adjacent.length}개 섹터`}</strong>
          </div>
          <div class="zone-hud-pills">
            <span class="zone-hud-pill emphasis">반경 1링</span>
            <span class="zone-hud-pill">인접 ${focusCoverage.adjacent.length}</span>
            <span class="zone-hud-pill ${focusCoverage.blindSpots.length ? 'warning' : ''}">음영 ${focusCoverage.blindSpots.length}</span>
          </div>
          <div class="zone-sector-chips">${nearbyScanChips}</div>
          ${localBlindSpotChips ? `<div class="zone-sector-chips secondary frontier-loss-chips">${localBlindSpotChips}</div>` : ''}
          <p class="muted zone-route-hint">${isCurrent ? '스캔은 현재 위치와 바로 연결된 구역만 건드린다.' : '이동하기 전에는 이 구역을 원격으로 스캔하지 않는다.'}</p>
        </div>
        <div class="zone-hud-row spill-block ${threatSpill.severity}">
          <div class="zone-hud-labels">
            <span>위협 번짐</span>
            <strong>${threatSpill.active ? `압박 ${threatSpill.activePressures.length}축` : '압박 잠잠'}</strong>
          </div>
          <div class="zone-hud-pills route-pressure-pills">
            <span class="zone-hud-pill emphasis">확산 ${threatSpill.spillPower}</span>
            <span class="zone-hud-pill ${threatSpill.severity === 'high' ? 'danger' : threatSpill.severity === 'medium' ? 'warning' : ''}">${threatSpill.active ? `위험 ${threatSpill.activePressures.length}` : '안정 회랑'}</span>
          </div>
          <div class="zone-sector-chips">${threatSpillChips}</div>
          <p class="muted zone-route-hint">${threatSpill.summary}</p>
        </div>
        <div class="zone-hud-row route-block ${routePressure.severity}">
          <div class="zone-hud-labels">
            <span>재배치 경로</span>
            <strong>${routeNote}</strong>
          </div>
          <div class="zone-route-strip">${routeStops}</div>
          <div class="zone-hud-pills route-pressure-pills">
            <span class="zone-hud-pill emphasis">${routePressureLabel} · ${routePressure.score}</span>
            <span class="zone-hud-pill">위험 ${routePressure.hotspots}</span>
            <span class="zone-hud-pill">불안정 ${routePressure.unstableSegments}</span>
            <span class="zone-hud-pill">권장 ${routePressure.recommendation}</span>
          </div>
          <p class="muted zone-route-hint">${pressureSummary}</p>
          <p class="muted zone-route-hint">${routeHint}</p>
        </div>
      </div>
      <div class="zone-focus-footer">
        <button class="${isCurrent ? 'ghost' : 'primary'}" data-zone-focus-action="travel" data-zone-id="${zone.id}" ${isCurrent ? 'disabled' : ''}>${isCurrent ? '현재 배치' : '이 구역으로 이동'}</button>
      </div>
    </article>
  `;
}

function buildFocusOrbitNodes(centerZoneId, sectorIds, isCurrent) {
  const nodes = [];
  const relatedIds = [];
  if (!relatedIds.includes(state.currentZoneId)) relatedIds.push(state.currentZoneId);
  if (!relatedIds.includes(centerZoneId)) relatedIds.push(centerZoneId);
  sectorIds.forEach((zoneId) => {
    if (!relatedIds.includes(zoneId)) relatedIds.push(zoneId);
  });

  const orbitIds = relatedIds.filter((zoneId) => zoneId !== centerZoneId).slice(0, 5);
  orbitIds.forEach((zoneId, index) => {
    const angle = (-90 + (360 / Math.max(orbitIds.length, 1)) * index) * (Math.PI / 180);
    nodes.push({
      zoneId,
      label: getOrbitNodeShortLabel(zoneById[zoneId]?.name || zoneId),
      angle,
      distance: orbitIds.length <= 2 ? 62 : 68,
      isCurrent: zoneId === state.currentZoneId,
      isFocused: zoneId === focusedZoneId,
      isTargeted: false,
      mode: isCurrent ? 'scan' : 'route',
    });
  });
  return nodes;
}

function renderFocusOrbitMarkup(zone, orbitNodes, isCurrent) {
  const nodeMarkup = orbitNodes.length
    ? orbitNodes
        .map((node) => {
          const x = Math.cos(node.angle) * node.distance;
          const y = Math.sin(node.angle) * node.distance;
          const classes = [
            'zone-focus-orbit-node',
            node.isCurrent ? 'current' : '',
            node.isFocused ? 'focused' : '',
            node.isTargeted ? 'targeted' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const status = node.isCurrent ? '현재 위치' : isCurrent ? '주변 섹터' : '연결 섹터';
          return `
            <button
              class="${classes}"
              type="button"
              data-zone-focus-action="select"
              data-zone-id="${node.zoneId}"
              style="--orbit-x:${x.toFixed(1)}px; --orbit-y:${y.toFixed(1)}px"
              aria-label="${zoneById[node.zoneId].name} ${status}"
            >
              <span>${node.label}</span>
            </button>
          `;
        })
        .join('')
    : '<span class="zone-focus-orbit-empty">연결 섹터 없음</span>';

  return `
    <div class="zone-focus-radar-cluster">
      <div class="zone-focus-radar ${isCurrent ? 'live' : 'remote'}">
        <span class="zone-focus-ring ring-a"></span>
        <span class="zone-focus-ring ring-b"></span>
        <span class="zone-focus-ring ring-c"></span>
        <span class="zone-focus-core"></span>
        <span class="zone-focus-center-label">${getOrbitNodeShortLabel(zone.name)}</span>
        ${nodeMarkup}
      </div>
    </div>
  `;
}

function getOrbitNodeShortLabel(name) {
  return name
    .replace('DGIST ', '')
    .replace('캠퍼스 ', '')
    .replace(' 연구 ', ' ')
    .replace('학술정보관', '정보관')
    .replace('학생회관', '학생')
    .replace('기숙사', '기숙')
    .replace('컨실리언스', '플라자')
    .replace('AI·로봇 ', 'AI·로봇\n')
    .split(' ')
    .slice(0, 2)
    .join('\n');
}

function renderStabilityOverview() {
  const currentZoneId = state.currentZoneId;
  stabilityOverview.innerHTML = ZONES
    .map((zone) => {
      const zoneState = state.zoneStates[zone.id];
      const travelCost = getTravelCost(zone.id);
      const travelHops = getRouteDistance(currentZoneId, zone.id);
      const isCurrent = zone.id === currentZoneId;
      const control = getSectorControl(zone.id);
      const frontierForecast = getRedeployScanForecast(currentZoneId, zone.id);
      const threatSpill = getThreatSpillPreview(zone.id);
      const classes = [
        'stability-item',
        zoneState.stability >= 70 ? 'good' : '',
        zoneState.stability <= 45 || zoneState.threat >= 3 ? 'risk' : '',
        control.controlled ? 'controlled' : '',
        isCurrent ? 'current' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `
        <article class="${classes} ${focusedZoneId === zone.id ? 'focused' : ''}" data-zone-id="${zone.id}">
          <div class="stability-top">
            <h3>${zone.name}</h3>
            <span class="tag">위협 ${zoneState.threat}</span>
          </div>
          <p class="muted">${zoneState.stability >= 70 ? '안정화 우세' : zoneState.stability <= 45 ? '교란 심화' : '경계 유지'}</p>
          <div class="stability-subrow">
            <span class="mini-pill ${control.controlled ? 'active' : ''}">제어망 ${control.controlled ? '활성' : '약함'}</span>
            <span class="mini-pill ${isCurrent ? 'active' : ''}">${isCurrent ? `주변 ${Math.max(0, getScanCoverage(zone.id).covered.length - 1)}` : `이동 후 주변 ${getNeighbors(zone.id).length}`}</span>
            <span class="mini-pill ${threatSpill.severity === 'high' ? 'danger' : threatSpill.severity === 'medium' ? 'warning' : ''}">${threatSpill.active ? `압박 ${threatSpill.activePressures.length}` : '압박 잠잠'}</span>
          </div>
          <p class="muted stability-frontier-note">${threatSpill.active ? threatSpill.summary : isCurrent ? `현재 위치에서 인접 ${Math.max(0, getScanCoverage(zone.id).covered.length - 1)}개 섹터만 확인 중.` : `이동하면 인접 ${getNeighbors(zone.id).length}개 섹터를 주변 스캔할 수 있다.`}</p>
          <div class="stability-bottom">
            <div class="stability-meter"><span style="width:${zoneState.stability}%"></span></div>
            <strong>${zoneState.stability}%</strong>
          </div>
          <div class="stability-actions">
            <span class="muted">${isCurrent ? '현재 위치' : `${travelHops}홉 · 이동 비용 ${travelCost} 에너지`}</span>
            <div class="stability-action-cluster">
              <button class="ghost" data-zone-action="focus" data-zone-id="${zone.id}">${isCurrent ? '현 위치 보기' : '구역 보기'}</button>
              <button class="ghost" data-zone-action="travel" data-zone-id="${zone.id}" ${isCurrent ? 'disabled' : ''}>${isCurrent ? '배치 완료' : '이동'}</button>
            </div>
          </div>
        </article>`;
    })
    .join('');
}

function renderQuests() {
  questList.innerHTML = '';
  state.quests.forEach((questId) => {
    const quest = QUEST_POOL.find((item) => item.id === questId);
    if (!quest) return;
    const current = state.questProgress[quest.type] ?? 0;
    const done = current >= quest.target;
    const node = questTemplate.content.firstElementChild.cloneNode(true);
    node.classList.toggle('done', done);
    node.querySelector('h3').textContent = quest.title;
    node.querySelector('p').textContent = `${quest.description} (${Math.min(current, quest.target)}/${quest.target})`;
    node.querySelector('.quest-reward').textContent = renderReward(quest.reward);
    questList.appendChild(node);
  });
}

function renderIntel() {
  intelFeed.innerHTML = state.intel
    .slice(0, 5)
    .map(
      (line, idx) => `
      <article class="intel-item">
        <span class="tag">인텔 ${idx + 1}</span>
        <p>${line}</p>
      </article>`,
    )
    .join('');
}

function renderInventory() {
  const entries = Object.entries(state.inventory).filter(([, count]) => count > 0);
  const equippedNames = Object.values(state.equipment)
    .filter(Boolean)
    .map((id) => itemById[id]?.name)
    .join(', ');
  const derivedStats = getDerivedStats();
  const slotLabels = {
    tool: '툴',
    accessory: '보조',
    arm: '암',
    body: '바디',
  };
  const statChips = [
    ['공격', derivedStats.attack || 0],
    ['방어', derivedStats.shield || 0],
    ['테크', derivedStats.tech || 0],
    ['스캔', `${Math.round((derivedStats.scanBoost || 0) * 100)}%`],
  ];

  loadoutSummary.innerHTML = `
    <section class="loadout-hud">
      <div class="loadout-slots">
        ${Object.entries(slotLabels)
          .map(([slot, label]) => {
            const equippedId = state.equipment[slot];
            const item = equippedId ? itemById[equippedId] : null;
            return `
              <article class="loadout-slot ${item ? 'equipped' : 'empty'}">
                <span class="loadout-slot-label">${label}</span>
                <strong>${item?.name || '빈 슬롯'}</strong>
                <p>${item?.description || '해당 슬롯 장비를 장착하면 즉시 효과가 반영된다.'}</p>
              </article>
            `;
          })
          .join('')}
      </div>
      <div class="loadout-stats">
        ${statChips
          .map(
            ([label, value]) => `
              <div class="loadout-stat-chip">
                <span>${label}</span>
                <strong>${value}</strong>
              </div>
            `,
          )
          .join('')}
      </div>
    </section>
  `;

  loadoutText.textContent = equippedNames ? `장착 중: ${equippedNames}` : '장착 중인 장비 없음';

  inventoryList.innerHTML = entries.length
    ? entries
        .map(([itemId, count]) => {
          const item = itemById[itemId];
          if (!item) return '';
          const equipped = Object.values(state.equipment).includes(itemId);
          const compare = item.type === 'gear' ? getEquipmentComparison(itemId) : null;
          const button = item.type === 'consumable'
            ? `<button class="ghost" data-item-action="use" data-item-id="${itemId}">사용</button>`
            : `<button class="ghost" data-item-action="equip" data-item-id="${itemId}">${equipped ? '해제' : '장착'}</button>`;
          return `
            <article class="inventory-item ${equipped ? 'equipped' : ''}">
              <div class="inventory-item-main">
                <div>
                  <h3>${item.name} <span>x${count}</span></h3>
                  <p>${item.description}</p>
                </div>
                ${compare ? renderComparisonBlock(compare) : ''}
              </div>
              ${button}
            </article>
          `;
        })
        .join('')
    : '<article class="inventory-item empty"><p>인벤토리가 비어 있다. 탐사와 퀘스트로 보급품을 확보해라.</p></article>';
}

function getEquipmentComparison(itemId) {
  const item = itemById[itemId];
  if (!item?.slot) return null;

  const equippedId = state.equipment[item.slot];
  const equippedItem = equippedId ? itemById[equippedId] : null;
  const nextStats = item.stats || {};
  const currentStats = equippedItem?.stats || {};
  const labels = {
    attack: '공격',
    shield: '방어',
    tech: '테크',
    scanBoost: '스캔',
    crit: '치명',
    scout: '정찰',
    intel: '인텔',
    maxHp: 'HP',
  };
  const keys = ['attack', 'shield', 'tech', 'scanBoost', 'crit', 'scout', 'intel', 'maxHp'];
  const deltas = keys
    .map((key) => {
      const delta = (nextStats[key] || 0) - (currentStats[key] || 0);
      if (!delta) return null;
      return {
        key,
        label: labels[key],
        delta,
      };
    })
    .filter(Boolean);

  return {
    slotLabel: { tool: '툴', accessory: '보조', arm: '암', body: '바디' }[item.slot] || item.slot,
    equippedName: equippedItem?.name || null,
    deltas,
    emptySlot: !equippedItem,
    sameItem: equippedId === itemId,
  };
}

function renderComparisonBlock(compare) {
  const deltaChips = compare.deltas.length
    ? compare.deltas
        .map(({ key, label, delta }) => {
          const positive = delta > 0;
          const amount = ['scanBoost', 'crit'].includes(key) ? `${positive ? '+' : ''}${Math.round(delta * 100)}%` : `${positive ? '+' : ''}${delta}`;
          return `<span class="compare-chip ${positive ? 'up' : 'down'}">${label} ${amount}</span>`;
        })
        .join('')
    : '<span class="compare-chip neutral">변화 없음</span>';
  const slotNote = compare.sameItem
    ? `${compare.slotLabel} 슬롯에 장착 중`
    : compare.emptySlot
      ? `${compare.slotLabel} 슬롯 비어 있음`
      : `${compare.slotLabel} 교체 · 현재 ${compare.equippedName}`;

  return `
    <div class="inventory-compare ${compare.sameItem ? 'same' : ''}">
      <p class="inventory-compare-slot">${slotNote}</p>
      <div class="inventory-compare-chips">${deltaChips}</div>
    </div>
  `;
}

function renderLogisticsTabs() {
  logisticsTabs.querySelectorAll('.logistics-tab').forEach((button) => {
    const isActive = button.dataset.logisticsTab === activeLogisticsTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  const showQuests = activeLogisticsTab === 'quests';
  questPanel.classList.toggle('active', showQuests);
  questPanel.hidden = !showQuests;
  inventoryPanel.classList.toggle('active', !showQuests);
  inventoryPanel.hidden = showQuests;
}

function renderDossier() {
  const archetype = PLAYER_ARCHETYPES.find((item) => item.id === state.archetypeId);
  const faction = FACTIONS.find((item) => item.id === state.factionId);
  const zone = zoneById[state.currentZoneId];
  dossierCard.innerHTML = `
    <article class="event-box">
      <span class="tag">레인저 도감</span>
      <h3>${archetype?.name || '미확인 전공'}</h3>
      <p>${archetype?.passive || ''}</p>
      <p class="muted">소속: ${faction?.name || '-'} · ${faction?.bonus || ''}</p>
    </article>
    <article class="event-box">
      <span class="tag">구역 로어</span>
      <h3>${zone.name}</h3>
      <p>${zone.landmark}</p>
    </article>
    <article class="event-box">
      <span class="tag">확장 포인트</span>
      <p>GPS 판정은 currentZoneId 대신 실제 좌표를 연결하면 되고, 위성/이미지 인텔은 scan reward 단계의 피드 공급자만 교체하면 된다.</p>
    </article>
  `;
}

function renderOpsTabs() {
  opsTabs.querySelectorAll('.ops-tab').forEach((button) => {
    const isActive = button.dataset.opsTab === activeOpsTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  const showIntel = activeOpsTab === 'intel';
  intelPanel.classList.toggle('active', showIntel);
  intelPanel.hidden = !showIntel;
  dossierPanel.classList.toggle('active', !showIntel);
  dossierPanel.hidden = showIntel;
}

function syncMarkers() {
  playerMarker.setLatLng(zoneById[state.currentZoneId].coords);
  zoneMarkers.forEach(({ zoneId, marker }) => {
    const zoneState = state.zoneStates[zoneId];
    const control = getSectorControl(zoneId);
    const fillColor = zoneState.stability <= 45 ? '#ff7c7c' : zoneState.stability >= 70 ? '#9dff8f' : '#ffd166';
    marker.setStyle({
      radius: control.controlled ? 10 : zoneById[zoneId].boss ? 10 : 8,
      fillOpacity: state.visited.includes(zoneId) ? 0.9 : 0.5,
      fillColor,
      color: control.controlled ? '#61d5ff' : fillColor,
      weight: control.controlled ? 3 : 2,
      opacity: control.controlled ? 0.95 : 0.82,
    });
    marker.setPopupContent(renderZonePopup(zoneById[zoneId]));
  });
}

function onLogisticsTabClick(event) {
  const button = event.target.closest('button[data-logistics-tab]');
  if (!button) return;

  activeLogisticsTab = button.dataset.logisticsTab || 'quests';
  renderLogisticsTabs();
}

function onOpsTabClick(event) {
  const button = event.target.closest('button[data-ops-tab]');
  if (!button) return;
  activeOpsTab = button.dataset.opsTab;
  renderOpsTabs();
}

function onActionClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action } = button.dataset;
  if (action === 'engage') startBattle();
  if (action === 'strike') battleTurn('strike');
  if (action === 'analyze') battleTurn('analyze');
  if (action === 'guard') battleTurn('guard');
  if (action === 'burst') battleTurn('burst');
  if (action === 'jam') battleTurn('jam');
  if (action === 'stabilize') stabilizeCurrentZone();
  if (action === 'use-battery') useInventoryItem('battery-pack');
}

function onInventoryClick(event) {
  const button = event.target.closest('button[data-item-action]');
  if (!button) return;
  const { itemAction, itemId } = button.dataset;
  if (itemAction === 'use') useInventoryItem(itemId);
  if (itemAction === 'equip') toggleEquip(itemId);
}

function onStabilityOverviewClick(event) {
  const travelButton = event.target.closest('button[data-zone-action="travel"]');
  if (travelButton) {
    travelTo(travelButton.dataset.zoneId);
    return;
  }

  const previewButton = event.target.closest('button[data-zone-action="focus"]');
  if (previewButton) {
    focusZone(previewButton.dataset.zoneId, { openPopup: true, source: 'stability-card' });
    return;
  }

  const card = event.target.closest('article[data-zone-id]');
  if (!card) return;
  focusZone(card.dataset.zoneId, { openPopup: false, source: 'stability-card' });
}

function focusZone(zoneId, { openPopup = false } = {}) {
  if (!zoneById[zoneId]) return;
  focusedZoneId = zoneId;
  renderFocusedSelection();
  setFocusedStabilityCard(zoneId);
  const markerEntry = zoneMarkers.find((entry) => entry.zoneId === zoneId);
  if (markerEntry) {
    map.flyTo(zoneById[zoneId].coords, Math.max(map.getZoom(), 16), {
      animate: false,
      duration: 0,
    });
    if (openPopup) markerEntry.marker.openPopup();
  }
}

function setFocusedStabilityCard(zoneId) {
  stabilityOverview.querySelectorAll('.stability-item').forEach((card) => {
    card.classList.toggle('focused', card.dataset.zoneId === zoneId);
  });
}

function onZoneFocusClick(event) {
  const selectButton = event.target.closest('button[data-zone-focus-action="select"]');
  if (selectButton) {
    focusedZoneId = selectButton.dataset.zoneId;
    renderFocusedSelection();
    return;
  }

  const button = event.target.closest('button[data-zone-focus-action="travel"]');
  if (!button) return;
  travelTo(button.dataset.zoneId);
}

function getTravelCost(zoneId) {
  const zone = zoneById[zoneId];
  const zoneState = state.zoneStates[zoneId];
  if (!zone || !zoneState) return 0;
  const routeHops = getRouteDistance(state.currentZoneId, zoneId);
  const hopCost = routeHops === Infinity ? 2 : Math.max(0, routeHops - 1);
  return Math.max(1, zone.difficulty + hopCost + (zoneState.threat >= 3 ? 1 : 0) - (zoneState.stability >= 72 ? 1 : 0));
}

function travelTo(zoneId) {
  if (state.battle) {
    pushLog('이동 불가', '전투를 끝내야 다른 구역으로 이동할 수 있다.');
    render();
    return;
  }
  const zone = zoneById[zoneId];
  if (!zone) return;
  if (zoneId === state.currentZoneId) {
    pushLog('현 위치', `${zone.name}에 이미 도착해 있다. 스캔 또는 교전을 선택해라.`);
    render();
    return;
  }
  const zoneState = state.zoneStates[zoneId];
  const cost = getTravelCost(zoneId);
  if (state.energy < cost) {
    pushLog('에너지 부족', `${zone.name}으로 이동하려면 에너지 ${cost}가 필요하다.`);
    render();
    return;
  }

  const previousZoneId = state.currentZoneId;
  state.energy -= cost;
  state.currentZoneId = zoneId;
  focusedZoneId = zoneId;
  state.travelCount += 1;
  state.questProgress.travelCount = state.travelCount;
  if (!state.visited.includes(zoneId)) {
    state.visited.push(zoneId);
    const scoutBonus = getDerivedStats().scout * 4;
    award({ xp: 12 + zone.difficulty * 4, credits: 10 + zone.difficulty * 3 + scoutBonus });
    state.intel.unshift(`${zone.name}: ${zone.landmark}`);
  }
  changeZoneState(zoneId, 2, -1);
  changeZoneState(previousZoneId, -1, 0);
  pushLog('이동 완료', `${zone.name} 도착. ${zone.story}`);
  spawnEncounter(zone);
  checkQuests();
  render();
}

function satelliteScan() {
  if (state.battle) {
    pushLog('스캔 불가', '전투 중에는 스캔을 돌릴 수 없다.');
    render();
    return;
  }
  const zone = zoneById[state.currentZoneId];
  if (state.energy < 1) {
    pushLog('스캔 실패', '에너지가 부족해서 위성 스캔을 돌릴 수 없다. 학생회관이나 기숙사 쪽에서 쉬어라.');
    render();
    return;
  }

  const stats = getDerivedStats();
  const zoneState = state.zoneStates[state.currentZoneId];
  const coverage = getScanCoverage(state.currentZoneId);
  const control = getSectorControl(state.currentZoneId);
  const archetypeBonus = state.archetypeId === 'ai' ? 1.2 : 1;
  const targetZoneIds = coverage.available.filter((zoneId) => zoneId !== state.currentZoneId);
  const targetZoneId = targetZoneIds.length
    ? targetZoneIds[(state.scans + coverage.interference + zone.difficulty) % targetZoneIds.length]
    : state.currentZoneId;
  const targetZone = zoneById[targetZoneId];
  const targetState = state.zoneStates[targetZone.id];
  const remoteScan = targetZone.id !== state.currentZoneId;
  state.energy -= 1;
  state.scans += 1;
  state.questProgress.scanCount = state.scans;

  const baseFeed = SATELLITE_FEED[(state.scans + state.level + targetZone.difficulty) % SATELLITE_FEED.length];
  const directionalIntel = !remoteScan
    ? `${zone.name} 근처를 스캔했다. ${baseFeed}`
    : `${zone.name}에서 바로 이어진 ${targetZone.name} 쪽 신호를 확인했다. ${baseFeed}`;
  state.intel.unshift(`${targetZone.name}: ${directionalIntel}`);
  changeZoneState(zone.id, 4 + stats.intel, -1);
  if (remoteScan) {
    changeZoneState(targetZone.id, 2 + stats.intel, 0);
  }
  const loreChance = !remoteScan
    ? 0.26 + stats.intel * 0.08
    : 0.18 + stats.intel * 0.07;
  if (Math.random() < loreChance || zone.kind === 'knowledge') {
    state.intel.unshift(`${targetZone.name} 기록: ${LORE_SNIPPETS[(state.scans + targetZone.difficulty) % LORE_SNIPPETS.length]}`);
  }
  award({
    xp: Math.round((8 + targetZone.difficulty * 3) * archetypeBonus * (1 + stats.scanBoost)),
    credits: 6 + targetZone.difficulty * 2,
  });

  const reliabilityPenalty = coverage.interference * 0.03 + (remoteScan ? 0.03 : 0);
  const surgeChance = Math.max(0.08, 0.15 + targetZone.difficulty * 0.04 + Math.max(0, 52 - targetState.stability) / 100 + reliabilityPenalty - control.surgeReduction / 100);
  if (Math.random() < surgeChance) {
    changeZoneState(targetZone.id, -6, 1);
    if (!remoteScan) {
      spawnEncounter(zone, true);
      pushLog('스캔 결과', `${zone.name} 상공에서 적대 신호를 포착했다. 교전 준비.`);
    } else {
      pushLog('주변 감지', `${zone.name} 바로 옆 ${targetZone.name}에서 이상 파동이 잡혔다. 인접 섹터 위협이 상승했다.`);
    }
  } else {
    maybeDropLoot(zone, remoteScan ? 0.14 : 0.28);
    pushLog('스캔 결과', `${zone.name} 주변에서 ${targetZone.name} 신호를 확보했다. ${coverage.interference > 0 ? `간섭 ${coverage.interference}로 판독에 노이즈가 남았다.` : '선명한 판독이 들어왔다.'}${control.controlled ? ` 제어망이 붙어 위기 전파를 ${control.surgeReduction}% 억제했다.` : ''}`);
  }

  checkQuests();
  render();
}

function spawnEncounter(zone, force = false) {
  if (!force && Math.random() < 0.33) {
    state.activeEncounter = null;
    state.battle = null;
    return;
  }
  const zoneState = state.zoneStates[zone.id];
  const enemyPool = ENEMIES[zone.kind] || ['잡음체'];
  const name = enemyPool[(state.level + zone.difficulty + state.scans) % enemyPool.length];
  const boss = zone.boss && (force || Math.random() < 0.45 + zoneState.threat * 0.08);
  const power = zone.difficulty * 16 + state.level * 7 + zoneState.threat * 5 + Math.max(0, 60 - zoneState.stability) + (boss ? 18 : 0);
  state.activeEncounter = {
    zoneId: zone.id,
    kind: boss ? 'boss' : 'normal',
    name: boss ? `${name} Ω` : name,
    power,
    signature: boss ? BOSS_SIGNATURES[zone.id] || null : null,
    description: boss
      ? '구역 보스를 정화하면 대량의 XP와 유물을 얻는다. 적 반응 노드가 지도 전면에 표시된다.'
      : '캠퍼스 신호망을 갉아먹는 소형 적대체다. 적 반응 노드가 지도 위에 활성화됐다.',
  };
  state.battle = null;
}

function startBattle() {
  const encounter = state.activeEncounter;
  if (!encounter) return;
  const bossSignature = encounter.signature
    ? {
        ...encounter.signature,
        detail: encounter.signature.intro,
      }
    : null;
  state.battle = {
    enemyHp: 28 + encounter.power,
    enemyMaxHp: 28 + encounter.power,
    guard: 0,
    momentum: 0,
    jamCooldown: 0,
    phase: 1,
    phaseShiftTriggered: false,
    phaseLabel: bossSignature?.phaseLabel?.[0] || null,
    bossSignature,
    enemyIntent: getEnemyIntent(encounter, 1),
    lastTurn: '교전 개시. 적의 패턴을 읽고 스킬을 선택해라.',
  };
  render();
}

function battleTurn(action) {
  const encounter = state.activeEncounter;
  const battle = state.battle;
  if (!encounter || !battle) return;
  const zone = zoneById[encounter.zoneId];
  const stats = getDerivedStats();
  let damage = 0;
  let note = '';
  let momentumGain = 1;

  if (action === 'strike') {
    damage = state.level * 8 + 10 + stats.attack + Math.floor(Math.random() * 8);
    if (Math.random() < stats.crit) {
      damage += 10;
      note = '치명타 적중.';
    }
  }

  if (action === 'analyze') {
    if (state.energy < 1) {
      pushLog('스킬 실패', '분석 스킬을 쓰려면 에너지 1이 필요하다.');
      render();
      return;
    }
    state.energy -= 1;
    damage = state.level * 7 + 12 + stats.tech + zone.difficulty * 2;
    battle.guard += 2;
    note = '약점 분석으로 다음 피격을 줄인다.';
  }

  if (action === 'guard') {
    battle.guard += 8 + stats.shield;
    damage = 4 + Math.floor(stats.attack / 2);
    momentumGain = 0;
    note = '보호막을 전개했다.';
  }

  if (action === 'burst') {
    if (battle.momentum < 3) {
      pushLog('버스트 실패', '모멘텀이 부족하다. 공격이나 분석으로 3 이상 모아라.');
      render();
      return;
    }
    battle.momentum -= 3;
    damage = state.level * 12 + 18 + stats.attack + stats.tech;
    note = '축적한 모멘텀을 폭발시켰다.';
  }

  if (action === 'jam') {
    if (state.energy < 2) {
      pushLog('재밍 실패', '재밍 필드를 열려면 에너지 2가 필요하다.');
      render();
      return;
    }
    state.energy -= 2;
    damage = 8 + stats.tech;
    battle.guard += 6 + stats.shield;
    battle.jamCooldown = 3;
    momentumGain = 0;
    note = '적의 신호를 교란해 다음 반격을 크게 약화시킨다.';
  }

  battle.enemyHp = Math.max(0, battle.enemyHp - damage);
  battle.momentum = Math.min(6, battle.momentum + momentumGain);

  if (battle.enemyHp <= 0) {
    winBattle(encounter, zone);
    return;
  }

  if (encounter.kind === 'boss' && !battle.phaseShiftTriggered && battle.enemyHp <= Math.floor(battle.enemyMaxHp / 2)) {
    battle.phase = 2;
    battle.phaseShiftTriggered = true;
    battle.guard += encounter.zoneId === 'e7' ? 8 : 5;
    if (battle.bossSignature) {
      battle.phaseLabel = battle.bossSignature.phaseLabel?.[1] || '2페이즈';
      battle.bossSignature.detail = battle.bossSignature.phaseTwo;
    }
    note = `${note} 보스가 ${battle.phaseLabel}로 전환했다.`.trim();
  }

  let enemyDamageBase = battle.enemyIntent.damage;
  if (action === 'jam') enemyDamageBase = Math.max(4, enemyDamageBase - (10 + stats.tech));
  const blocked = Math.min(enemyDamageBase, battle.guard);
  battle.guard = Math.max(0, battle.guard - enemyDamageBase);
  const finalDamage = Math.max(0, enemyDamageBase - blocked);
  state.hp = Math.max(12, state.hp - finalDamage);
  battle.lastTurn = `${describeAction(action, damage)} ${note} 적의 ${battle.enemyIntent.label} ${enemyDamageBase}, 방어 ${blocked}, 실제 피해 ${finalDamage}.`;
  battle.jamCooldown = Math.max(0, battle.jamCooldown - 1);
  battle.enemyIntent = getEnemyIntent(encounter, battle.phase || 1);

  if (state.hp <= 12 && state.inventory['med-kit'] > 0) {
    battle.lastTurn += ' 자동 응급 메드킷을 사용할 타이밍이다.';
  }

  render();
}

function winBattle(encounter, zone) {
  const reward = {
    xp: 24 + zone.difficulty * 9 + (encounter.kind === 'boss' ? 24 : 0),
    credits: 18 + zone.difficulty * 7,
    relics: encounter.kind === 'boss' ? 1 : 0,
  };
  if (encounter.kind === 'boss') {
    state.bossWins += 1;
    state.questProgress.bossWins = state.bossWins;
  }
  award(reward);
  changeZoneState(zone.id, encounter.kind === 'boss' ? 16 : 8, -1);
  maybeDropLoot(zone, encounter.kind === 'boss' ? 1 : 0.65);
  pushLog('교전 승리', `${encounter.name} 정화 완료. ${zone.name}의 신호 상태가 안정됐다.`);
  state.activeEncounter = null;
  state.battle = null;
  checkQuests();
  render();
}

function restAtCurrentZone() {
  if (state.battle) {
    pushLog('휴식 불가', '전투 중에는 휴식할 수 없다.');
    render();
    return;
  }
  const zone = zoneById[state.currentZoneId];
  const factionBonus = state.factionId === 'dorm-council' ? 1 : 0;
  const majorBonus = state.archetypeId === 'energy' ? 1 : 0;
  const bonus = (zone.kind === 'rest' || zone.kind === 'social' ? 2 : 1) + factionBonus + majorBonus;
  state.energy = Math.min(state.maxEnergy, state.energy + bonus);
  state.hp = Math.min(getMaxHp(), state.hp + 12 + bonus * 2);
  if (zone.kind === 'rest' || zone.kind === 'social') {
    state.credits += 4;
    state.questProgress.credits = state.credits;
  }
  changeZoneState(zone.id, 6 + bonus, -1);
  if (Math.random() < 0.22) maybeDropLoot(zone, 1);
  pushLog('휴식', `${zone.name}에서 재정비했다. 에너지 +${bonus}, HP 회복.`);
  checkQuests();
  render();
}

function stabilizeCurrentZone() {
  if (state.battle) {
    pushLog('안정화 불가', '전투 중에는 구역 안정화를 진행할 수 없다.');
    render();
    return;
  }
  const zone = zoneById[state.currentZoneId];
  const zoneState = state.zoneStates[zone.id];
  const cost = zone.difficulty >= 3 ? 2 : 1;
  if (state.energy < cost) {
    pushLog('안정화 실패', `안정화에는 에너지 ${cost}가 필요하다.`);
    render();
    return;
  }
  state.energy -= cost;
  const stats = getDerivedStats();
  const before = zoneState.stability;
  const gain = 10 + zone.difficulty + stats.tech;
  changeZoneState(zone.id, gain, -1);
  const securedNeighborsBefore = getSectorControl(zone.id).securedNeighbors.length;
  getNeighbors(zone.id).forEach((neighborId) => {
    const neighborState = state.zoneStates[neighborId];
    if (neighborState.threat <= 2) changeZoneState(neighborId, 2, 0);
  });
  award({ xp: 10 + zone.difficulty * 4, credits: 8 + stats.intel * 3 });
  maybeDropLoot(zone, before <= 45 ? 0.8 : 0.35);
  const securedNeighborsAfter = getSectorControl(zone.id).securedNeighbors.length;
  pushLog('안정화 완료', `${zone.name}의 안정도가 ${Math.min(100, before + gain)}%까지 회복됐다.${securedNeighborsAfter > securedNeighborsBefore ? ` 인접 안전 섹터 ${securedNeighborsAfter}개가 연결되며 제어망이 강화됐다.` : ' 인접 섹터에도 소규모 안정화 파동을 전파했다.'}`);
  checkQuests();
  render();
}

function rerollQuest() {
  const available = QUEST_POOL.filter((quest) => !state.quests.includes(quest.id));
  if (!available.length) {
    pushLog('재배정 불가', '현재 버전에서 더 배정할 임무가 없다. 나중에 퀘스트 풀을 더 늘리면 된다.');
    render();
    return;
  }
  const replacement = available[(state.level + state.scans) % available.length];
  state.quests[state.quests.length - 1] = replacement.id;
  pushLog('작전 갱신', `${replacement.title} 임무가 새로 들어왔다.`);
  render();
}

function useInventoryItem(itemId) {
  const item = itemById[itemId];
  if (!item || state.inventory[itemId] < 1) {
    pushLog('아이템 없음', '사용 가능한 아이템이 없다.');
    render();
    return;
  }
  if (item.type !== 'consumable') {
    toggleEquip(itemId);
    return;
  }

  state.inventory[itemId] -= 1;
  const hpGain = item.effect.hp || 0;
  const energyGain = item.effect.energy || 0;
  state.hp = Math.min(getMaxHp(), state.hp + hpGain);
  state.energy = Math.min(state.maxEnergy, state.energy + energyGain);
  pushLog('아이템 사용', `${item.name} 사용. HP +${hpGain}, 에너지 +${energyGain}.`);
  render();
}

function toggleEquip(itemId) {
  const item = itemById[itemId];
  if (!item || item.type !== 'gear') return;
  const current = state.equipment[item.slot];
  if (current === itemId) {
    state.equipment[item.slot] = null;
    pushLog('장비 해제', `${item.name} 장착을 해제했다.`);
  } else {
    state.equipment[item.slot] = itemId;
    pushLog('장비 장착', `${item.name} 장착 완료.`);
  }
  state.hp = Math.min(getMaxHp(), state.hp);
  state.questProgress.equippedCount = getEquippedCount();
  checkQuests();
  render();
}

function award({ xp = 0, credits = 0, relics = 0, energy = 0, items = [] }) {
  state.xp += xp;
  state.credits += credits;
  state.relics += relics;
  state.energy = Math.min(state.maxEnergy, state.energy + energy);
  state.questProgress.credits = state.credits;
  state.questProgress.relics = state.relics;
  items.forEach(addItem);

  while (state.xp >= state.xpGoal) {
    state.xp -= state.xpGoal;
    state.level += 1;
    state.xpGoal = Math.floor(state.xpGoal * 1.28);
    state.maxEnergy += 1;
    state.energy = state.maxEnergy;
    state.hp = getMaxHp();
    state.intel.unshift(`레벨 업: ${RANKS[Math.min(RANKS.length - 1, state.level - 1)]} 승급.`);
    if (state.level === 2) state.factionId = 'proto-club';
    if (state.level === 3) state.archetypeId = 'robotics';
  }
}

function checkQuests() {
  const completed = [];
  state.quests.forEach((questId) => {
    const quest = QUEST_POOL.find((item) => item.id === questId);
    if (!quest) return;
    const current = state.questProgress[quest.type] ?? 0;
    if (current >= quest.target) completed.push(questId);
  });

  completed.forEach((questId) => {
    const quest = QUEST_POOL.find((item) => item.id === questId);
    if (!quest) return;
    award(quest.reward);
    pushLog('임무 완료', `${quest.title} 완료. ${renderReward(quest.reward)} 획득.`);
    state.quests = state.quests.filter((id) => id !== questId);
    const replacement = QUEST_POOL.find((item) => !state.quests.includes(item.id) && item.id !== questId);
    if (replacement) state.quests.push(replacement.id);
  });
}

function maybeDropLoot(zone, chance = 0.5) {
  if (Math.random() > chance) return;
  const pool = LOOT_TABLE[zone.kind] || ['battery-pack'];
  const itemId = pool[(state.level + state.scans + zone.difficulty) % pool.length];
  addItem(itemId);
  pushLog('보급 확보', `${itemById[itemId].name}을(를) 확보했다.`);
}

function addItem(itemId) {
  if (!itemById[itemId]) return;
  state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
}

function normalizeZoneStates(existing = {}) {
  const next = {};
  ZONES.forEach((zone, index) => {
    const current = existing[zone.id] || {};
    next[zone.id] = {
      stability: clamp(current.stability ?? 58 + zone.difficulty * 4 - index * 2, 25, 95),
      threat: clamp(current.threat ?? (zone.boss ? 2 : 1), 0, 4),
    };
  });
  return next;
}

function buildZoneGraph() {
  const graph = {};
  ZONES.forEach((zone) => {
    graph[zone.id] = [...new Set([...(ZONE_LINKS[zone.id] || []), ...Object.entries(ZONE_LINKS)
      .filter(([, neighbors]) => neighbors.includes(zone.id))
      .map(([sourceId]) => sourceId)])];
  });
  return graph;
}

function getNeighbors(zoneId) {
  return zoneGraph[zoneId] || [];
}

function getRouteDistance(originZoneId, targetZoneId) {
  const route = getShortestRoute(originZoneId, targetZoneId);
  return route.length ? Math.max(0, route.length - 1) : Infinity;
}

function getShortestRoute(originZoneId, targetZoneId) {
  if (!zoneById[originZoneId] || !zoneById[targetZoneId]) return [];
  if (originZoneId === targetZoneId) return [originZoneId];
  const visited = new Set([originZoneId]);
  const queue = [originZoneId];
  const parentById = {};

  while (queue.length) {
    const currentZoneId = queue.shift();
    const neighbors = getNeighbors(currentZoneId);
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      parentById[neighborId] = currentZoneId;
      if (neighborId === targetZoneId) {
        const route = [targetZoneId];
        let cursor = targetZoneId;
        while (parentById[cursor]) {
          cursor = parentById[cursor];
          route.unshift(cursor);
        }
        return route;
      }
      queue.push(neighborId);
    }
  }

  return [];
}

function getRoutePressure(originZoneId, targetZoneId) {
  const route = getShortestRoute(originZoneId, targetZoneId);
  if (!route.length || route.length === 1) {
    return {
      score: 0,
      hotspots: 0,
      unstableSegments: 0,
      severity: route.length ? 'none' : 'low',
      recommendation: route.length ? '현 위치 유지' : '경로 재계산',
      summary: route.length ? '현재 배치 섹터다.' : '캠퍼스 링크를 다시 맞춰야 한다.',
    };
  }

  let score = 0;
  let hotspots = 0;
  let unstableSegments = 0;
  route.slice(1).forEach((zoneId) => {
    const zoneState = state.zoneStates[zoneId];
    if (!zoneState) return;
    score += zoneState.threat * 2 + Math.max(0, 60 - zoneState.stability) / 12;
    if (zoneState.threat >= 3) hotspots += 1;
    if (zoneState.stability <= 52) unstableSegments += 1;
  });

  const roundedScore = Math.max(1, Math.round(score));
  const severity = roundedScore >= 10 || hotspots >= 2 ? 'high' : roundedScore >= 6 || unstableSegments >= 1 ? 'medium' : 'low';
  const recommendation = severity === 'high'
    ? '안전 축부터 재배치'
    : severity === 'medium'
      ? '중간 거점 경유'
      : '직행 가능';
  const summary = severity === 'high'
    ? '원격 감지는 잡혔지만 바로 돌입하면 교란 누적이 크다. 먼저 중간 거점을 안정화하는 편이 안전하다.'
    : severity === 'medium'
      ? '경로 중간에 흔들리는 구간이 있어, 이동 전 휴식이나 안정화 한 번이 유리하다.'
      : '현재 경로는 비교적 깨끗하다. 스캔 이후 바로 재배치해도 부담이 적다.';

  return {
    score: roundedScore,
    hotspots,
    unstableSegments,
    severity,
    recommendation,
    summary,
  };
}

function getScanLinkIntegrity(originZoneId, targetZoneId) {
  const route = getShortestRoute(originZoneId, targetZoneId);
  if (!route.length || route.length === 1) {
    return {
      score: 100,
      penalty: 0,
      label: '현장 고정',
      severityClass: '',
      degraded: false,
      xpMultiplier: 1,
      intelBonus: 0.06,
      lootBonus: 0.18,
      summary: '현재 섹터 직하 스캔이라 릴레이 손실이 없다.',
    };
  }

  let score = 100;
  let secureSegments = 0;
  let contestedSegments = 0;
  let unstableSegments = 0;

  for (let index = 0; index < route.length - 1; index += 1) {
    const corridor = getCorridorState(route[index], route[index + 1]).state;
    if (corridor === 'secure') {
      score -= 3;
      secureSegments += 1;
    } else if (corridor === 'contested') {
      score -= 11;
      contestedSegments += 1;
    } else {
      score -= 21;
      unstableSegments += 1;
    }
  }

  const finalScore = clamp(Math.round(score), 42, 100);
  const degraded = finalScore <= 72 || unstableSegments > 0;
  const severityClass = finalScore <= 58 ? 'danger' : finalScore <= 74 ? 'warning' : '';
  const label = finalScore <= 58
    ? '불안정'
    : finalScore <= 74
      ? '흔들림'
      : finalScore <= 89
        ? '유지'
        : '선명';
  const summary = unstableSegments > 0
    ? `불안정 회랑 ${unstableSegments}구간이 중계 품질을 깎고 있다. 먼저 중간 축을 안정화하면 원격 판독이 또렷해진다.`
    : contestedSegments > 0
      ? `경계 회랑 ${contestedSegments}구간을 거쳐 약간의 패킷 손실이 남는다. 안전 섹터를 더 확보하면 선명도가 오른다.`
      : `확보 회랑 ${secureSegments}구간을 타고 신호가 비교적 깨끗하게 이어진다.`;

  return {
    score: finalScore,
    penalty: Math.max(0, Math.round((100 - finalScore) * 0.55)),
    label,
    severityClass,
    degraded,
    xpMultiplier: finalScore >= 90 ? 1.12 : finalScore >= 75 ? 1.04 : finalScore >= 60 ? 0.96 : 0.88,
    intelBonus: finalScore >= 90 ? 0.1 : finalScore >= 75 ? 0.04 : finalScore >= 60 ? -0.02 : -0.08,
    lootBonus: finalScore >= 90 ? 0.14 : finalScore >= 75 ? 0.06 : finalScore >= 60 ? 0.02 : -0.04,
    summary,
  };
}


function getScanResolution(originZoneId, targetZoneId) {
  const intendedZone = zoneById[targetZoneId] || zoneById[originZoneId];
  const baseLinkIntegrity = getScanLinkIntegrity(originZoneId, targetZoneId);
  const route = getShortestRoute(originZoneId, targetZoneId);
  const fallbackZoneId = getRelaySlipTarget(originZoneId, targetZoneId, route, baseLinkIntegrity);
  if (!fallbackZoneId || fallbackZoneId === targetZoneId) {
    return {
      mode: targetZoneId !== originZoneId && baseLinkIntegrity.degraded ? 'degraded' : 'direct',
      intendedZone,
      finalZone: intendedZone,
      fallbackZone: null,
      linkIntegrity: baseLinkIntegrity,
      legend: targetZoneId !== originZoneId && baseLinkIntegrity.degraded ? '중계 흔들림' : '직결 유지',
    };
  }

  const fallbackZone = zoneById[fallbackZoneId];
  const fallbackLinkIntegrity = getScanLinkIntegrity(originZoneId, fallbackZoneId);
  return {
    mode: 'slip',
    intendedZone,
    finalZone: fallbackZone,
    fallbackZone,
    linkIntegrity: fallbackLinkIntegrity,
    legend: `중계 이탈 · ${fallbackZone.name}`,
  };
}

function getRelaySlipTarget(originZoneId, targetZoneId, route = getShortestRoute(originZoneId, targetZoneId), linkIntegrity = getScanLinkIntegrity(originZoneId, targetZoneId)) {
  if (!route.length || route.length <= 2 || targetZoneId === originZoneId) return null;
  if (linkIntegrity.score > 58) return null;

  for (let index = 1; index < route.length; index += 1) {
    const zoneId = route[index];
    const corridorState = getCorridorState(route[index - 1], zoneId).state;
    const zoneState = state.zoneStates[zoneId];
    if (corridorState === 'unstable' || zoneState.threat >= 3 || zoneState.stability <= 48) {
      return zoneId;
    }
  }

  return route[Math.max(1, route.length - 2)] || null;
}

function getPreferredScanTarget(originZoneId, candidateZoneId) {
  return null;
}

function getRemoteRelayGate(originZoneId, targetZoneId) {
  if (!targetZoneId || targetZoneId === originZoneId) {
    return {
      blocked: false,
      relayZone: null,
      label: '현장 고정',
      reasonLabel: '안정',
    };
  }

  const route = getShortestRoute(originZoneId, targetZoneId);
  if (!route.length || route.length <= 2) {
    return {
      blocked: false,
      relayZone: null,
      label: '직결 유지',
      reasonLabel: '안정',
    };
  }

  const relayZone = zoneById[route[1]];
  const relayState = state.zoneStates[relayZone.id];
  const corridor = getCorridorState(originZoneId, relayZone.id).state;
  const relayControl = getSectorControl(relayZone.id);
  const blocked = !relayControl.controlled && (corridor === 'unstable' || relayState.threat >= 3 || relayState.stability <= 48);
  const reasonLabel = corridor === 'unstable'
    ? '교란 회랑'
    : relayState.threat >= 3
      ? '위협 급증'
      : relayState.stability <= 48
        ? '안정도 붕괴'
        : '안정';
  const label = blocked ? '폐색' : corridor === 'contested' ? '주의 통과' : '직결 유지';

  return {
    blocked,
    relayZone,
    corridor,
    label,
    reasonLabel,
  };
}

function buildScanTrace(originZoneId, targetZoneId) {
  const originZone = zoneById[originZoneId];
  const targetZone = zoneById[targetZoneId];
  if (!originZone || !targetZone || originZoneId === targetZoneId) return null;
  const origin = L.latLng(originZone.coords);
  const target = L.latLng(targetZone.coords);
  const angle = Math.atan2(target.lng - origin.lng, target.lat - origin.lat);
  const span = Math.PI / 11;
  const distance = map.distance(origin, target);
  const near = Math.max(42, distance * 0.18);
  const far = Math.max(100, distance * 0.92);

  const projectPoint = (base, meters, heading) => {
    const latMeters = 111320;
    const lngMeters = 111320 * Math.cos((base.lat * Math.PI) / 180);
    return [
      base.lat + (Math.cos(heading) * meters) / latMeters,
      base.lng + (Math.sin(heading) * meters) / lngMeters,
    ];
  };

  return [
    originZone.coords,
    projectPoint(origin, near, angle - span),
    projectPoint(origin, far, angle),
    projectPoint(origin, near, angle + span),
  ];
}

function getScanCoverage(originZoneId) {
  const adjacent = getNeighbors(originZoneId);
  const control = getSectorControl(originZoneId);
  const range = 1;
  const covered = [...new Set([originZoneId, ...adjacent])];
  const blindSpots = getScanBlindSpots(originZoneId, { adjacent, covered });
  const blocked = blindSpots.map(({ zoneId }) => zoneId);
  const available = covered.filter((zoneId) => !blocked.includes(zoneId));
  const rawInterference = adjacent.reduce((total, zoneId) => total + Math.max(0, state.zoneStates[zoneId].threat - 1), 0);
  const interference = Math.max(0, rawInterference - control.interferenceReduction);
  return {
    range,
    adjacent,
    covered,
    blocked,
    available,
    blindSpots,
    interference,
  };
}

function getScanBlindSpots(originZoneId, coverage) {
  const blockedByZone = new Map();

  coverage.adjacent.forEach((neighborId) => {
    const neighborState = state.zoneStates[neighborId];
    const corridor = getCorridorState(originZoneId, neighborId).state;
    const neighborControl = getSectorControl(neighborId);
    const shadowed = !neighborControl.controlled && (corridor === 'unstable' || neighborState.threat >= 3 || neighborState.stability <= 46);
    if (!shadowed) return;

    coverage.covered.forEach((targetZoneId) => {
      if (targetZoneId === originZoneId || targetZoneId === neighborId) return;
      const route = getShortestRoute(originZoneId, targetZoneId);
      if (route.length < 3 || route[1] !== neighborId) return;

      const severity = corridor === 'unstable' || neighborState.threat >= 3 ? 'high' : 'medium';
      const reasonLabel = corridor === 'unstable'
        ? '교란 그림자'
        : neighborState.threat >= 3
          ? '위협 그림자'
          : '붕괴 그림자';
      const existing = blockedByZone.get(targetZoneId);
      if (!existing || (existing.severity !== 'high' && severity === 'high')) {
        blockedByZone.set(targetZoneId, {
          zoneId: targetZoneId,
          zone: zoneById[targetZoneId],
          sourceZone: zoneById[neighborId],
          severity,
          reasonLabel,
        });
      }
    });
  });

  return [...blockedByZone.values()]
    .filter((entry) => entry.zone && entry.sourceZone)
    .sort((left, right) => getRouteDistance(originZoneId, left.zoneId) - getRouteDistance(originZoneId, right.zoneId));
}

function getScanInterferenceSources(originZoneId) {
  const control = getSectorControl(originZoneId);
  const sources = getNeighbors(originZoneId)
    .map((zoneId) => ({
      zone: zoneById[zoneId],
      penalty: Math.max(0, state.zoneStates[zoneId].threat - 1),
    }))
    .filter(({ zone, penalty }) => zone && penalty > 0)
    .sort((left, right) => right.penalty - left.penalty || left.zone.name.localeCompare(right.zone.name, 'ko'));

  let reductionLeft = control.interferenceReduction;
  return sources.map((source) => {
    const mitigated = Math.min(reductionLeft, source.penalty);
    reductionLeft = Math.max(0, reductionLeft - mitigated);
    return {
      ...source,
      mitigated,
      effectivePenalty: Math.max(0, source.penalty - mitigated),
    };
  }).filter((source) => source.effectivePenalty > 0);
}

function getRedeployScanForecast(originZoneId, destinationZoneId) {
  const originCoverage = getScanCoverage(originZoneId);
  const destinationCoverage = getScanCoverage(destinationZoneId);
  const gained = destinationCoverage.covered.filter((zoneId) => zoneId !== destinationZoneId && !originCoverage.covered.includes(zoneId));
  const lost = originCoverage.covered.filter((zoneId) => zoneId !== originZoneId && !destinationCoverage.covered.includes(zoneId));
  const summary = originZoneId === destinationZoneId
    ? `현재 감시 반경 ${destinationCoverage.range}링`
    : gained.length
      ? `신규 ${gained.length}개 섹터 포착`
      : '새 스캔 이득 없음';
  const detail = originZoneId === destinationZoneId
    ? `현재 궤도에서 인접 ${destinationCoverage.adjacent.length}개와 총 ${Math.max(0, destinationCoverage.covered.length - 1)}개 섹터를 직접 감시 중이다.`
    : gained.length && lost.length
      ? `${zoneById[destinationZoneId].name}로 이동하면 ${gained.slice(0, 3).map((zoneId) => zoneById[zoneId].name).join(', ')} 쪽 시야가 새로 열리고, 대신 ${lost.slice(0, 2).map((zoneId) => zoneById[zoneId].name).join(', ')} 축은 멀어진다.`
      : gained.length
        ? `${zoneById[destinationZoneId].name}로 이동하면 ${gained.slice(0, 3).map((zoneId) => zoneById[zoneId].name).join(', ')} 쪽 시야가 새로 열린다.`
        : lost.length
          ? `이동해도 신규 섹터는 늘지 않지만 ${lost.slice(0, 2).map((zoneId) => zoneById[zoneId].name).join(', ')} 축은 현재 위치보다 멀어진다.`
          : '현재 위치와 거의 같은 스캔 권역을 유지한다.';
  return {
    originCoverage,
    destinationCoverage,
    gained,
    lost,
    summary,
    detail,
  };
}

function getSectorControl(zoneId) {
  const zoneState = state.zoneStates[zoneId];
  const neighbors = getNeighbors(zoneId);
  const localAnchor = Boolean(zoneState && zoneState.stability >= 68 && zoneState.threat <= 1);
  const securedNeighbors = neighbors.filter((neighborId) => {
    const neighborState = state.zoneStates[neighborId];
    return neighborState.stability >= 68 && neighborState.threat <= 1;
  });
  const controlled = localAnchor || securedNeighbors.length >= 2;
  return {
    localAnchor,
    controlled,
    securedNeighbors,
    rangeBonus: controlled && securedNeighbors.length >= 2 ? 1 : 0,
    interferenceReduction: controlled ? Math.min(2, Math.max(1, securedNeighbors.length)) : 0,
    surgeReduction: controlled ? Math.min(18, 6 + securedNeighbors.length * 4 + (localAnchor ? 4 : 0)) : 0,
  };
}

function getThreatSpillPreview(zoneId) {
  const zone = zoneById[zoneId];
  const zoneState = state.zoneStates[zoneId];
  if (!zone || !zoneState) {
    return {
      active: false,
      severity: 'quiet',
      spillPower: 0,
      pressured: [],
      summary: '압박 데이터 없음.',
    };
  }

  const neighbors = getNeighbors(zoneId);
  const spillPower = Math.max(0, zoneState.threat - 1) + Math.max(0, 58 - zoneState.stability) / 16;
  const pressured = neighbors
    .map((neighborId) => {
      const neighborZone = zoneById[neighborId];
      const neighborState = state.zoneStates[neighborId];
      const corridor = getCorridorState(zoneId, neighborId).state;
      const control = getSectorControl(neighborId);
      const risk = spillPower + (corridor === 'unstable' ? 1.35 : corridor === 'contested' ? 0.75 : 0.25) - (control.controlled ? 0.7 : 0) + Math.max(0, 62 - neighborState.stability) / 28;
      const severity = risk >= 3.6 ? 'high' : risk >= 2.2 ? 'medium' : risk >= 1.2 ? 'low' : 'quiet';
      return {
        zone: neighborZone,
        corridor,
        control,
        risk: Math.max(0.6, Number(risk.toFixed(1))),
        severity,
        label: severity === 'high' ? '직격 압박' : severity === 'medium' ? '번짐 경계' : severity === 'low' ? '약한 흔들림' : '정온',
      };
    })
    .filter((entry) => entry.zone)
    .sort((left, right) => right.risk - left.risk || left.zone.name.localeCompare(right.zone.name, 'ko'));

  const activePressures = pressured.filter((entry) => entry.severity !== 'quiet');
  const severity = activePressures[0]?.severity || 'quiet';
  const summary = !activePressures.length
    ? `${zone.name} 인접 회랑은 아직 조용하다.`
    : `${zone.name} 위협이 ${activePressures.slice(0, 2).map((entry) => `${entry.zone.name} ${entry.label}`).join(', ')} 쪽으로 번지고 있다.`;

  return {
    active: activePressures.length > 0,
    severity,
    spillPower: Number(spillPower.toFixed(1)),
    pressured,
    activePressures,
    summary,
  };
}

function renderRouteLines() {
  const drawnEdges = new Set();
  Object.entries(zoneGraph).forEach(([zoneId, neighbors]) => {
    neighbors.forEach((neighborId) => {
      const edgeKey = [zoneId, neighborId].sort().join(':');
      if (drawnEdges.has(edgeKey)) return;
      drawnEdges.add(edgeKey);
      const polyline = L.polyline([zoneById[zoneId].coords, zoneById[neighborId].coords], {
        ...getRouteLineVisual(zoneId, neighborId),
        lineCap: 'round',
      }).addTo(map);
      routeLines.push({ edgeKey, polyline });
    });
  });
}

function renderSpatialOverlay() {
  clearSpatialOverlay();
  const originZone = zoneById[state.currentZoneId];
  if (!originZone) return;

  const coverage = getScanCoverage(state.currentZoneId);
  const control = getSectorControl(state.currentZoneId);
  const rings = buildCoverageRings(state.currentZoneId, coverage);

  if (focusedZoneId && focusedZoneId !== state.currentZoneId) {
    renderRedeployFrontierOverlay(state.currentZoneId, focusedZoneId);
  }

  rings.forEach((ring) => {
    const circle = L.circle(originZone.coords, {
      radius: ring.radius,
      className: `scan-radius-ring ring-${ring.level}`,
      color: ring.color,
      weight: ring.weight,
      opacity: ring.opacity,
      fillColor: ring.fillColor,
      fillOpacity: ring.fillOpacity,
      dashArray: ring.dashArray,
      interactive: false,
      pane: 'overlayPane',
    }).addTo(map);
    scanRadiusLayers.push(circle);
  });

  coverage.adjacent.forEach((neighborId) => {
    const neighborZone = zoneById[neighborId];
    if (!neighborZone) return;
    const neighborControl = getSectorControl(neighborId);
    const secured = control.securedNeighbors.includes(neighborId) || (control.localAnchor && neighborControl.controlled);
    const link = L.polyline([originZone.coords, neighborZone.coords], {
      className: `scan-link ${secured ? 'secured' : 'reachable'}`,
      color: secured ? '#7ef7cf' : '#61d5ff',
      weight: secured ? 4.2 : 3.2,
      opacity: secured ? 0.7 : 0.42,
      dashArray: secured ? '2 8' : '8 12',
      interactive: false,
      pane: 'overlayPane',
    }).addTo(map);
    scanLinkLayers.push(link);
  });

  renderScanInterferenceOverlay(state.currentZoneId);
  renderCoverageBadges(state.currentZoneId, coverage);

  renderThreatOverlay();
}

function renderScanInterferenceOverlay(originZoneId) {
  const originZone = zoneById[originZoneId];
  if (!originZone) return;

  getScanInterferenceSources(originZoneId).forEach(({ zone, effectivePenalty, penalty }) => {
    const line = L.polyline([zone.coords, originZone.coords], {
      className: 'scan-interference-line',
      color: '#ff9c54',
      weight: 3.2 + Math.min(1.8, effectivePenalty * 0.5),
      opacity: 0.62,
      dashArray: '5 10',
      interactive: false,
      pane: 'overlayPane',
    }).addTo(map);

    const beacon = L.marker(zone.coords, {
      icon: L.divIcon({
        className: 'scan-interference-beacon',
        html: `<div class="scan-interference-beacon-core"><span>스캔 노이즈</span><strong>+${effectivePenalty}</strong><em>${getOrbitNodeShortLabel(zone.name).replace(/\n/g, '<br>')}</em></div>`,
        iconSize: [92, 58],
        iconAnchor: [46, 64],
      }),
      interactive: false,
      pane: 'markerPane',
    }).addTo(map);

    threatOverlayLayers.push(line, beacon);
  });
}

function renderThreatOverlay() {
  const hotZones = ZONES.filter((zone) => {
    const zoneState = state.zoneStates[zone.id];
    return zoneState.threat >= 2 || state.activeEncounter?.zoneId === zone.id;
  });

  hotZones.forEach((zone) => {
    const zoneState = state.zoneStates[zone.id];
    const isEncounterZone = state.activeEncounter?.zoneId === zone.id;
    const intensity = Math.min(1, 0.3 + zoneState.threat * 0.16 + (isEncounterZone ? 0.24 : 0));
    const ring = L.circle(zone.coords, {
      radius: 36 + zoneState.threat * 10 + (isEncounterZone ? 18 : 0),
      className: `hostile-ring ${isEncounterZone ? 'engaged' : 'ambient'}`,
      color: isEncounterZone ? '#ff5e5e' : '#ff9c54',
      weight: isEncounterZone ? 2.8 : 2.2,
      opacity: 0.9,
      fillColor: isEncounterZone ? '#ff5e5e' : '#ff9c54',
      fillOpacity: 0.08 + intensity * 0.08,
      dashArray: isEncounterZone ? '4 10' : '2 12',
      interactive: false,
      pane: 'overlayPane',
    }).addTo(map);

    const pulse = L.marker(zone.coords, {
      icon: L.divIcon({
        className: `hostile-presence ${isEncounterZone ? 'engaged' : 'ambient'}`,
        html: `<div class="hostile-presence-core"><span>${isEncounterZone ? '적 출현' : `위협 ${zoneState.threat}`}</span><strong>${isEncounterZone ? state.activeEncounter.name : zone.name}</strong></div>`,
        iconSize: [118, 54],
        iconAnchor: [59, 27],
      }),
      interactive: false,
      pane: 'markerPane',
    }).addTo(map);

    threatOverlayLayers.push(ring, pulse);

    const spill = getThreatSpillPreview(zone.id);
    spill.activePressures.slice(0, 2).forEach((entry) => {
      const line = L.polyline([zone.coords, entry.zone.coords], {
        className: `threat-spill-line ${entry.severity}`,
        color: entry.severity === 'high' ? '#ff7c7c' : entry.severity === 'medium' ? '#ffb86b' : '#ffd166',
        weight: entry.severity === 'high' ? 3.8 : 3,
        opacity: entry.severity === 'high' ? 0.72 : 0.54,
        dashArray: entry.severity === 'high' ? '10 10' : '5 12',
        interactive: false,
        pane: 'overlayPane',
      }).addTo(map);

      const beacon = L.marker(entry.zone.coords, {
        icon: L.divIcon({
          className: `threat-spill-beacon ${entry.severity}`,
          html: `<div class="threat-spill-beacon-core"><span>압박 유입</span><strong>${getOrbitNodeShortLabel(entry.zone.name).replace(/\n/g, '<br>')}</strong><em>${entry.label}</em></div>`,
          iconSize: [100, 60],
          iconAnchor: [50, 64],
        }),
        interactive: false,
        pane: 'markerPane',
      }).addTo(map);

      threatOverlayLayers.push(line, beacon);
    });
  });

  if (state.activeEncounter) {
    const encounterZone = zoneById[state.activeEncounter.zoneId];
    if (encounterZone) {
      const strikeLine = L.polyline([zoneById[state.currentZoneId].coords, encounterZone.coords], {
        className: 'hostile-strike-line',
        color: '#ff5e5e',
        weight: 3.2,
        opacity: 0.8,
        dashArray: '7 9',
        interactive: false,
        pane: 'overlayPane',
      }).addTo(map);
      threatOverlayLayers.push(strikeLine);
    }
  }
}

function clearSpatialOverlay() {
  scanRadiusLayers.forEach((layer) => map.removeLayer(layer));
  scanLinkLayers.forEach((layer) => map.removeLayer(layer));
  scanTraceLayers.forEach((layer) => map.removeLayer(layer));
  scanSlipLayers.forEach((layer) => map.removeLayer(layer));
  redeployPreviewLayers.forEach((layer) => map.removeLayer(layer));
  coverageBadgeLayers.forEach((layer) => map.removeLayer(layer));
  threatOverlayLayers.forEach((layer) => map.removeLayer(layer));
  scanRadiusLayers.length = 0;
  scanLinkLayers.length = 0;
  scanTraceLayers.length = 0;
  scanSlipLayers.length = 0;
  redeployPreviewLayers.length = 0;
  coverageBadgeLayers.length = 0;
  threatOverlayLayers.length = 0;
}

function renderRedeployFrontierOverlay(originZoneId, destinationZoneId) {
  const originZone = zoneById[originZoneId];
  const destinationZone = zoneById[destinationZoneId];
  if (!originZone || !destinationZone || originZoneId === destinationZoneId) return;

  const forecast = getRedeployScanForecast(originZoneId, destinationZoneId);
  const anchor = L.circle(destinationZone.coords, {
    radius: 54,
    className: 'redeploy-preview-anchor',
    color: '#61d5ff',
    weight: 1.8,
    opacity: 0.78,
    fillColor: '#61d5ff',
    fillOpacity: 0.08,
    dashArray: '2 10',
    interactive: false,
    pane: 'overlayPane',
  }).addTo(map);
  redeployPreviewLayers.push(anchor);

  forecast.gained.slice(0, 4).forEach((zoneId) => {
    const targetZone = zoneById[zoneId];
    if (!targetZone) return;
    const line = L.polyline([destinationZone.coords, targetZone.coords], {
      className: 'redeploy-preview-line gain',
      color: '#7ef7cf',
      weight: 3,
      opacity: 0.72,
      dashArray: '4 10',
      interactive: false,
      pane: 'overlayPane',
    }).addTo(map);
    const marker = L.marker(targetZone.coords, {
      icon: L.divIcon({
        className: 'redeploy-preview-badge gain',
        html: '<div class="redeploy-preview-badge-core"><span>신규</span></div>',
        iconSize: [46, 22],
        iconAnchor: [23, 11],
      }),
      interactive: false,
      pane: 'markerPane',
    }).addTo(map);
    redeployPreviewLayers.push(line, marker);
  });

  forecast.lost.slice(0, 3).forEach((zoneId) => {
    const targetZone = zoneById[zoneId];
    if (!targetZone) return;
    const line = L.polyline([originZone.coords, targetZone.coords], {
      className: 'redeploy-preview-line loss',
      color: '#ff9c8e',
      weight: 2.2,
      opacity: 0.34,
      dashArray: '2 11',
      interactive: false,
      pane: 'overlayPane',
    }).addTo(map);
    const marker = L.marker(targetZone.coords, {
      icon: L.divIcon({
        className: 'redeploy-preview-badge loss',
        html: '<div class="redeploy-preview-badge-core"><span>이탈</span></div>',
        iconSize: [46, 22],
        iconAnchor: [23, 11],
      }),
      interactive: false,
      pane: 'markerPane',
    }).addTo(map);
    redeployPreviewLayers.push(line, marker);
  });
}

function renderSlipRiskOverlay(originZoneId, targetedZoneId, scanResolution) {
  const route = getShortestRoute(originZoneId, targetedZoneId);
  const fallbackId = scanResolution.fallbackZone?.id;
  const fallbackIndex = route.indexOf(fallbackId);
  if (fallbackIndex <= 0) return;

  const segmentStartId = route[fallbackIndex - 1];
  const segmentEndId = route[fallbackIndex];
  const segmentStart = zoneById[segmentStartId];
  const segmentEnd = zoneById[segmentEndId];
  if (!segmentStart || !segmentEnd) return;

  const unstableSegment = L.polyline([segmentStart.coords, segmentEnd.coords], {
    className: 'scan-slip-segment',
    color: '#ff7c7c',
    weight: 6,
    opacity: 0.92,
    dashArray: '4 12',
    lineCap: 'round',
    interactive: false,
    pane: 'overlayPane',
  }).addTo(map);
  scanSlipLayers.push(unstableSegment);

  const fallbackBeacon = L.marker(segmentEnd.coords, {
    icon: L.divIcon({
      className: 'scan-slip-beacon',
      html: `<div class="scan-slip-beacon-core"><span>중계 이탈</span><strong>${getOrbitNodeShortLabel(scanResolution.fallbackZone.name).replace(/\n/g, '<br>')}</strong></div>`,
      iconSize: [108, 60],
      iconAnchor: [54, 30],
    }),
    interactive: false,
    pane: 'markerPane',
  }).addTo(map);
  scanSlipLayers.push(fallbackBeacon);

  const continuedTrace = L.polyline([segmentEnd.coords, zoneById[targetedZoneId].coords], {
    className: 'scan-slip-ghost-line',
    color: '#ffd166',
    weight: 2.2,
    opacity: 0.38,
    dashArray: '3 14',
    interactive: false,
    pane: 'overlayPane',
  }).addTo(map);
  scanSlipLayers.push(continuedTrace);
}

function renderCoverageBadges(originZoneId, coverage) {
  const blindSpotByZoneId = Object.fromEntries(coverage.blindSpots.map((entry) => [entry.zoneId, entry]));
  const coveredZoneIds = coverage.covered.filter((zoneId) => zoneId !== originZoneId);

  coveredZoneIds.forEach((zoneId) => {
    const zone = zoneById[zoneId];
    if (!zone) return;
    const ringLevel = getCoverageRingLevel(originZoneId, zoneId, coverage);
    const routeHops = getRouteDistance(originZoneId, zoneId);
    const relayGate = routeHops > 1 ? getRemoteRelayGate(originZoneId, zoneId) : { blocked: false };
    const linkIntegrity = routeHops > 1 ? getScanLinkIntegrity(originZoneId, zoneId) : null;
    const blindSpot = blindSpotByZoneId[zoneId];
    const badgeTone = blindSpot
      ? 'shadow'
      : relayGate.blocked
        ? 'blocked'
        : ringLevel === 1
            ? 'near'
            : linkIntegrity?.severityClass || 'remote';
    const badgeLabel = blindSpot
      ? '음영'
      : relayGate.blocked
        ? '차단'
        : `${ringLevel}링`;
    const badgeMeta = blindSpot
      ? getOrbitNodeShortLabel(blindSpot.sourceZone.name)
      : relayGate.blocked
        ? relayGate.relayZone ? getOrbitNodeShortLabel(relayGate.relayZone.name) : '차단'
        : routeHops > 1
          ? linkIntegrity.label
          : '근접';

    const badge = L.marker(zone.coords, {
      icon: L.divIcon({
        className: `coverage-badge-marker ${badgeTone}`,
        html: `
          <button
            class="coverage-badge ${badgeTone}"
            type="button"
            data-zone-badge="${zoneId}"
            aria-label="${zone.name} ${blindSpot ? `${blindSpot.sourceZone.name} 뒤 스캔 음영` : relayGate.blocked ? '원격 차단' : `${ringLevel}링 스캔 범위`}"
          >
            <span>${badgeLabel}</span>
            <strong>${badgeMeta.replace(/\n/g, '<br>')}</strong>
          </button>
        `,
        iconSize: [62, 42],
        iconAnchor: [31, 52],
      }),
      keyboard: false,
      bubblingMouseEvents: false,
      interactive: true,
      pane: 'markerPane',
    }).addTo(map);

    badge.on('click', () => {
      focusZone(zoneId, { openPopup: true, source: 'coverage-badge' });
    });

    coverageBadgeLayers.push(badge);
  });
}

function getCoverageRingLevel(originZoneId, zoneId, coverage = getScanCoverage(originZoneId)) {
  if (coverage.adjacent.includes(zoneId)) return 1;
  return Math.max(2, Math.min(coverage.range, getRouteDistance(originZoneId, zoneId)));
}

function buildCoverageRings(originZoneId, coverage) {
  const originZone = zoneById[originZoneId];
  const firstRing = coverage.adjacent;
  const secondRing = coverage.covered.filter((zoneId) => zoneId !== originZoneId && !firstRing.includes(zoneId));
  const thirdRing = coverage.range > 2
    ? secondRing.filter((zoneId) => getRouteDistance(originZoneId, zoneId) >= 3)
    : [];
  const ringDefs = [
    { level: 1, zoneIds: firstRing, color: '#61d5ff', fillColor: '#61d5ff', weight: 1.6, opacity: 0.42, fillOpacity: 0.04, dashArray: '4 12' },
    { level: 2, zoneIds: secondRing.filter((zoneId) => !thirdRing.includes(zoneId)), color: '#9dff8f', fillColor: '#9dff8f', weight: 1.4, opacity: 0.34, fillOpacity: 0.028, dashArray: '3 10' },
    { level: 3, zoneIds: thirdRing, color: '#ffd166', fillColor: '#ffd166', weight: 1.2, opacity: 0.28, fillOpacity: 0.02, dashArray: '2 12' },
  ];

  return ringDefs
    .filter((ring) => ring.zoneIds.length)
    .map((ring) => ({
      ...ring,
      radius: getRingRadius(originZone, ring.zoneIds),
    }));
}

function getRingRadius(originZone, zoneIds) {
  const distances = zoneIds
    .map((zoneId) => zoneById[zoneId])
    .filter(Boolean)
    .map((zone) => map.distance(originZone.coords, zone.coords));
  const maxDistance = distances.length ? Math.max(...distances) : 120;
  return Math.max(120, Math.round(maxDistance + 38));
}

function highlightRouteLines() {
  const activeZoneId = focusedZoneId || state.currentZoneId;
  const activeNeighbors = new Set(getNeighbors(activeZoneId));
  routeLines.forEach(({ edgeKey, polyline }) => {
    const [fromId, toId] = edgeKey.split(':');
    const touchesActiveRoute = fromId === activeZoneId || toId === activeZoneId || (activeNeighbors.has(fromId) && activeNeighbors.has(toId));
    polyline.setStyle(getRouteLineVisual(fromId, toId, { emphasized: touchesActiveRoute }));
  });
}

function getRouteLineVisual(fromId, toId, { emphasized = false } = {}) {
  const corridor = getCorridorState(fromId, toId);
  const base = {
    secure: { color: '#7ef7cf', weight: 4.6, opacity: 0.34, dashArray: '2 10' },
    contested: { color: '#ffd166', weight: 4.2, opacity: 0.24, dashArray: '10 10' },
    unstable: { color: '#ff7c7c', weight: 4.6, opacity: 0.26, dashArray: '5 12' },
  }[corridor.state];

  return {
    color: base.color,
    weight: base.weight + (emphasized ? 1.1 : 0),
    opacity: Math.min(0.78, base.opacity + (emphasized ? 0.24 : 0)),
    dashArray: corridor.state === 'secure' && emphasized ? '2 8' : base.dashArray,
  };
}

function getCorridorState(fromId, toId) {
  const fromState = state.zoneStates[fromId];
  const toState = state.zoneStates[toId];
  const fromControl = getSectorControl(fromId);
  const toControl = getSectorControl(toId);
  const bothControlled = fromControl.controlled && toControl.controlled;
  const riskScore = [fromState, toState].reduce(
    (total, zoneState) => total + (zoneState.threat >= 3 ? 2 : zoneState.threat >= 2 ? 1 : 0) + (zoneState.stability <= 45 ? 1 : 0),
    0,
  );

  if (bothControlled && riskScore <= 1) {
    return { state: 'secure' };
  }
  if (riskScore >= 3 || fromState.threat >= 3 || toState.threat >= 3) {
    return { state: 'unstable' };
  }
  return { state: 'contested' };
}

function changeZoneState(zoneId, stabilityDelta = 0, threatDelta = 0) {
  const zoneState = state.zoneStates[zoneId];
  if (!zoneState) return;
  zoneState.stability = clamp(zoneState.stability + stabilityDelta, 0, 100);
  zoneState.threat = clamp(zoneState.threat + threatDelta, 0, 4);
}

function getEnemyIntent(encounter, phase = 1) {
  const signature = encounter.kind === 'boss' ? BOSS_SIGNATURES[encounter.zoneId] : null;
  const patterns = signature
    ? [
        { label: signature.intentLabels?.[Math.min(phase - 1, 1)] || '시그니처 파동', min: phase === 2 ? 13 : 10, variance: phase === 2 ? 8 : 6 },
        { label: phase === 2 ? '가속 추적' : '패턴 잠금', min: phase === 2 ? 11 : 8, variance: 6 },
      ]
    : [
        { label: '강공', min: 8, variance: 8 },
        { label: '집속 포화', min: 10, variance: 6 },
        { label: '교란 파동', min: 7, variance: 5 },
      ];
  const intent = patterns[(state.scans + encounter.power + state.level + phase) % patterns.length];
  return {
    label: intent.label,
    damage: Math.max(intent.min, Math.floor(encounter.power / 5) + intent.min + Math.floor(Math.random() * intent.variance) - 4 + (signature && phase === 2 ? 3 : 0)),
  };
}

function getProjectedIncomingDamage(intent, guard = 0) {
  return Math.max(0, intent.damage - guard);
}

function getIntentSeverityLabel(intent) {
  if (intent.damage >= 24) return '치명';
  if (intent.damage >= 17) return '고위험';
  if (intent.damage >= 11) return '경계';
  return '안정';
}

function getIntentToneClass(intent) {
  if (intent.damage >= 24) return 'intent-critical';
  if (intent.damage >= 17) return 'intent-high';
  if (intent.damage >= 11) return 'intent-medium';
  return 'intent-low';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getEquippedCount() {
  return Object.values(state.equipment).filter(Boolean).length;
}

function getDerivedStats() {
  const stats = { attack: 0, shield: 0, tech: 0, crit: 0.05, scanBoost: 0, scout: 0, intel: 0 };
  Object.values(state.equipment).forEach((itemId) => {
    const item = itemById[itemId];
    if (!item?.stats) return;
    Object.entries(item.stats).forEach(([key, value]) => {
      stats[key] = (stats[key] || 0) + value;
    });
  });
  if (state.archetypeId === 'robotics') {
    stats.attack += 3;
    stats.shield += 2;
  }
  return stats;
}

function getMaxHp() {
  const gearHp = Object.values(state.equipment).reduce((total, itemId) => total + (itemById[itemId]?.stats?.maxHp || 0), 0);
  return state.baseMaxHp + gearHp;
}

function renderZonePopup(zone) {
  const zoneState = state.zoneStates[zone.id];
  const neighbors = getNeighbors(zone.id).map((zoneId) => zoneById[zoneId].name).join(' · ');
  const relay = getScanLinkIntegrity(state.currentZoneId, zone.id);
  const relayGate = getRemoteRelayGate(state.currentZoneId, zone.id);
  const frontierForecast = getRedeployScanForecast(state.currentZoneId, zone.id);
  const interferenceSources = zone.id === state.currentZoneId ? getScanInterferenceSources(zone.id) : [];
  const threatSpill = getThreatSpillPreview(zone.id);
  return `
    <div class="zone-popup">
      <span class="tag">${zone.kind.toUpperCase()}</span>
      <h3>${zone.name}</h3>
      <p>${zone.story}</p>
      <p>${zone.landmark}</p>
      <p>난도 ${zone.difficulty} · 안정도 ${zoneState.stability}% · 위협 ${zoneState.threat}${zone.boss ? ' · 보스 가능' : ''}</p>
      <p>인접 섹터: ${neighbors || '없음'}</p>
      <p>현재 축 릴레이: ${relay.label} · ${relay.score}%</p>
      ${interferenceSources.length ? `<p>광역 스캔 노이즈: ${interferenceSources.slice(0, 2).map(({ zone, effectivePenalty }) => `${zone.name} +${effectivePenalty}`).join(' · ')}</p>` : ''}
      <p>재배치 프론티어: ${frontierForecast.summary}</p>
      <p>${frontierForecast.detail}</p>
      ${getScanCoverage(state.currentZoneId).blindSpots.some((entry) => entry.zoneId === zone.id) ? `<p>현장 스캔 음영: ${getScanCoverage(state.currentZoneId).blindSpots.find((entry) => entry.zoneId === zone.id).sourceZone.name} 뒤에 가려져 광역 스캔이 직접 닿지 않는다.</p>` : ''}
      <p>위협 번짐: ${threatSpill.active ? threatSpill.activePressures.slice(0, 2).map((entry) => `${entry.zone.name} ${entry.label}`).join(' · ') : '즉시 압박 없음'}</p>
      ${relayGate.blocked ? `<p>원격 정조준 차단: 첫 릴레이 ${relayGate.relayZone.name} · ${relayGate.reasonLabel}</p>` : ''}
    </div>`;
}

function pushLog(tag, text) {
  state.logs.unshift({ tag, text });
  state.logs = state.logs.slice(0, 8);
}

function renderReward(reward) {
  const parts = [];
  if (reward.xp) parts.push(`XP ${reward.xp}`);
  if (reward.credits) parts.push(`₵ ${reward.credits}`);
  if (reward.relics) parts.push(`유물 ${reward.relics}`);
  if (reward.energy) parts.push(`에너지 ${reward.energy}`);
  if (reward.items?.length) parts.push(reward.items.map((id) => itemById[id]?.name).filter(Boolean).join(', '));
  return parts.join(' · ');
}

function describeAction(action, damage) {
  if (action === 'strike') return `기본 공격으로 ${damage} 피해.`;
  if (action === 'analyze') return `분석 스킬로 ${damage} 피해.`;
  if (action === 'guard') return `보호막 타격으로 ${damage} 피해.`;
  if (action === 'burst') return `오비트 버스트로 ${damage} 피해.`;
  if (action === 'jam') return `재밍 필드로 ${damage} 피해.`;
  return `${damage} 피해.`;
}

function setupPwaShell() {
  if (!('serviceWorker' in navigator)) {
    installStatus.textContent = '현재 브라우저는 오프라인 앱 셸을 지원하지 않는다.';
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
    installStatus.textContent = '이 브라우저에서 홈 화면 설치를 지원한다.';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installButton.hidden = true;
    installStatus.textContent = 'DGIST Orbit이 홈 화면 앱으로 설치됐다.';
  });

  registerAppShell();
}

async function registerAppShell() {
  try {
    await navigator.serviceWorker.register('./sw.js');
    installStatus.textContent = '오프라인 앱 셸이 준비됐다. 네트워크가 약해도 다시 열 수 있다.';
  } catch {
    installStatus.textContent = '앱 셸 등록에 실패했다. 새로고침 후 다시 시도해라.';
  }
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  installStatus.textContent = result.outcome === 'accepted'
    ? '설치 요청을 보냈다. 홈 화면에서 DGIST Orbit을 실행할 수 있다.'
    : '설치를 보류했다. 나중에 다시 홈 화면에 추가할 수 있다.';
  if (result.outcome === 'accepted') installButton.hidden = true;
  deferredInstallPrompt = null;
}
