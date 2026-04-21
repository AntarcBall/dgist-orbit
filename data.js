export const CAMPUS_CENTER = [35.697134, 128.453355];

export const PLAYER_ARCHETYPES = [
  {
    id: 'ai',
    name: 'AI 시스템 전공',
    passive: '스캔 XP +20%, 분석 스킬 효율 증가',
    starterKit: ['signal-emitter', 'focus-band'],
  },
  {
    id: 'robotics',
    name: '로봇공학 전공',
    passive: '기본 공격력 +3, 보호막 보정 +2',
    starterKit: ['servo-brace', 'battery-pack'],
  },
  {
    id: 'energy',
    name: '에너지공학 전공',
    passive: '휴식 효율 +1, 에너지 아이템 가치 상승',
    starterKit: ['field-ration', 'battery-pack'],
  },
];

export const FACTIONS = [
  {
    id: 'dorm-council',
    name: '기숙사 자치연합',
    bonus: '휴식 시 에너지 +1',
  },
  {
    id: 'library-keepers',
    name: '라이브러리 키퍼즈',
    bonus: '스캔 시 인텔 1줄 추가 획득 확률 상승',
  },
  {
    id: 'proto-club',
    name: '프로토타입 메이커즈',
    bonus: '장비 드롭 및 제작 보상 강화',
  },
];

export const ZONES = [
  {
    id: 'e1',
    name: '대학본부 (E1)',
    coords: [35.69069, 128.453037],
    kind: 'public',
    difficulty: 1,
    story: '하얀 캠퍼스 배치도 기준 가장 남측에 놓인 행정 축 시작점. 학술 코어 전체를 따라 올라가는 첫 관문이다.',
    rewards: ['credit', 'intel'],
    landmark: '대학본부 전면 광장과 행정 진입 동선.',
    boss: false,
  },
  {
    id: 'e2',
    name: '화학물리학관 (E2)',
    coords: [35.693483, 128.452212],
    kind: 'knowledge',
    difficulty: 1,
    story: '대학본부 북측으로 이어지는 기초과학 건물권. E7 기준 좌하단 축으로 읽히는 실제 학술 블록이다.',
    rewards: ['xp', 'intel'],
    landmark: '화학물리 계열 실험실과 강의실이 이어진 학술 코리도어.',
    boss: false,
  },
  {
    id: 'e3',
    name: '전기전자컴퓨터공학관 (E3)',
    coords: [35.696887, 128.452169],
    kind: 'research',
    difficulty: 2,
    story: '흰 배치도에서 E7 좌측 핵심축으로 붙는 공학관. 전기전자컴퓨터 연구 흐름이 밀집된 중간 허브다.',
    rewards: ['xp', 'credit', 'intel'],
    landmark: 'EECS 연구실과 실험동선이 응축된 공학 블록.',
    boss: false,
  },
  {
    id: 'e4',
    name: '뇌과학관 (E4)',
    coords: [35.69866, 128.45224],
    kind: 'knowledge',
    difficulty: 2,
    story: 'E3 북측으로 이어지는 뇌과학 축. 연구와 분석 이벤트가 자연스럽게 섞이는 인접 노드다.',
    rewards: ['xp', 'intel'],
    landmark: '뇌과학관 실내 연결부와 학술 세미나 구역.',
    boss: false,
  },
  {
    id: 'e5',
    name: '로봇및기계전자공학관 (E5)',
    coords: [35.700801, 128.452795],
    kind: 'research',
    difficulty: 3,
    story: 'E4 북측 상단에 위치한 공학관. 제작형 장비와 기계/로봇 계열 전투 테마에 잘 맞는 상위 연구 구역이다.',
    rewards: ['xp', 'credit'],
    landmark: '로봇 및 기계전자 계열 실험실 동선.',
    boss: false,
  },
  {
    id: 'e6',
    name: '에너지시스템공학관 (E6)',
    coords: [35.702452, 128.453605],
    kind: 'research',
    difficulty: 4,
    story: '배치도상 E7 북서 상단에 놓이는 고지대 축의 마지막 연구 구역. 에너지 시스템 테마의 고난도 노드다.',
    rewards: ['xp', 'relic', 'intel'],
    landmark: '에너지 연구 코어와 실험 장비 구역.',
    boss: true,
  },
  {
    id: 'e7',
    name: '컨실리언스홀 (E7)',
    coords: [35.69652, 128.45416],
    kind: 'public',
    difficulty: 3,
    story: '이번 좌표 정렬의 기준 앵커. 공용 동선과 핵심 축이 겹치는 중앙 허브라서 전체 캠퍼스 루트의 중심이 된다.',
    rewards: ['credit', 'relic'],
    landmark: '컨실리언스홀 중심 복도와 학술축 합류점.',
    boss: true,
  },
  {
    id: 'e8',
    name: '학술정보관 (E8)',
    coords: [35.69758, 128.45662],
    kind: 'knowledge',
    difficulty: 2,
    story: '배치도에서 E7 우측으로 길게 떨어진 학술 노드. 실내 체류형 탐사와 인텔 수집에 유리한 동측 고정 거점이다.',
    rewards: ['xp', 'intel'],
    landmark: '학술정보관 열람실과 자료 접근 동선.',
    boss: false,
  },
];

