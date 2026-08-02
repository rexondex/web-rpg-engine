import type { SaveData, SaveEnvelope } from '../types';
import { defaultQuests } from '../game/content';

const PREFIX = 'starlight-valley';

function checksum(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class SaveManager {
  static readonly slots = ['auto', '1', '2', '3'] as const;

  static save(slot: string, data: SaveData): void {
    const serialized = JSON.stringify(data);
    const envelope: SaveEnvelope = { game: 'starlight-valley', format: 2, data, checksum: checksum(serialized) };
    localStorage.setItem(`${PREFIX}:${slot}`, JSON.stringify(envelope));
  }

  static load(slot: string): SaveData | null {
    const raw = localStorage.getItem(`${PREFIX}:${slot}`);
    if (!raw) return null;
    return this.parse(raw);
  }

  static parse(raw: string): SaveData {
    const parsed = JSON.parse(raw) as Partial<SaveEnvelope>;
    if (parsed.game !== 'starlight-valley' || ![1, 2].includes(parsed.format ?? 0) || !parsed.data || !parsed.checksum) {
      throw new Error('지원하지 않는 저장 파일입니다.');
    }
    if (checksum(JSON.stringify(parsed.data)) !== parsed.checksum) throw new Error('저장 파일이 손상되었습니다.');
    if ((parsed.data as { version: number }).version === 1) {
      const legacy = parsed.data as unknown as { savedAt: string; playTime: number; player: { x: number; y: number; hp: number; maxHp: number }; world: { quest: string; defeatedSlimes: number } };
      const quests = defaultQuests();
      quests.slime_cleanup.objectives.slimes = Math.min(3, legacy.world.defeatedSlimes);
      quests.slime_cleanup.status = legacy.world.quest === 'complete' ? 'completed' : legacy.world.quest === 'hunt' ? 'active' : 'available';
      return { version: 2, savedAt: legacy.savedAt, playTime: legacy.playTime, player: { ...legacy.player, mapId: 'village' }, world: { quests, defeated: { slime: legacy.world.defeatedSlimes, wolf: 0 } } };
    }
    return parsed.data;
  }

  static export(data: SaveData): void {
    const serialized = JSON.stringify(data);
    const envelope: SaveEnvelope = { game: 'starlight-valley', format: 2, data, checksum: checksum(serialized) };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `starlight-valley-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
