import Phaser from 'phaser';
import type { MapId, QuestProgress, SaveData } from '../types';
import { defaultQuests, maps, questDefinitions, type NpcDefinition, type QuestId, type SpawnZone } from './content';

type DialogueHandler = (speaker: string, lines: string[], choices: string[] | undefined, done: (choice?: number) => void) => void;
type StateEvent = { hp: number; maxHp: number; objective: string; mapName: string; quests: Record<string, QuestProgress>; minimap: MinimapState };
export type MinimapState = { player: { x: number; y: number }; npcs: { x: number; y: number }[]; enemies: { x: number; y: number }[]; exits: { x: number; y: number }[] };

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private npcs!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'interact' | 'attack', Phaser.Input.Keyboard.Key>;
  private mapId: MapId = 'village';
  private quests: Record<string, QuestProgress> = defaultQuests();
  private defeated: Record<string, number> = { slime: 0, wolf: 0 };
  private hp = 100;
  private maxHp = 100;
  private startedAt = Date.now();
  private priorPlayTime = 0;
  private lastAttack = 0;
  private lastHurt = 0;
  private frozen = false;
  private transitioning = false;
  private dialogue!: DialogueHandler;
  private spawnTimers: Phaser.Time.TimerEvent[] = [];

  constructor(private initialSave: SaveData | null, private onChange: (data: SaveData) => void) { super('world'); }

  create(): void {
    this.createTextures();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', interact: 'E', attack: 'SPACE' }) as typeof this.keys;
    this.dialogue = this.registry.get('dialogue') as DialogueHandler;
    if (this.initialSave) this.applyData(this.initialSave);
    this.buildMap(this.mapId, this.initialSave?.player ?? { x: 330, y: 300 });
    this.time.addEvent({ delay: 3000, loop: true, callback: () => this.onChange(this.snapshot()) });
    this.emitState();
  }

  update(time: number): void {
    if (!this.player?.active) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    if (!this.frozen && !this.transitioning) {
      const movement = new Phaser.Math.Vector2(Number(this.cursors.right.isDown || this.keys.right.isDown) - Number(this.cursors.left.isDown || this.keys.left.isDown), Number(this.cursors.down.isDown || this.keys.down.isDown) - Number(this.cursors.up.isDown || this.keys.up.isDown));
      if (movement.lengthSq()) movement.normalize().scale(175);
      body.setVelocity(movement.x, movement.y);
      if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) this.interact();
      if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.attack(time);
    }
    this.updateEnemies(time);
    this.checkExits();
    if (Math.floor(time / 150) !== Math.floor((time - this.game.loop.delta) / 150)) this.emitState();
  }

  snapshot(): SaveData {
    return { version: 2, savedAt: new Date().toISOString(), playTime: this.priorPlayTime + Math.floor((Date.now() - this.startedAt) / 1000), player: { x: Math.round(this.player.x), y: Math.round(this.player.y), hp: this.hp, maxHp: this.maxHp, mapId: this.mapId }, world: { quests: structuredClone(this.quests), defeated: { ...this.defeated } } };
  }

  restore(save: SaveData): void {
    this.initialSave = save;
    this.scene.restart();
  }

  private applyData(save: SaveData): void {
    this.mapId = save.player.mapId; this.hp = save.player.hp; this.maxHp = save.player.maxHp;
    this.quests = structuredClone(save.world.quests); this.defeated = { ...save.world.defeated };
    this.priorPlayTime = save.playTime; this.startedAt = Date.now();
  }

  private buildMap(id: MapId, spawn: { x: number; y: number }): void {
    const map = maps[id]; this.cameras.main.setBackgroundColor(map.ground);
    for (let x = 0; x < 960; x += 32) for (let y = 0; y < 540; y += 32) this.add.image(x + 16, y + 16, 'ground').setTint(map.ground).setAlpha(0.96);
    this.add.rectangle(480, 270, 960, 108, map.path, 0.72).setStrokeStyle(2, map.path, 1);
    this.add.text(28, 28, `${map.name}\n${map.subtitle}`, { fontFamily: 'sans-serif', fontSize: '17px', color: '#f1f2dc', backgroundColor: '#122326cc', padding: { x: 12, y: 8 }, lineSpacing: 4 }).setDepth(4);
    this.npcs = this.physics.add.staticGroup();
    map.npcs.forEach((npc) => {
      const sprite = this.npcs.create(npc.x, npc.y, 'npc') as Phaser.Physics.Arcade.Sprite;
      sprite.setTint(npc.color).setData('definition', npc);
      this.add.text(npc.x, npc.y - 31, npc.name, { fontFamily: 'sans-serif', fontSize: '11px', color: '#fff2c5', backgroundColor: '#152629aa', padding: { x: 4, y: 2 } }).setOrigin(0.5);
    });
    map.exits.forEach((exit) => {
      this.add.rectangle(exit.x, exit.y, exit.width, exit.height, 0xffdc89, 0.16).setStrokeStyle(2, 0xffdc89, 0.55);
      this.add.text(exit.x + (exit.x < 100 ? 14 : -14), exit.y - 91, `↗ ${exit.label}`, { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffe6a5', backgroundColor: '#172a32cc', padding: { x: 6, y: 3 } }).setOrigin(exit.x < 100 ? 0 : 1, 0.5);
    });
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player').setCollideWorldBounds(true).setDepth(2);
    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.player, this.npcs);
    map.spawns.forEach((zone) => {
      this.add.rectangle(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.width, zone.height, 0xe5bd71, 0.035).setStrokeStyle(1, 0xf0c77a, 0.18);
      for (let i = 0; i < zone.max; i += 1) this.spawnEnemy(zone);
      this.spawnTimers.push(this.time.addEvent({ delay: zone.respawnMs, loop: true, callback: () => this.fillZone(zone) }));
    });
    if (id === 'forest') this.progressObjective('forest_message', 'reach_forest', 1);
  }

  private createTextures(): void {
    if (this.textures.exists('ground')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff).fillRect(0, 0, 32, 32).fillStyle(0xd8e6bc, .14).fillCircle(7, 8, 3).generateTexture('ground', 32, 32).clear();
    g.fillStyle(0xf3c889).fillCircle(16, 15, 11).fillStyle(0x23404a).fillRect(9, 23, 14, 8).fillStyle(0x172a32).fillCircle(12, 14, 2).fillCircle(20, 14, 2).generateTexture('player', 32, 32).clear();
    g.fillStyle(0xffffff).fillCircle(16, 14, 12).fillStyle(0x51362d).fillRect(6, 3, 20, 7).fillStyle(0xeee5ca).fillRect(8, 24, 16, 8).generateTexture('npc', 32, 32).clear();
    g.fillStyle(0x82d173).fillEllipse(18, 21, 34, 23).fillStyle(0xc9f2a7).fillCircle(12, 17, 4).fillStyle(0x17352a).fillCircle(11, 16, 2).fillCircle(23, 16, 2).generateTexture('slime', 36, 34).clear();
    g.fillStyle(0x89918a).fillTriangle(4, 14, 10, 1, 16, 13).fillTriangle(20, 13, 27, 1, 32, 15).fillEllipse(18, 20, 32, 24).fillStyle(0xf1d172).fillCircle(12, 18, 2).fillCircle(24, 18, 2).generateTexture('wolf', 36, 34); g.destroy();
  }

  private interact(): void {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null; let distance = 78;
    this.npcs.getChildren().forEach((child) => { const npc = child as Phaser.Physics.Arcade.Sprite; const d = Phaser.Math.Distance.BetweenPoints(this.player, npc); if (d < distance) { nearest = npc; distance = d; } });
    if (!nearest) return this.toast('가까이에 대화할 사람이 없습니다.');
    this.talkTo((nearest as Phaser.Physics.Arcade.Sprite).getData('definition') as NpcDefinition);
  }

  private talkTo(npc: NpcDefinition): void {
    this.frozen = true;
    const finish = (): void => { this.frozen = false; this.emitState(); this.onChange(this.snapshot()); };
    if (npc.id === 'rowan') {
      const quest = this.quests.slime_cleanup;
      if (quest.status === 'available') return this.dialogue(npc.name, ['햇살 들판에 슬라임 무리가 나타났네.', '세 마리를 처치해 길을 안전하게 만들어 주겠나?'], ['퀘스트를 수락한다', '다음에 이야기한다'], (choice) => { if (choice === 0) quest.status = 'active'; finish(); });
      if (quest.status === 'ready') return this.dialogue(npc.name, ['들판이 잠잠해졌군. 훌륭하게 해냈네!', '퀘스트 「초록길의 방해꾼」을 완료했습니다.'], undefined, () => { quest.status = 'completed'; finish(); });
      const line = quest.status === 'completed' ? '자네 덕분에 상인들이 다시 길을 다닐 수 있게 됐네.' : `슬라임을 ${quest.objectives.slimes}/3마리 처치했군. 조금만 더 힘내 주게.`;
      return this.dialogue(npc.name, [line], undefined, finish);
    }
    if (npc.id === 'mira') {
      const quest = this.quests.forest_message;
      if (quest.status === 'available') return this.dialogue(npc.name, ['안개 숲의 카엘에게 약초를 전해야 하는데 길이 위험해요.', '대신 그에게 제 안부를 전해주시겠어요?'], ['편지를 맡는다', '거절한다'], (choice) => { if (choice === 0) quest.status = 'active'; finish(); });
      return this.dialogue(npc.name, [quest.status === 'completed' ? '카엘이 무사하다니 다행이에요. 고마워요!' : '동쪽 끝으로 가면 안개 숲으로 이어져요.'], undefined, finish);
    }
    const quest = this.quests.forest_message;
    if (npc.id === 'kael' && quest.status === 'active') return this.dialogue(npc.name, ['미라가 보낸 여행자군요. 걱정하지 말라고 전해 주세요.', '퀘스트 「숲으로 가는 편지」를 완료했습니다.'], undefined, () => { this.progressObjective('forest_message', 'talk_kael', 1); quest.status = 'completed'; finish(); });
    this.dialogue(npc.name, ['숲 안쪽에는 늑대가 있습니다. 길에서 너무 멀리 벗어나지 마세요.'], undefined, finish);
  }

  private spawnEnemy(zone: SpawnZone): void {
    const enemy = this.enemies.create(Phaser.Math.Between(zone.x, zone.x + zone.width), Phaser.Math.Between(zone.y, zone.y + zone.height), zone.monster) as Phaser.Physics.Arcade.Sprite;
    enemy.setData({ kind: zone.monster, zone: zone.id, hp: zone.monster === 'wolf' ? 2 : 1 });
  }

  private fillZone(zone: SpawnZone): void {
    const count = this.enemies.getChildren().filter((enemy) => {
      const sprite = enemy as Phaser.Physics.Arcade.Sprite;
      return sprite.active && sprite.getData('zone') === zone.id;
    }).length;
    if (count < zone.max) this.spawnEnemy(zone);
  }

  private attack(time: number): void {
    if (time - this.lastAttack < 420) return; this.lastAttack = time;
    const slash = this.add.circle(this.player.x, this.player.y, 42, 0xffefb0, .38).setDepth(3);
    this.tweens.add({ targets: slash, scale: 1.45, alpha: 0, duration: 180, onComplete: () => slash.destroy() });
    this.enemies.getChildren().forEach((child) => { const enemy = child as Phaser.Physics.Arcade.Sprite; if (!enemy.active || Phaser.Math.Distance.BetweenPoints(this.player, enemy) >= 70) return; const hp = Number(enemy.getData('hp')) - 1; enemy.setData('hp', hp); enemy.setTintFill(0xffffff); this.time.delayedCall(90, () => enemy.clearTint()); if (hp <= 0) this.defeatEnemy(enemy); });
  }

  private defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    const kind = String(enemy.getData('kind')); enemy.destroy(); this.defeated[kind] = (this.defeated[kind] ?? 0) + 1;
    if (kind === 'slime') this.progressObjective('slime_cleanup', 'slimes', 1);
    this.toast(`${kind === 'slime' ? '슬라임' : '안개 늑대'}을 처치했습니다!`); this.emitState(); this.onChange(this.snapshot());
  }

  private updateEnemies(time: number): void {
    if (this.frozen) return;
    this.enemies.getChildren().forEach((child) => { const enemy = child as Phaser.Physics.Arcade.Sprite; if (!enemy.active) return; const distance = Phaser.Math.Distance.BetweenPoints(this.player, enemy); const body = enemy.body as Phaser.Physics.Arcade.Body; if (distance < 210) this.physics.moveToObject(enemy, this.player, enemy.getData('kind') === 'wolf' ? 85 : 58); else body.setVelocity(0); if (distance < 32 && time - this.lastHurt > 850) { this.lastHurt = time; this.hp = Math.max(1, this.hp - (enemy.getData('kind') === 'wolf' ? 12 : 7)); this.cameras.main.shake(90, .007); this.emitState(); } });
  }

  private checkExits(): void {
    if (this.transitioning) return;
    const exit = maps[this.mapId].exits.find((item) => Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height), this.player.x, this.player.y));
    if (!exit) return; this.transitioning = true; this.mapId = exit.to;
    const save = this.snapshot(); save.player.mapId = exit.to; save.player.x = exit.spawn.x; save.player.y = exit.spawn.y;
    this.onChange(save); this.initialSave = save; this.cameras.main.fadeOut(220, 10, 18, 20); this.time.delayedCall(240, () => this.scene.restart());
  }

  private progressObjective(id: QuestId, objective: string, amount: number): void {
    const quest = this.quests[id]; if (!quest || quest.status !== 'active') return;
    const definition = questDefinitions[id]; const target = definition.objectives.find((item) => item.id === objective)?.target ?? 1;
    quest.objectives[objective] = Math.min(target, (quest.objectives[objective] ?? 0) + amount);
    if (definition.objectives.every((item) => (quest.objectives[item.id] ?? 0) >= item.target)) quest.status = id === 'slime_cleanup' ? 'ready' : 'completed';
  }

  private emitState(): void {
    if (!this.player) return;
    const active = Object.entries(this.quests).find(([, quest]) => quest.status === 'active' || quest.status === 'ready');
    let objective = '새로운 의뢰를 찾아보세요';
    if (active) { const definition = questDefinitions[active[0] as QuestId]; const quest = active[1]; const next = definition.objectives.find((item) => (quest.objectives[item.id] ?? 0) < item.target); objective = quest.status === 'ready' ? '촌장 로웬에게 보고하세요' : next ? `${next.label} ${quest.objectives[next.id] ?? 0}/${next.target}` : definition.title; }
    const map = maps[this.mapId];
    const minimap: MinimapState = { player: { x: this.player.x, y: this.player.y }, npcs: map.npcs.map(({ x, y }) => ({ x, y })), enemies: this.enemies?.getChildren().filter((e) => (e as Phaser.Physics.Arcade.Sprite).active).map((e) => ({ x: (e as Phaser.Physics.Arcade.Sprite).x, y: (e as Phaser.Physics.Arcade.Sprite).y })) ?? [], exits: map.exits.map(({ x, y }) => ({ x, y })) };
    this.events.emit('state', { hp: this.hp, maxHp: this.maxHp, objective, mapName: map.name, quests: structuredClone(this.quests), minimap } satisfies StateEvent);
  }

  private toast(message: string): void { this.events.emit('toast', message); }
}
