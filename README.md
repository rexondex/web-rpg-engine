# Data-driven SSG RPG Engine · 별빛 골짜기

GitHub Pages에서 실행되는 데이터 기반 싱글 플레이 2D RPG 엔진입니다. Phaser 3, TypeScript, Vite로 구성되며 별도 서버가 필요 없습니다. 게임 시나리오는 엔진과 분리된 JSON으로 로드됩니다.

## 실행

```bash
npm install
npm run dev
```

프로덕션 빌드는 `npm run build`, 테스트는 `npm test`로 실행합니다.

## 조작

- 이동: WASD 또는 방향키
- NPC 상호작용: E
- 공격: Space
- 저장: 3초마다 자동 저장, 수동 슬롯 3개, JSON 파일 내보내기/불러오기

## 현재 엔진 기능

- 별빛 마을, 햇살 들판, 안개 숲 사이의 출구 기반 맵 이동
- NPC 4명과 퀘스트 상태에 따라 달라지는 선택형 대화
- 성공 조건, 실패 조건, 목표 진행도를 표시하는 퀘스트 저널
- 지역별 몬스터 스폰 구역, 최대 개체 수, 리스폰 주기
- 플레이어, NPC, 몬스터, 출구를 실시간 표시하는 미니맵
- 구형 세이브를 현재 버전 3 진행 데이터로 자동 변환
- JSON 설정 기반 캐릭터 능력치, 성장 곡선, 전투 밸런스
- 아이템, 인벤토리, 소비 효과, 몬스터 드롭과 퀘스트 보상
- 조건과 액션을 조합하는 분기 대화 시스템
- 데이터 참조 무결성 검사와 설정 오류 화면
- 콘텐츠 업데이트 시 신규 퀘스트 병합과 삭제 데이터 정리

## 게임 콘텐츠 편집

게임 전체 설정은 [`public/game-data/game.json`](public/game-data/game.json)에 있습니다. 엔진 코드를 수정하지 않고 이 파일의 맵, NPC, 몬스터, 아이템, 퀘스트, 대사와 밸런스를 변경할 수 있습니다.

- 프로토콜: [`public/game-data/game.schema.json`](public/game-data/game.schema.json)
- 한국어 작성 가이드: [`docs/GAME_DATA_GUIDE.ko.md`](docs/GAME_DATA_GUIDE.ko.md)
- 런타임 검증기: [`src/game/ContentLoader.ts`](src/game/ContentLoader.ts)

`game.id`는 저장 공간의 식별자이므로 같은 게임 업데이트에서는 유지하고, 콘텐츠를 수정할 때 `game.version`을 올리는 것을 권장합니다.

## GitHub Pages 배포

저장소 설정의 **Pages → Build and deployment → Source**를 **GitHub Actions**로 지정한 뒤 `main` 브랜치에 푸시하면 자동 배포됩니다. Vite의 상대 경로 설정 덕분에 프로젝트 페이지와 사용자 페이지 모두에서 동작합니다.
