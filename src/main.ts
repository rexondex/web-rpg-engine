import Phaser from 'phaser';
import './style.css';
import { GameScene } from './game/GameScene';
import { SaveManager } from './save/SaveManager';
import type { SaveData } from './types';
import { questDefinitions, statusLabel, type QuestId } from './game/content';
import type { MinimapState } from './game/GameScene';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const saveDialog = $('#save-dialog') as HTMLDialogElement;
let currentSave: SaveData | null = SaveManager.load('auto');
let gameScene: GameScene;

function showToast(message: string): void {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function save(data: SaveData): void {
  currentSave = data; SaveManager.save('auto', data);
  $('#save-status').textContent = `자동 저장됨 · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  renderSlots();
}

function dialogue(speaker: string, lines: string[], choices: string[] | undefined, done: (choice?: number) => void): void {
  const panel = $('#dialogue'); let index = 0;
  $('#speaker').textContent = speaker; $('#dialogue-text').textContent = lines[index]; panel.classList.remove('hidden');
  const button = $('#dialogue-next'); const choicesBox = $('#dialogue-choices'); choicesBox.innerHTML = ''; choicesBox.classList.add('hidden'); button.classList.remove('hidden');
  const advance = (): void => {
    index += 1;
    if (index < lines.length) $('#dialogue-text').textContent = lines[index];
    else if (choices?.length) { button.classList.add('hidden'); choicesBox.classList.remove('hidden'); choicesBox.innerHTML = choices.map((choice, i) => `<button type="button" data-choice="${i}">${choice}</button>`).join(''); }
    else { panel.classList.add('hidden'); button.removeEventListener('click', advance); done(); }
  };
  button.addEventListener('click', advance);
  choicesBox.onclick = (event) => { const selected = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-choice]'); if (!selected) return; panel.classList.add('hidden'); button.removeEventListener('click', advance); done(Number(selected.dataset.choice)); };
}

gameScene = new GameScene(currentSave, save);
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 960, height: 540, backgroundColor: '#172a32', physics: { default: 'arcade', arcade: { debug: false } }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: gameScene });
game.registry.set('dialogue', dialogue);

gameScene.events.on('state', ({ hp, maxHp, objective, mapName, quests, minimap }: { hp: number; maxHp: number; objective: string; mapName: string; quests: SaveData['world']['quests']; minimap: MinimapState }) => {
  $('#hp-text').textContent = `${hp} / ${maxHp}`; $('#hp-bar').style.width = `${(hp / maxHp) * 100}%`; $('#quest-text').textContent = objective; $('#map-name').textContent = mapName;
  $('#quest-count').textContent = String(Object.values(quests).filter((q) => q.status === 'active' || q.status === 'ready').length);
  drawMinimap(minimap); renderQuests(quests);
});
gameScene.events.on('toast', showToast);

function renderSlots(): void {
  $('#slots').innerHTML = SaveManager.slots.map((slot) => {
    const data = SaveManager.load(slot); const title = slot === 'auto' ? '자동 저장' : `슬롯 ${slot}`;
    const detail = data ? `${new Date(data.savedAt).toLocaleString('ko-KR')} · ${Math.floor(data.playTime / 60)}분` : '비어 있음';
    return `<article><div><strong>${title}</strong><span>${detail}</span></div><button data-save="${slot}" ${slot === 'auto' ? 'disabled' : ''}>저장</button><button data-load="${slot}" ${data ? '' : 'disabled'}>불러오기</button></article>`;
  }).join('');
}

$('#save-menu-button').addEventListener('click', () => { renderSlots(); saveDialog.showModal(); });
const questDialog = $('#quest-dialog') as HTMLDialogElement;
let questFilter = 'all';
$('#quest-menu-button').addEventListener('click', () => { if (currentSave) renderQuests(currentSave.world.quests); questDialog.showModal(); });
$('.quest-tabs').addEventListener('click', (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]'); if (!button) return; questFilter = button.dataset.filter!; document.querySelectorAll('.quest-tabs button').forEach((item) => item.classList.toggle('active', item === button)); if (currentSave) renderQuests(currentSave.world.quests); });
$('#slots').addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button) return;
  const saveSlot = button.dataset.save; const loadSlot = button.dataset.load;
  if (saveSlot) { SaveManager.save(saveSlot, gameScene.snapshot()); showToast(`슬롯 ${saveSlot}에 저장했습니다.`); renderSlots(); }
  if (loadSlot) { const data = SaveManager.load(loadSlot); if (data) { gameScene.restore(data); save(data); saveDialog.close(); showToast('모험을 불러왔습니다.'); } }
});
$('#export-save').addEventListener('click', () => SaveManager.export(gameScene.snapshot()));
$('#import-save').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  try { const data = SaveManager.parse(await file.text()); gameScene.restore(data); save(data); saveDialog.close(); showToast('저장 파일을 복원했습니다.'); }
  catch (error) { showToast(error instanceof Error ? error.message : '파일을 읽지 못했습니다.'); }
});

function renderQuests(quests: SaveData['world']['quests']): void {
  const entries = Object.entries(quests).filter(([, quest]) => questFilter === 'all' || (questFilter === 'active' ? ['active', 'ready', 'available'].includes(quest.status) : quest.status === questFilter));
  $('#quest-list').innerHTML = entries.map(([id, quest]) => {
    const definition = questDefinitions[id as QuestId]; if (!definition) return '';
    const objectives = definition.objectives.map((objective) => { const value = quest.objectives[objective.id] ?? 0; return `<li class="${value >= objective.target ? 'done' : ''}"><i></i>${objective.label}<span>${value}/${objective.target}</span></li>`; }).join('');
    return `<article class="quest-entry ${quest.status}"><header><div><span>${definition.giver}</span><h3>${definition.title}</h3></div><b>${statusLabel(quest.status)}</b></header><p>${definition.summary}</p><ul>${objectives}</ul><footer><span>성공 · ${definition.success}</span><span>실패 · ${definition.failure}</span></footer></article>`;
  }).join('') || '<p class="empty">표시할 퀘스트가 없습니다.</p>';
}

function drawMinimap(state: MinimapState): void {
  const canvas = $('#minimap') as HTMLCanvasElement; const ctx = canvas.getContext('2d')!; const sx = canvas.width / 960; const sy = canvas.height / 540;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#183133'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#738a76'; ctx.strokeRect(.5, .5, canvas.width - 1, canvas.height - 1);
  const dot = (x: number, y: number, color: string, radius: number) => { ctx.beginPath(); ctx.fillStyle = color; ctx.arc(x * sx, y * sy, radius, 0, Math.PI * 2); ctx.fill(); };
  state.exits.forEach(({ x, y }) => dot(x, y, '#f5d87d', 4)); state.npcs.forEach(({ x, y }) => dot(x, y, '#8ec5e8', 3)); state.enemies.forEach(({ x, y }) => dot(x, y, '#df786c', 2)); dot(state.player.x, state.player.y, '#fff8d7', 3.5);
}
