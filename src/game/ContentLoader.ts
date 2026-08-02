import type { GameProtocol } from '../types';

export class ContentError extends Error { constructor(public issues: string[]) { super(`게임 설정 오류 ${issues.length}개`); } }

export async function loadGameContent(url = './game-data/game.json'): Promise<GameProtocol> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`게임 설정을 불러오지 못했습니다. (${response.status})`);
  const data = await response.json() as GameProtocol;
  const issues = validateContent(data);
  if (issues.length) throw new ContentError(issues);
  return data;
}

export function validateContent(data: GameProtocol): string[] {
  const issues: string[] = [];
  if (data.protocolVersion !== 1) issues.push(`protocolVersion: 지원 버전은 1입니다.`);
  if (!data.game?.id || !data.game?.version) issues.push('game.id와 game.version은 필수입니다.');
  if (!data.maps?.[data.player?.startMap]) issues.push(`player.startMap: 존재하지 않는 맵 '${data.player?.startMap}'`);
  Object.entries(data.maps ?? {}).forEach(([mapId, map]) => {
    map.exits.forEach((exit, i) => { if (!data.maps[exit.to]) issues.push(`maps.${mapId}.exits[${i}].to: 존재하지 않는 맵 '${exit.to}'`); });
    map.npcs.forEach((placement, i) => { if (!data.npcs[placement.npcId]) issues.push(`maps.${mapId}.npcs[${i}]: 존재하지 않는 NPC '${placement.npcId}'`); });
    map.spawns.forEach((spawn, i) => { if (!data.monsters[spawn.monsterId]) issues.push(`maps.${mapId}.spawns[${i}]: 존재하지 않는 몬스터 '${spawn.monsterId}'`); if (spawn.max < 0 || spawn.respawnMs < 500) issues.push(`maps.${mapId}.spawns[${i}]: max와 respawnMs 값이 유효하지 않습니다.`); });
  });
  Object.entries(data.npcs ?? {}).forEach(([id, npc]) => { if (!data.dialogues[npc.dialogue]) issues.push(`npcs.${id}.dialogue: 존재하지 않는 대화 '${npc.dialogue}'`); });
  Object.entries(data.monsters ?? {}).forEach(([id, monster]) => monster.drops.forEach((drop, i) => { if (!data.items[drop.itemId]) issues.push(`monsters.${id}.drops[${i}]: 존재하지 않는 아이템 '${drop.itemId}'`); if (drop.chance < 0 || drop.chance > 1) issues.push(`monsters.${id}.drops[${i}].chance: 0~1이어야 합니다.`); }));
  Object.entries(data.quests ?? {}).forEach(([id, quest]) => { quest.objectives.forEach((objective, i) => { if (!['kill', 'talk', 'visit', 'collect', 'custom'].includes(objective.type)) issues.push(`quests.${id}.objectives[${i}].type: 알 수 없는 타입`); }); Object.keys(quest.rewards.items ?? {}).forEach((itemId) => { if (!data.items[itemId]) issues.push(`quests.${id}.rewards: 존재하지 않는 아이템 '${itemId}'`); }); });
  Object.entries(data.dialogues ?? {}).forEach(([id, nodes]) => { const ids = new Set(nodes.map((n) => n.id)); nodes.forEach((node) => { if (node.next && !ids.has(node.next)) issues.push(`dialogues.${id}.${node.id}.next: 존재하지 않는 노드 '${node.next}'`); }); });
  return issues;
}
