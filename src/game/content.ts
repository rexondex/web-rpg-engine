import type { MapId, QuestProgress, QuestStatus } from '../types';

export interface NpcDefinition { id: string; name: string; x: number; y: number; color: number }
export interface ExitDefinition { x: number; y: number; width: number; height: number; to: MapId; spawn: { x: number; y: number }; label: string }
export interface SpawnZone { id: string; monster: 'slime' | 'wolf'; x: number; y: number; width: number; height: number; max: number; respawnMs: number }
export interface MapDefinition { id: MapId; name: string; subtitle: string; ground: number; path: number; npcs: NpcDefinition[]; exits: ExitDefinition[]; spawns: SpawnZone[] }

export const maps: Record<MapId, MapDefinition> = {
  village: {
    id: 'village', name: '별빛 마을', subtitle: '모험이 시작되는 안식처', ground: 0x4f7c68, path: 0xc9ad78,
    npcs: [
      { id: 'rowan', name: '촌장 로웬', x: 190, y: 215, color: 0xd6a85f },
      { id: 'lina', name: '잡화상 리나', x: 470, y: 350, color: 0xc98276 },
    ],
    exits: [{ x: 930, y: 270, width: 35, height: 150, to: 'meadow', spawn: { x: 55, y: 270 }, label: '햇살 들판' }], spawns: [],
  },
  meadow: {
    id: 'meadow', name: '햇살 들판', subtitle: '슬라임이 모여드는 초원', ground: 0x547f4a, path: 0xbda56d,
    npcs: [{ id: 'mira', name: '약초꾼 미라', x: 470, y: 165, color: 0x9c78b5 }],
    exits: [
      { x: 15, y: 270, width: 30, height: 150, to: 'village', spawn: { x: 885, y: 270 }, label: '별빛 마을' },
      { x: 945, y: 270, width: 30, height: 150, to: 'forest', spawn: { x: 55, y: 270 }, label: '안개 숲' },
    ],
    spawns: [{ id: 'meadow-slimes', monster: 'slime', x: 570, y: 230, width: 290, height: 220, max: 3, respawnMs: 7000 }],
  },
  forest: {
    id: 'forest', name: '안개 숲', subtitle: '길을 잃기 쉬운 위험 지역', ground: 0x294d3c, path: 0x776b50,
    npcs: [{ id: 'kael', name: '경비대원 카엘', x: 735, y: 190, color: 0x6f91ad }],
    exits: [{ x: 15, y: 270, width: 30, height: 150, to: 'meadow', spawn: { x: 895, y: 270 }, label: '햇살 들판' }],
    spawns: [{ id: 'forest-wolves', monster: 'wolf', x: 350, y: 190, width: 310, height: 250, max: 2, respawnMs: 10000 }],
  },
};

export const questDefinitions = {
  slime_cleanup: { title: '초록길의 방해꾼', giver: '촌장 로웬', summary: '햇살 들판의 슬라임을 정리하자.', objectives: [{ id: 'slimes', label: '슬라임 처치', target: 3 }], success: '슬라임 3마리를 처치하고 로웬에게 보고', failure: '실패 조건 없음' },
  forest_message: { title: '숲으로 가는 편지', giver: '약초꾼 미라', summary: '안개 숲의 카엘에게 미라의 안부를 전하자.', objectives: [{ id: 'reach_forest', label: '안개 숲 도착', target: 1 }, { id: 'talk_kael', label: '카엘과 대화', target: 1 }], success: '안개 숲에 도착해 카엘과 대화', failure: '실패 조건 없음' },
} as const;

export type QuestId = keyof typeof questDefinitions;
export const defaultQuests = (): Record<string, QuestProgress> => ({
  slime_cleanup: { status: 'available', objectives: { slimes: 0 } },
  forest_message: { status: 'available', objectives: { reach_forest: 0, talk_kael: 0 } },
});

export function statusLabel(status: QuestStatus): string {
  return ({ available: '수락 가능', active: '진행 중', ready: '보고 가능', completed: '완료', failed: '실패' })[status];
}
