import { beforeEach, describe, expect, it } from 'vitest';
import { SaveManager } from './SaveManager';
import type { SaveData } from '../types';

const data: SaveData = { version: 2, savedAt: '2026-08-02T00:00:00.000Z', playTime: 42, player: { x: 10, y: 20, hp: 88, maxHp: 100, mapId: 'meadow' }, world: { quests: { slime_cleanup: { status: 'active', objectives: { slimes: 1 } } }, defeated: { slime: 1, wolf: 0 } } };

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  clear: () => memory.clear(),
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
} });

beforeEach(() => localStorage.clear());
describe('SaveManager', () => {
  it('슬롯에 저장하고 동일한 데이터를 읽는다', () => { SaveManager.save('1', data); expect(SaveManager.load('1')).toEqual(data); });
  it('변조된 파일을 거부한다', () => { SaveManager.save('1', data); const raw = localStorage.getItem('starlight-valley:1')!.replace('"hp":88', '"hp":99'); expect(() => SaveManager.parse(raw)).toThrow('손상'); });
});
