# 별빛 골짜기

GitHub Pages에서 실행되는 싱글 플레이 2D RPG 프로토타입입니다. Phaser 3, TypeScript, Vite로 구성되며 별도 서버가 필요 없습니다.

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
- 기존 버전 1 세이브를 버전 2 월드 데이터로 자동 변환

## GitHub Pages 배포

저장소 설정의 **Pages → Build and deployment → Source**를 **GitHub Actions**로 지정한 뒤 `main` 브랜치에 푸시하면 자동 배포됩니다. Vite의 상대 경로 설정 덕분에 프로젝트 페이지와 사용자 페이지 모두에서 동작합니다.
