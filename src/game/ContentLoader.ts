import type { GameProtocol } from '../types';

export class ContentError extends Error { constructor(public issues: string[]) { super(`게임 설정 오류 ${issues.length}개`); } }

export async function loadGameContent(url = './game-data/game.json'): Promise<GameProtocol> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`게임 설정을 불러오지 못했습니다. (${response.status})`);
  const data = await response.json() as GameProtocol;
  const issues = validateContent(data);
  if (!issues.length) issues.push(...await validateAssetFiles(data));
  if (issues.length) throw new ContentError(issues);
  return data;
}

async function validateAssetFiles(data: GameProtocol): Promise<string[]> {
  const files = [
    ...Object.entries(data.assets.images).map(([id, value]) => [`assets.images.${id}`, value.src] as const),
    ...Object.entries(data.assets.spritesheets).map(([id, value]) => [`assets.spritesheets.${id}`, value.src] as const),
    ...Object.entries(data.assets.audio).flatMap(([id, value]) => value.src.map((src) => [`assets.audio.${id}`, src] as const)),
  ];
  const results = await Promise.all(files.map(async ([path, src]) => {
    try { const response = await fetch(src, { method: 'HEAD' }); return response.ok ? null : `${path}.src: 파일을 찾을 수 없습니다. '${src}'`; }
    catch { return `${path}.src: 파일에 접근할 수 없습니다. '${src}'`; }
  }));
  return results.filter((issue): issue is string => issue !== null);
}

export function validateContent(data: GameProtocol): string[] {
  const issues: string[] = [];
  const hasVisual = (id: string | undefined) => !!id && (!!data.assets?.images?.[id] || !!data.assets?.spritesheets?.[id]);
  if (data.protocolVersion !== 2) issues.push(`protocolVersion: 지원 버전은 2입니다.`);
  if (!data.game?.id || !data.game?.version) issues.push('game.id와 game.version은 필수입니다.');
  if (!data.maps?.[data.player?.startMap]) issues.push(`player.startMap: 존재하지 않는 맵 '${data.player?.startMap}'`);
  if (!data.assets) issues.push('assets: 에셋 매니페스트는 필수입니다.');
  if (!hasVisual(data.player?.texture)) issues.push(`player.texture: 존재하지 않는 에셋 '${data.player?.texture}'`);
  if (data.player?.portrait && !data.assets?.images?.[data.player.portrait]) issues.push(`player.portrait: 존재하지 않는 이미지 '${data.player.portrait}'`);
  Object.entries(data.maps ?? {}).forEach(([mapId, map]) => {
    map.exits.forEach((exit, i) => { if (!data.maps[exit.to]) issues.push(`maps.${mapId}.exits[${i}].to: 존재하지 않는 맵 '${exit.to}'`); });
    map.npcs.forEach((placement, i) => { if (!data.npcs[placement.npcId]) issues.push(`maps.${mapId}.npcs[${i}]: 존재하지 않는 NPC '${placement.npcId}'`); });
    map.spawns.forEach((spawn, i) => { if (!data.monsters[spawn.monsterId]) issues.push(`maps.${mapId}.spawns[${i}]: 존재하지 않는 몬스터 '${spawn.monsterId}'`); if (spawn.max < 0 || spawn.respawnMs < 500) issues.push(`maps.${mapId}.spawns[${i}]: max와 respawnMs 값이 유효하지 않습니다.`); });
    if (map.backgroundImage && !data.assets?.images?.[map.backgroundImage]) issues.push(`maps.${mapId}.backgroundImage: 존재하지 않는 이미지 '${map.backgroundImage}'`);
    if (map.music && !data.assets?.audio?.[map.music]) issues.push(`maps.${mapId}.music: 존재하지 않는 오디오 '${map.music}'`);
  });
  Object.entries(data.npcs ?? {}).forEach(([id, npc]) => { if (!data.dialogues[npc.dialogue]) issues.push(`npcs.${id}.dialogue: 존재하지 않는 대화 '${npc.dialogue}'`); if (!hasVisual(npc.texture)) issues.push(`npcs.${id}.texture: 존재하지 않는 에셋 '${npc.texture}'`); if (npc.portrait && !data.assets?.images?.[npc.portrait]) issues.push(`npcs.${id}.portrait: 존재하지 않는 이미지 '${npc.portrait}'`); });
  Object.entries(data.monsters ?? {}).forEach(([id, monster]) => { if (!hasVisual(monster.texture)) issues.push(`monsters.${id}.texture: 존재하지 않는 에셋 '${monster.texture}'`); monster.drops.forEach((drop, i) => { if (!data.items[drop.itemId]) issues.push(`monsters.${id}.drops[${i}]: 존재하지 않는 아이템 '${drop.itemId}'`); if (drop.chance < 0 || drop.chance > 1) issues.push(`monsters.${id}.drops[${i}].chance: 0~1이어야 합니다.`); }); });
  Object.entries(data.quests ?? {}).forEach(([id, quest]) => { quest.objectives.forEach((objective, i) => { if (!['kill', 'talk', 'visit', 'collect', 'custom'].includes(objective.type)) issues.push(`quests.${id}.objectives[${i}].type: 알 수 없는 타입`); }); Object.keys(quest.rewards.items ?? {}).forEach((itemId) => { if (!data.items[itemId]) issues.push(`quests.${id}.rewards: 존재하지 않는 아이템 '${itemId}'`); }); });
  Object.entries(data.dialogues ?? {}).forEach(([id, nodes]) => { const ids = new Set(nodes.map((n) => n.id)); nodes.forEach((node) => { if (node.next && !ids.has(node.next)) issues.push(`dialogues.${id}.${node.id}.next: 존재하지 않는 노드 '${node.next}'`); if (node.portrait && !data.assets?.images?.[node.portrait]) issues.push(`dialogues.${id}.${node.id}.portrait: 존재하지 않는 이미지 '${node.portrait}'`); }); });
  return issues;
}
