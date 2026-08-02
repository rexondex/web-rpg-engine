import { describe, expect, it } from 'vitest';
import gameData from '../../public/game-data/game.json';
import type { GameProtocol } from '../types';
import { validateContent } from './ContentLoader';

describe('게임 데이터 프로토콜', () => {
  it('기본 시나리오의 모든 참조가 유효하다', () => { expect(validateContent(gameData as GameProtocol)).toEqual([]); });
  it('존재하지 않는 맵 출구를 검출한다', () => {
    const invalid = structuredClone(gameData) as GameProtocol;
    invalid.maps.village.exits[0].to = 'missing-map';
    expect(validateContent(invalid)[0]).toContain('missing-map');
  });
});
