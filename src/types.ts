export type QuestStage = 'not_started' | 'hunt' | 'complete';
export type MapId = 'village' | 'meadow' | 'forest';
export type QuestStatus = 'available' | 'active' | 'ready' | 'completed' | 'failed';

export interface QuestProgress {
  status: QuestStatus;
  objectives: Record<string, number>;
}

export interface SaveData {
  version: 2;
  savedAt: string;
  playTime: number;
  player: { x: number; y: number; hp: number; maxHp: number; mapId: MapId };
  world: { quests: Record<string, QuestProgress>; defeated: Record<string, number> };
}

export interface SaveEnvelope {
  game: 'starlight-valley';
  format: 1 | 2;
  data: SaveData;
  checksum: string;
}