export const ZONE_LINKS = {
  e1: ['e2'],
  e2: ['e1', 'e3', 'e7'],
  e3: ['e2', 'e4', 'e7'],
  e4: ['e3', 'e5', 'e7'],
  e5: ['e4', 'e6', 'e7'],
  e6: ['e5', 'e7'],
  e7: ['e2', 'e3', 'e4', 'e5', 'e6', 'e8'],
  e8: ['e7'],
};

export const QUEST_POOL = [
  {
    id: 'scan-3',
    title: '위성 파편 3회 스캔',
    description: '캠퍼스 전역의 위성 흔적을 세 번 분석해 작전 로그를 확보해라.',
    type: 'scanCount',
    target: 3,
    reward: { credits: 60, xp: 20, items: ['battery-pack'] },
  },
  {
    id: 'travel-4',
    title: '구역 4곳 순찰',
    description: '서로 다른 DGIST 구역 네 곳을 방문해 네트워크 맵을 확장해라.',
    type: 'travelCount',
    target: 4,
    reward: { credits: 40, xp: 25, items: ['field-ration'] },
  },
  {
    id: 'boss-1',
    title: '보스 신호 정화',
    description: '위험 등급 보스 구역 한 곳을 정화해 캠퍼스 안정도를 올려라.',
    type: 'bossWins',
    target: 1,
    reward: { credits: 90, xp: 50, relics: 1, items: ['lab-coat'] },
  },
  {
    id: 'credits-120',
    title: '연구 크레딧 확보',
    description: '임무를 수행해 120 크레딧을 모아 분석 장비를 업그레이드해라.',
    type: 'credits',
    target: 120,
    reward: { xp: 45, energy: 2 },
  },
  {
    id: 'equip-2',
    title: '현장 장비 두 개 가동',
    description: '장비 두 개를 장착해 레인저 셋업을 완성해라.',
    type: 'equippedCount',
    target: 2,
    reward: { xp: 35, credits: 50, items: ['orbit-compass'] },
  },
  {
    id: 'relic-2',
    title: '호수 공명 조각 수집',
    description: '오비트 유물 두 개를 확보해 연구팀에 전달해라.',
    type: 'relics',
    target: 2,
    reward: { xp: 40, credits: 55, items: ['signal-emitter'] },
  },
];

export const SATELLITE_FEED = [
  'E1에서 E6까지 이어지는 서측 학술축은 하얀 캠퍼스 배치도 기준 거의 일직선 상승 루트로 읽힌다.',
  'E7 컨실리언스홀은 E1~E6 축과 E8 학술정보관을 잇는 중앙 앵커로 분류된다.',
  'E8 학술정보관은 E7 우측으로 분리된 단독 노드라서 인텔 허브 역할이 두드러진다.',
  'E3 전기전자컴퓨터공학관과 E5 로봇및기계전자공학관은 연구 장비 드롭 후보가 높은 공학 코어로 표시된다.',
  'E6 에너지시스템공학관은 상단 연구축 끝점이라 고난도 스캔과 보스 교전 확률이 높다.',
  'E2 화학물리학관과 E4 뇌과학관 사이는 분석형 탐사 루프로 이어붙이기 좋다.',
  '현재 좌표는 E7 앵커와 지도 스샷 상대 위치를 이용한 1차 투영값으로 기록되어 있다.',
];

export const ENEMIES = {
  transit: ['루프 글리치', '패킷 스프라이트'],
  knowledge: ['데이터 미믹', '정적의 모방자'],
  research: ['노이즈 오브', '실험실 파라사이트'],
  social: ['채팅 잔향체', '버즈 스웜'],
  rest: ['야간 와처', '슬립 인터럽터'],
  nature: ['리플 팬텀', '반사광 정령'],
  public: ['크로스로드 센티널', '플라자 드리프터'],
};

