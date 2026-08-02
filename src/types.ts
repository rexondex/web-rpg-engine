export type QuestStatus = 'available' | 'active' | 'ready' | 'completed' | 'failed';
export type ConditionOperator = 'eq' | 'gte' | 'lte';

export interface Condition {
  type: 'questStatus' | 'objective' | 'level' | 'hasItem' | 'flag';
  id: string;
  value: string | number | boolean;
  operator?: ConditionOperator;
}

export interface Action {
  type: 'startQuest' | 'completeQuest' | 'failQuest' | 'objective' | 'giveItem' | 'takeItem' | 'heal' | 'setFlag' | 'xp' | 'teleport';
  id?: string;
  objectiveId?: string;
  amount?: number;
  value?: boolean;
  mapId?: string;
  x?: number;
  y?: number;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string[];
  portrait?: string;
  conditions?: Condition[];
  choices?: { text: string; next?: string; actions?: Action[]; conditions?: Condition[] }[];
  next?: string;
  actions?: Action[];
}

export interface GameProtocol {
  protocolVersion: 2;
  game: { id: string; title: string; subtitle: string; version: string; autosaveSeconds: number };
  assets: {
    images: Record<string, { src: string }>;
    spritesheets: Record<string, { src: string; frameWidth: number; frameHeight: number }>;
    audio: Record<string, { src: string[]; volume?: number; loop?: boolean }>;
  };
  player: { name: string; texture: string; portrait?: string; scale?: number; startMap: string; startX: number; startY: number; baseStats: Stats; levelGrowth: Partial<Stats>; xpCurve: number[]; startingItems: Record<string, number> };
  combat: { attackCooldownMs: number; invulnerabilityMs: number; attackRange: number };
  items: Record<string, { name: string; description: string; type: 'consumable' | 'quest' | 'material'; maxStack: number; value: number; actions?: Action[] }>;
  monsters: Record<string, { name: string; texture: string; scale?: number; stats: Stats; speed: number; aggroRange: number; xp: number; drops: { itemId: string; chance: number; min: number; max: number }[] }>;
  quests: Record<string, { title: string; giver: string; summary: string; objectives: { id: string; label: string; type: 'kill' | 'talk' | 'visit' | 'collect' | 'custom'; target: number; targetId: string }[]; rewards: { xp?: number; items?: Record<string, number> }; success: string; failure: string }>;
  npcs: Record<string, { name: string; texture: string; portrait?: string; scale?: number; color?: string; dialogue: string }>;
  dialogues: Record<string, DialogueNode[]>;
  maps: Record<string, { name: string; subtitle: string; ground: string; path: string; backgroundImage?: string; backgroundAlpha?: number; music?: string; spawn: { x: number; y: number }; npcs: { npcId: string; x: number; y: number }[]; exits: { x: number; y: number; width: number; height: number; to: string; spawnX: number; spawnY: number; label: string }[]; spawns: { id: string; monsterId: string; x: number; y: number; width: number; height: number; max: number; respawnMs: number }[] }>;
}

export interface Stats { maxHp: number; attack: number; defense: number }
export interface QuestProgress { status: QuestStatus; objectives: Record<string, number>; rewarded?: boolean }
export interface SaveData {
  version: 3;
  contentId: string;
  contentVersion: string;
  savedAt: string;
  playTime: number;
  player: { x: number; y: number; hp: number; level: number; xp: number; mapId: string; inventory: Record<string, number> };
  world: { quests: Record<string, QuestProgress>; defeated: Record<string, number>; flags: Record<string, boolean> };
}
export interface SaveEnvelope { game: string; format: 3; data: SaveData; checksum: string }
