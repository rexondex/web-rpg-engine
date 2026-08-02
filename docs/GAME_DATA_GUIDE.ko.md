# 게임 데이터 프로토콜 v2 작성 가이드

엔진은 빌드 시 코드에 시나리오를 포함하지 않고, 실행 시 `public/game-data/game.json`을 읽어 세계를 구성합니다. 같은 프로토콜을 지킨 JSON으로 이 파일을 교체하면 GitHub Pages에 배포된 게임 내용도 바뀝니다.

## 편집과 검증

`game.json`의 첫 줄에 있는 `$schema` 때문에 JSON Schema를 지원하는 VS Code 등의 편집기에서 자동완성과 오류 표시를 사용할 수 있습니다. 엔진도 시작할 때 ID 참조를 추가 검증합니다. 설정에 오류가 있으면 게임 대신 `maps.forest.exits[0].to` 같은 정확한 위치가 표시됩니다.

ID는 영문 소문자와 `_` 조합을 권장합니다. 표시 이름은 자유롭게 한글로 작성합니다. 다른 데이터를 연결할 때는 표시 이름이 아니라 ID를 사용합니다.

## 최상위 구조

- `game`: 게임 ID, 표시 제목, 콘텐츠 버전, 자동 저장 주기
- `assets`: 이미지, 스프라이트시트, 오디오 파일 매니페스트
- `player`: 시작 위치, 기본 능력치, 레벨 성장치, 누적 경험치 표, 시작 아이템
- `combat`: 공격 재사용 시간, 피격 무적 시간, 공격 거리
- `items`: 소비·재료·퀘스트 아이템
- `monsters`: 능력치, AI 속도, 경험치, 드롭 테이블
- `quests`: 목표, 보상, 성공·실패 설명
- `npcs`: NPC 표시 설정과 사용할 대화 ID
- `dialogues`: 조건, 선택지, 액션으로 구성한 대화 노드
- `maps`: NPC 배치, 출구, 몬스터 스폰 구역

## 에셋 폴더와 등록

에셋 파일은 `public/assets/` 아래에 둡니다. 권장 구조는 다음과 같습니다.

```text
public/assets/
├─ characters/   플레이어와 NPC 월드 이미지
├─ portraits/    대화창 초상화
├─ monsters/     몬스터 이미지와 스프라이트시트
├─ maps/         맵 배경과 오버레이
├─ audio/        배경 음악과 효과음
└─ ui/           아이콘과 UI 이미지
```

먼저 `assets`에 파일을 고유한 에셋 ID로 등록합니다. 경로는 GitHub Pages 하위 경로 배포를 지원하도록 `./assets/`로 시작하는 상대 경로를 권장합니다.

```json
"assets": {
  "images": {
    "knight": { "src": "./assets/characters/knight.png" },
    "portrait_knight": { "src": "./assets/portraits/knight.webp" },
    "castle_background": { "src": "./assets/maps/castle.webp" }
  },
  "spritesheets": {
    "bat_sheet": {
      "src": "./assets/monsters/bat.png",
      "frameWidth": 32,
      "frameHeight": 32
    }
  },
  "audio": {
    "forest_theme": {
      "src": ["./assets/audio/forest.ogg", "./assets/audio/forest.mp3"],
      "volume": 0.45,
      "loop": true
    }
  }
}
```

그다음 데이터에서는 경로를 반복하지 않고 에셋 ID만 사용합니다.

```json
"player": {
  "name": "기사 아렌",
  "texture": "knight",
  "portrait": "portrait_knight",
  "scale": 0.8
}
```

NPC의 `texture`는 월드에 표시할 이미지, `portrait`는 대화창 이미지입니다. 몬스터도 `texture`와 `scale`을 사용합니다. 맵은 `backgroundImage`, `backgroundAlpha`, `music`을 선택적으로 가질 수 있습니다.

대화 노드에 `portrait`를 넣으면 해당 문장만 NPC 기본 초상화 대신 다른 표정 이미지를 표시할 수 있습니다.

```json
{
  "id": "angry",
  "speaker": "촌장",
  "portrait": "portrait_rowan_angry",
  "text": ["지금 당장 성문을 닫게!"]
}
```

### 지원 파일

- 일반 이미지: PNG, WebP, JPEG, SVG
- 스프라이트시트: PNG, WebP
- 오디오: 브라우저 호환성을 위해 OGG와 MP3를 함께 등록하는 것을 권장

이미지의 투명 여백과 기준점은 파일에서 통일하는 것이 좋습니다. 월드 캐릭터는 같은 캔버스 크기와 발 위치를 사용하고, 초상화는 정사각형 또는 동일한 종횡비로 준비하세요. 외부 URL도 기술적으로 사용할 수 있지만 CORS와 서비스 종료 위험이 있으므로 배포 저장소 내부 파일을 권장합니다.

## 대화 조건

대화 배열에서 조건을 모두 만족하는 첫 노드가 선택됩니다. 따라서 구체적인 조건의 노드를 위에, 기본 대사를 마지막에 둡니다.

```json
{
  "id": "quest_offer",
  "speaker": "촌장",
  "conditions": [{ "type": "questStatus", "id": "wolf_hunt", "value": "available" }],
  "text": ["늑대를 처리해 주겠나?"],
  "choices": [
    { "text": "수락한다", "actions": [{ "type": "startQuest", "id": "wolf_hunt" }] },
    { "text": "거절한다" }
  ]
}
```

조건 타입은 `questStatus`, `objective`, `level`, `hasItem`, `flag`입니다. 숫자 비교는 `operator`에 `gte` 또는 `lte`를 사용하고, 생략하면 일치 비교입니다.

## 액션

대화, 선택지, 소비 아이템에서 다음 액션을 사용할 수 있습니다.

- `startQuest`, `completeQuest`, `failQuest`
- `objective`: 특정 퀘스트 목표 수치 증가
- `giveItem`, `takeItem`
- `heal`, `xp`
- `setFlag`: 스토리 불리언 값 기록
- `teleport`: 맵과 좌표 변경

퀘스트 목표의 `type`은 `kill`, `talk`, `visit`, `collect`, `custom`입니다. 앞의 네 타입은 엔진 이벤트로 자동 증가하고 `targetId`에는 각각 몬스터, NPC, 맵, 아이템 ID를 넣습니다. `custom`은 대화의 `objective` 액션으로 올립니다.

## 맵과 스폰

게임 좌표계는 960×540입니다. 출구 사각형에 플레이어가 들어가면 `to` 맵의 `spawnX`, `spawnY`로 이동합니다. 스폰 구역은 좌상단 `x`, `y`, 크기 `width`, `height`, 최대 동시 개체 `max`, 재생성 주기 `respawnMs`를 갖습니다.

## 콘텐츠 업데이트와 세이브

`game.id`가 같으면 기존 세이브를 같은 게임으로 인식합니다. 콘텐츠를 배포할 때 `game.version`을 올리세요. 로드 시 삭제된 퀘스트와 아이템은 정리되고 새 퀘스트는 자동 추가됩니다. `game.id`를 바꾸면 완전히 별개의 게임과 저장 공간으로 취급합니다.

세이브에는 진행 상황만 들어가며 원본 대사·몬스터 설정은 복제하지 않습니다. 따라서 밸런스나 대사를 바꾼 뒤 재배포해도 기존 플레이어는 새로운 설정과 자신의 진행도를 함께 사용합니다.