export const BOSS_SIGNATURES = {
  e7: {
    name: 'E7 컨코스 서지',
    intro: '컨실리언스홀 공용 동선에서 유동 신호가 겹치며 중앙 허브 전체가 과부하된다.',
    phaseTwo: '홀 내부 공진이 커지며 공격 간격이 짧아진다.',
    phaseLabel: ['혼잡 단계', '과밀 단계'],
    intentLabels: ['컨코스 압박파', '실내 공진 플래시'],
  },
  e6: {
    name: 'E6 에너지 코어 리부트',
    intro: '에너지시스템공학관 상단 실험축에 누적된 부하가 적응형 전장 패턴으로 돌아온다.',
    phaseTwo: '코어가 재점화되며 추적형 방출 패턴이 더 거세진다.',
    phaseLabel: ['예열 단계', '재점화 단계'],
    intentLabels: ['전력축 방출파', '코어 과충전 루프'],
  },
};

export const RANKS = ['신입 레인저', '야간 순찰자', '연구동 헌터', '캠퍼스 마셜', '궤도 관리자'];

export const ITEMS = {
  'battery-pack': {
    id: 'battery-pack',
    name: '배터리 팩',
    type: 'consumable',
    description: '현장 드론 배터리를 전환해 에너지 2를 회복한다.',
    effect: { energy: 2 },
  },
  'field-ration': {
    id: 'field-ration',
    name: '야전 식량팩',
    type: 'consumable',
    description: '기숙사 편의 보급품. HP 18과 에너지 1 회복.',
    effect: { hp: 18, energy: 1 },
  },
  'med-kit': {
    id: 'med-kit',
    name: '응급 메드킷',
    type: 'consumable',
    description: '응급 치료로 HP 30 회복.',
    effect: { hp: 30 },
  },
  'signal-emitter': {
    id: 'signal-emitter',
    name: '시그널 이미터',
    type: 'gear',
    slot: 'tool',
    description: '스캔 보정 장치. 분석 스킬과 스캔 보상을 강화한다.',
    stats: { scanBoost: 0.2, tech: 4 },
  },
  'focus-band': {
    id: 'focus-band',
    name: '포커스 밴드',
    type: 'gear',
    slot: 'accessory',
    description: '집중력을 끌어올려 치명 교전과 XP 확보를 돕는다.',
    stats: { crit: 0.1, attack: 2 },
  },
  'servo-brace': {
    id: 'servo-brace',
    name: '서보 브레이스',
    type: 'gear',
    slot: 'arm',
    description: '근력 보조 브레이스. 기본 공격력 상승.',
    stats: { attack: 5 },
  },
  'lab-coat': {
    id: 'lab-coat',
    name: '연구동 랩코트',
    type: 'gear',
    slot: 'body',
    description: '실험 노이즈 완충복. 최대 HP와 분석 방어를 높여 준다.',
    stats: { maxHp: 12, shield: 4 },
  },
  'orbit-compass': {
    id: 'orbit-compass',
    name: '오비트 나침반',
    type: 'gear',
    slot: 'tool',
    description: '미지의 구역 이동 시 추가 인텔과 크레딧을 확보한다.',
    stats: { scout: 1, intel: 1 },
  },
};

export const LOOT_TABLE = {
  transit: ['battery-pack', 'focus-band'],
  knowledge: ['med-kit', 'signal-emitter'],
  research: ['battery-pack', 'lab-coat'],
  social: ['field-ration', 'focus-band'],
  rest: ['field-ration', 'med-kit'],
  nature: ['orbit-compass', 'field-ration'],
  public: ['servo-brace', 'battery-pack'],
};

export const LORE_SNIPPETS = [
  '이번 패스에서는 하얀 DGIST 배치도에서 읽은 E1~E8 상대 위치를 E7 앵커 기준으로 위성 좌표에 투영했다.',
  'E1 대학본부에서 E6 에너지시스템공학관까지는 서측 학술축을 따라 단계적으로 북상하는 구조로 읽힌다.',
  'E7 컨실리언스홀은 E-건물 전반을 묶는 중앙 접속점이라 탐사와 재배치의 기준 노드가 된다.',
  'E8 학술정보관은 동측으로 분리된 단일 학술 허브라서 정조준 스캔과 인텔 수집에 특히 잘 맞는다.',
];
