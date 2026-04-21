# DGIST Orbit

DGIST 캠퍼스를 배경으로 한 포켓몬고 느낌의 탐사형 RPG 웹게임. 지금 버전은 MVP를 넘어 캠퍼스 안정화 운영과 전술 전투 루프까지 포함한다.

## 현재 포함된 것
- DGIST 주변을 무대로 한 인터랙티브 지도
- 구역 이동, 에너지 소모, 위성 스캔, 구역 안정화, 다단 전투, 보스 정화
- 장비/소모품 인벤토리, 장착 슬롯, 전공/소속 기반 패시브
- DGIST 랜드마크 로어, 진영 보너스, 확장된 퀘스트 체인
- 퀘스트, 레벨업, 로컬 저장
- 실제 위성 API 대신 이후 연결 가능한 인텔/스캔 플레이스홀더 구조
- 모바일 느낌을 살린 단일 페이지 UI, 스티키 전투 액션 바, 구역 안정도 대시보드

## 실행
정적 사이트라서 아무 정적 서버로 열면 된다.

### Python
```bash
cd dgist-orbit
python3 -m http.server 4173
```

그다음 브라우저에서:
- `http://localhost:4173`

## 현재 게임 루프
- 구역 이동으로 새로운 랜드마크와 인텔 해금, 각 구역의 안정도와 위협도 변화
- 스캔으로 적 출현, 로어, 보급 드롭 확보, 불안정 구역의 위기 관리
- 교전 시작 후 기본 공격, 분석 스킬, 보호막, 오비트 버스트, 재밍 필드로 턴제 전투 진행
- 휴식, 안정화, 전투, 퀘스트 보상으로 장비를 모으고 빌드를 강화

## 캠퍼스 정합 파이프라인
실제 DGIST 위성 레이어를 게임 구조에 맞추기 위한 첫 정합 파이프라인을 추가했다.

문서:
- `docs/campus-alignment-spec.md`

시드 라벨:
- `data/campus_reference_labels.json`

실행:
```bash
cd dgist-orbit
python3 scripts/campus_align.py \
  --satellite assets/campus-source/dgist_satellite.png \
  --reference assets/campus-source/dgist_reference_white_map.png
```

생성물:
- `assets/campus-processed/dgist_satellite_rotated.png`
- `assets/campus-processed/dgist_satellite_overlay.png`
- `assets/campus-processed/dgist_reference_overlay.png`
- `assets/campus-processed/dgist_building_segments.json`
- `assets/campus-processed/dgist_alignment_report.json`

주의:
- 회전은 직선축 기반 기하 추정치다.
- 라벨 매칭은 시드 앵커 기반 초안이므로 오버레이 검토 후 보정해야 한다.

## 다음 확장 아이디어
- 세그먼트 결과를 실제 `ZONES`와 `ZONE_LINKS` 생성의 입력 데이터로 전환
- GPS 기반 위치 판정과 실시간 출석형 미션
- 실제 캠퍼스 아트 자산과 건물 윤곽선 결합
- 학생증, 전공, 동아리 기반 직업군과 평판 시스템 고도화
- 레이드, 길드, 수업/과제 이벤트
- PWA 패키징 또는 Capacitor 기반 앱화
