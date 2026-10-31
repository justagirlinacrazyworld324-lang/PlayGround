import { Doll, SURVIVOR_LOOKS } from './characters.js'
import { Nav, SurvivorAI, HunterAI } from './ai.js'

const MATCH_TIME = 420

const DIFFICULTY = {
  gentle: {
    hunterWalk: 3.9, hunterChase: 4.6, hunterAttackCd: 1.35, senseCd: 27, senseDur: 2.6,
    bleed: 60, reaction: 0.5, aiSpeed: 0.94, name: 'Gentle',
  },
  classic: {
    hunterWalk: 4.2, hunterChase: 5.05, hunterAttackCd: 1.15, senseCd: 21, senseDur: 3.2,
    bleed: 45, reaction: 0.3, aiSpeed: 1, name: 'Cruel',
  },
  cruel: {
    hunterWalk: 4.5, hunterChase: 5.4, hunterAttackCd: 0.95, senseCd: 15, senseDur: 3.8,
    bleed: 30, reaction: 0.12, aiSpeed: 1.06, name: 'Merciless',
  },
}

const SURVIVOR_SPAWNS = [
  { x: -11.2, z: -7.2 },
  { x: 12.2, z: -6.4 },
  { x: -11.6, z: 9.4 },
  { x: 11.2, z: 10.6 },
]
const HUNTER_SPAWN = { x: 0, z: 15.2 }

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

export class Game {
  constructor(scene, world, sound, { role = 'survivor', difficulty = 'classic', onToast = () => {}, onEvent = () => {} } = {}) {
    this.scene = scene
    this.world = world
    this.sound = sound
    this.role = role
    this.difficultyKey = difficulty
    this.diff = DIFFICULTY[difficulty] || DIFFICULTY.classic
    this.onToast = onToast
    this.onEvent = onEvent
    this.nav = new Nav(world)
    this.survivors = []
    this.boxes = world.boxes || []
    this.chests = world.chests || []
    this.pings = []
    this.timeLeft = MATCH_TIME
    this.elapsed = 0
    this.ended = false
    this.endData = null
    this.paused = false
    this.prompt = null
    this.interactTarget = null
    this.interactProgress = 0
    this.cameraYaw = 0
    this.shake = 0
    this.player = null
    this.hunter = null
    this.toastQueue = []
    this.stats = { boxes: 0, revives: 0, hits: 0, escaped: 0, shattered: 0, heals: 0 }
    this.lastPromptText = ''
    this.noiseCooldown = 0

    world.buildNav()
    this.spawn()
  }

  spawn() {
    const count = 4
    const order = [0, 1, 2, 3]
    // player survivor always gets the first spawn; hunter player spawns elsewhere
    for (let i = 0; i < count; i++) {
      const look = SURVIVOR_LOOKS[i]
      const spawn = this.world.nearestOpen(SURVIVOR_SPAWNS[i].x, SURVIVOR_SPAWNS[i].z)
      const doll = new Doll(this.scene, {
        x: spawn.x, z: spawn.z, dress: look.dress, hair: look.hair,
        hairStyle: look.hairStyle, skin: look.skin, name: look.name,
      })
      const s = {
        id: i, name: look.name, accent: look.accent, isPlayer: this.role === 'survivor' && i === 0,
        doll, pos: { x: spawn.x, z: spawn.z }, status: 'healthy', health: 2,
        move: null, speed: 0, sprinting: false, stamina: 1,
        walkSpeed: 3.55, sprintSpeed: 5.95,
        abilityCd: 0, graceT: 0, hidden: false, hideChest: null,
        downedTimer: 0, reviveProgress: 0, healProgress: 0, beingHelped: false,
        ping: 0, noiseT: 0, aiAction: '', ai: null,
        lastSafe: { x: spawn.x, z: spawn.z },
        voice: 0,
      }
      if (s.isPlayer) {
        s.doll.setRing(true, 0xf4e8d5)
        this.player = s
      } else {
        s.ai = new SurvivorAI(this, s)
        s.ai.stamina = 0.75 + Math.random() * 0.25
      }
      this.survivors.push(s)
    }

    const hspawn = this.world.nearestOpen(HUNTER_SPAWN.x, HUNTER_SPAWN.z)
    const hdoll = new Doll(this.scene, { x: hspawn.x, z: hspawn.z, hunter: true })
    this.hunter = {
      id: 'hunter', isPlayer: this.role === 'hunter', doll: hdoll,
      pos: { x: hspawn.x, z: hspawn.z }, move: null, speed: 0,
      walkSpeed: this.diff.hunterWalk, chaseSpeed: this.diff.hunterChase,
      attackCd: 0, senseCd: 4, senseTime: 0, status: 'alive', ping: 0,
      ai: null, lungeT: 0, sensePulse: 0,
    }
    if (this.role === 'hunter') {
      hdoll.setRing(true, 0xff4a5e)
      this.player = this.hunter
    } else {
      this.hunter.ai = new HunterAI(this, this.hunter)
      this.hunter.ai.think = this.diff.reaction
    }
    hdoll.root.rotation.y = Math.PI

    // initialise boxes
    for (const b of this.boxes) {
      b.progress = 0
      b.done = false
      b.claimedBy = null
    }
    const gate = this.world.gate
    gate.unlocked = false
    gate.open = false
    gate.openT = 0
    gate.openProgress = 0
    for (const leaf of gate.leaves) leaf.pivot.rotation.y = 0

    // ensure player doll ring only
    for (const s of this.survivors) s.doll.setRing(s.isPlayer, 0xf4e8d5)
  }

  /* ── helpers ───────────────────────────────────────────── */
  aliveSurvivors() {
    return this.survivors.filter(s => s.status !== 'shattered' && s.status !== 'escaped')
  }

  resolvedSurvivors() {
    return this.survivors.filter(s => s.status === 'shattered' || s.status === 'escaped')
  }

  toast(text, kind = '') {
    this.onToast(text, kind)
  }

  noise(x, z, strength = 1) {
    this.pings.push({ x, z, t: 2.6 * strength + 1 })
    if (this.pings.length > 8) this.pings.shift()
    // player hunter gets a visual ping on nearby dolls
    if (this.role === 'hunter') {
      for (const s of this.aliveSurvivors()) {
        if (s.status === 'downed') continue
        if (Math.hypot(s.pos.x - x, s.pos.z - z) < 3.5) s.ping = Math.max(s.ping, 2.4)
      }
    }
  }

  chooseBoxFor(s) {
    let best = null, bestD = Infinity
    for (const b of this.boxes) {
      if (b.done) continue
      // avoid dogpiling the same box
      const others = this.survivors.filter(o => o !== s && o.ai && o.ai.targetBox === b && o.status !== 'downed')
      const penalty = others.length * 8
      const d = Math.hypot(b.x - s.pos.x, b.z - s.pos.z) + penalty
      if (d < bestD) { bestD = d; best = b }
    }
    return best
  }

  nearestInteract(s) {
    let best = null, bestD = Infinity
    const consider = (kind, obj, x, z, radius) => {
      const d = Math.hypot(s.pos.x - x, s.pos.z - z)
      if (d < radius && d < bestD) { bestD = d; best = { kind, obj, x, z } }
    }
    for (const o of this.survivors) {
      if (o === s) continue
      if (o.status === 'downed') consider('revive', o, o.pos.x, o.pos.z, 2.3)
      else if (o.status === 'injured') consider('heal', o, o.pos.x, o.pos.z, 2.3)
    }
    for (const b of this.boxes) if (!b.done) consider('box', b, b.x, b.z, 2.5)
    if (this.world.gate.unlocked && !this.world.gate.open) consider('gate', this.world.gate, 0, -17.4, 2.8)
    if (!s.hidden) {
      for (const c of this.chests) if (!c.occupant) consider('hide', c, c.x, c.z, 2.1)
    }
    return best
  }

  /* ── player actions ────────────────────────────────────── */
  useGrace(s) {
    if (s.abilityCd > 0 || s.status === 'downed' || s.hidden) return false
    s.graceT = 2.3
    s.abilityCd = 22
    s.stamina = Math.max(s.stamina, 0.6)
    this.sound.tone(520, 0.3, { type: 'triangle', gain: 0.05, slide: 220 })
    this.toast('Doll\'s Grace — silent feet', 'gold')
    return true
  }

  hunterSense() {
    const h = this.hunter
    if (h.senseCd > 0) return false
    h.senseCd = this.diff.senseCd
    h.senseTime = this.diff.senseDur
    this.sound.sense()
    this.toast('Thread Sense — every stitch is listening', 'gold')
    for (const s of this.aliveSurvivors()) {
      if (s.hidden) continue
      s.ping = Math.max(s.ping, this.diff.senseDur)
    }
    this.onEvent('sense')
    return true
  }

  hunterAttack() {
    const h = this.hunter
    if (h.attackCd > 0) return false
    h.attackCd = this.diff.hunterAttackCd
    h.doll.attack()
    h.lungeT = 0.16
    const fx = Math.sin(h.doll.root.rotation.y)
    const fz = Math.cos(h.doll.root.rotation.y)
    let hit = false
    for (const s of this.aliveSurvivors()) {
      if (s.status === 'downed' && s.shatterImmune > 0) continue
      const dx = s.pos.x - h.pos.x
      const dz = s.pos.z - h.pos.z
      const d = Math.hypot(dx, dz)
      if (d > 2.75) continue
      if (s.hidden && d > 1.9) continue
      const dot = (dx / (d || 1)) * fx + (dz / (d || 1)) * fz
      if (dot < 0.05 && d > 1.2) continue
      hit = true
      this.damageSurvivor(s, h)
    }
    if (hit) {
      this.sound.hit()
      this.shake = Math.max(this.shake, 0.5)
    } else {
      this.sound.noise(0.16, { gain: 0.06, filter: 1400, type: 'bandpass', q: 1.5 })
    }
    return hit
  }

  damageSurvivor(s, h) {
    if (s.hidden) this.unhide(s)
    if (s.status === 'downed') {
      this.shatter(s)
      return
    }
    if (s.status === 'healthy') {
      s.status = 'injured'
      s.health = 1
      s.ping = Math.max(s.ping, 2.2)
      s.stamina = Math.min(s.stamina, 0.45)
      this.sound.scream()
      if (s.isPlayer) {
        this.onEvent('hurt')
        this.toast('You are cracked — find a sister to mend you', 'blood')
      } else {
        this.toast(`${s.name} is cracked`, 'blood')
      }
    } else if (s.status === 'injured') {
      s.status = 'downed'
      s.health = 0
      s.downedTimer = this.diff.bleed
      s.reviveProgress = 0
      s.ping = Math.max(s.ping, 3.2)
      s.move = null
      s.speed = 0
      this.sound.hit()
      this.sound.scream()
      if (s.isPlayer) {
        this.onEvent('downed')
        this.toast('You are downed — a sister must mend you', 'blood')
      } else {
        this.toast(`${s.name} is downed`, 'blood')
      }
    }
    // A doll that just went down stays where she fell; the finishing blow
    // should not require chasing her across the floor.
    if (s.status === 'downed') return
    // knockback
    const dx = s.pos.x - h.pos.x
    const dz = s.pos.z - h.pos.z
    const d = Math.hypot(dx, dz) || 1
    const p = this.world.resolveCircle(s.pos.x + (dx / d) * 1.0, s.pos.z + (dz / d) * 1.0, 0.42)
    s.pos.x = p.x
    s.pos.z = p.z
    s.doll.root.position.x = p.x
    s.doll.root.position.z = p.z
    if (this.role === 'hunter' && h.isPlayer) this.stats.hits++
    this.shake = Math.max(this.shake, 0.7)
  }

  shatter(s) {
    if (s.status === 'shattered' || s.status === 'escaped') return
    s.status = 'shattered'
    s.doll.shatter()
    s.hidden = false
    if (s.hideChest) { s.hideChest.occupant = null; s.hideChest = null }
    this.stats.shattered++
    this.sound.shatter()
    this.toast(`${s.name} is shattered`, 'blood')
    this.onEvent('shatter', s)
    if (s.isPlayer) this.end('shattered')
    this.checkEnd()
  }

  reviveTick(healer, target, dt) {
    if (target.status !== 'downed') return
    const near = Math.hypot(healer.pos.x - target.pos.x, healer.pos.z - target.pos.z) < 2.4
    if (!near) {
      target.reviveProgress = Math.max(0, target.reviveProgress - dt * 0.8)
      return
    }
    target.beingHelped = true
    target.reviveProgress += dt
    target.doll.faceTowards(healer.pos.x, healer.pos.z, dt, 3)
    if (target.reviveProgress >= 4) {
      target.reviveProgress = 0
      target.status = 'injured'
      target.health = 1
      target.downedTimer = 0
      target.stamina = Math.max(target.stamina, 0.35)
      this.sound.revive()
      this.toast(`${target.name} is mended`, 'gold')
      if (healer.isPlayer) this.stats.revives++
      this.onEvent('revive', target)
    }
  }

  healTick(healer, target, dt) {
    if (target.status !== 'injured') return
    const near = Math.hypot(healer.pos.x - target.pos.x, healer.pos.z - target.pos.z) < 2.4
    if (!near) { target.healProgress = Math.max(0, target.healProgress - dt * 0.9); return }
    target.healProgress += dt
    target.doll.faceTowards(healer.pos.x, healer.pos.z, dt, 3)
    if (target.healProgress >= 3.2) {
      target.healProgress = 0
      target.status = 'healthy'
      target.health = 2
      this.sound.revive()
      this.toast(`${target.name} is whole again`, 'gold')
      if (healer.isPlayer) this.stats.heals++
      this.onEvent('heal', target)
    }
  }

  windTick(s, box, dt) {
    if (box.done) return
    if (Math.hypot(s.pos.x - box.x, s.pos.z - box.z) > 2.5) return
    box.progress += dt
    s.aiAction = 'wind'
    this.sound.windTimer = (this.sound.windTimer || 0) - dt
    if (this.sound.windTimer <= 0) {
      this.sound.windTimer = 0.22
      this.sound.wind()
    }
    if (s.isPlayer) {
      this.noiseCooldown -= dt
      if (this.noiseCooldown <= 0) {
        this.noiseCooldown = 2.2
        this.noise(box.x, box.z, 0.5)
      }
    }
    if (box.progress >= 3.2) {
      box.progress = 3.2
      box.done = true
      this.sound.boxDone()
      const done = this.boxes.filter(b => b.done).length
      this.toast(`Music box wound — ${done} of 5`, 'gold')
      this.noise(box.x, box.z, 1.4)
      if (s.isPlayer) this.stats.boxes++
      if (this.role === 'hunter') {
        s.ping = Math.max(s.ping, 4)
        this.toast(`A box sings in the ${box.room || 'house'}`, 'blood')
      }
      this.onEvent('box', box)
      if (done >= 5) this.unlockGate()
      else if (this.hunter.ai) this.hunter.ai.targetBox = null
    }
  }

  unlockGate() {
    if (this.world.gate.unlocked) return
    this.world.gate.unlocked = true
    this.sound.gate()
    this.toast('All five boxes sing — the front door is unlocked', 'gold')
    this.onEvent('unlock')
  }

  openGateTick(s, dt) {
    const gate = this.world.gate
    if (!gate.unlocked || gate.open) return
    if (Math.hypot(s.pos.x, s.pos.z + 17.4) > 3.0) return
    gate.openProgress = (gate.openProgress || 0) + dt
    if (gate.openProgress >= 3) {
      gate.open = true
      gate.openT = 0.01
      for (let i = this.world.colliders.length - 1; i >= 0; i--) {
        if (this.world.colliders[i].tag === 'gate') this.world.colliders.splice(i, 1)
      }
      this.world.buildNav()
      this.sound.gate()
      this.toast('The front door is open — run', 'gold')
      this.onEvent('gate')
    }
  }

  hide(s, chest) {
    if (s.hidden || chest.occupant) return
    s.hidden = true
    s.hideChest = chest
    s.move = null
    s.speed = 0
    chest.occupant = s
    s.doll.root.visible = false
    this.sound.noise(0.25, { gain: 0.05, filter: 600, type: 'lowpass' })
    if (s.isPlayer) this.toast('Hidden in the toy chest', 'gold')
  }

  unhide(s) {
    if (!s.hidden) return
    s.hidden = false
    if (s.hideChest) s.hideChest.occupant = null
    s.hideChest = null
    s.doll.root.visible = true
    s.doll.root.position.set(s.pos.x, 0, s.pos.z)
    if (s.isPlayer) this.toast('Out of the chest', '')
  }

  escape(s) {
    if (s.status === 'shattered' || s.status === 'escaped') return
    s.status = 'escaped'
    s.hidden = false
    if (s.hideChest) { s.hideChest.occupant = null; s.hideChest = null }
    s.doll.root.visible = false
    this.stats.escaped++
    this.sound.escape()
    this.toast(`${s.name} escaped the dollhouse`, 'gold')
    this.onEvent('escape', s)
    if (s.isPlayer) this.end('escaped')
    this.checkEnd()
  }

  checkEnd() {
    if (this.ended) return
    const alive = this.aliveSurvivors()
    if (!alive.length) {
      if (this.role === 'hunter') this.end('hunter-end')
      else if (this.player && this.player.status !== 'escaped') this.end('all-gone')
    }
  }

  /* ── player update ─────────────────────────────────────── */
  updatePlayer(dt, input) {
    const p = this.player
    if (!p) return
    if (this.role === 'hunter') {
      this.updateHunterPlayer(dt, input)
      return
    }
    const s = p
    if (s.status === 'shattered' || s.status === 'escaped') return
    if (s.hidden) {
      this.prompt = { text: 'Leave the toy chest', key: 'E', progress: 0, show: true }
      if (input.interactPressed) this.unhide(s)
      return
    }
    if (s.status === 'downed') {
      this.prompt = { text: 'Crawl… a sister must mend you', key: '', progress: 0, show: true }
      const mv = input.move
      if (mv && (mv.x || mv.z)) {
        const len = Math.hypot(mv.x, mv.z) || 1
        s.move = { x: mv.x / len, z: mv.z / len }
        s.speed = 0.9
      } else {
        s.move = null
        s.speed = 0
      }
      return
    }

    // ability
    if (input.abilityPressed) this.useGrace(s)

    // interaction target
    const target = this.nearestInteract(s)
    if (input.interactPressed && target && target.kind === 'hide') {
      this.hide(s, target.obj)
      this.prompt = null
      return
    }

    this.interactTarget = target
    if (target) {
      const labels = {
        revive: `Mend ${target.obj.name}`,
        heal: `Mend ${target.obj.name}`,
        box: 'Wind the music box',
        gate: 'Open the front door',
        hide: 'Hide in the toy chest',
      }
      let progress = 0
      if (target.kind === 'revive') progress = target.obj.reviveProgress / 4
      else if (target.kind === 'heal') progress = target.obj.healProgress / 3.2
      else if (target.kind === 'box') progress = target.obj.progress / 3.2
      else if (target.kind === 'gate') progress = (this.world.gate.openProgress || 0) / 3
      this.prompt = { text: labels[target.kind], key: target.kind === 'hide' ? 'E' : 'hold E', progress, show: true }
      if (input.interactHeld && target.kind !== 'hide') {
        if (target.kind === 'revive') {
          this.reviveTick(s, target.obj, dt)
          s.doll.faceTowards(target.obj.pos.x, target.obj.pos.z, dt, 4)
        } else if (target.kind === 'heal') {
          this.healTick(s, target.obj, dt)
          s.doll.faceTowards(target.obj.pos.x, target.obj.pos.z, dt, 4)
        } else if (target.kind === 'box') {
          this.windTick(s, target.obj, dt)
          s.doll.faceTowards(target.obj.x, target.obj.z, dt, 4)
        } else if (target.kind === 'gate') {
          this.openGateTick(s, dt)
          s.doll.faceTowards(0, -18, dt, 4)
        }
        if (target.kind !== 'box' && target.kind !== 'gate') {
          s.move = null
          s.speed = 0
        }
      }
    } else {
      this.prompt = null
    }

    // gate auto-escape
    const gate = this.world.gate
    if (gate.open && s.pos.z < -17.4 && Math.abs(s.pos.x) < 2.4) {
      this.escape(s)
      return
    }

    // movement
    const mv = input.move
    if (mv && (mv.x || mv.z)) {
      const len = Math.hypot(mv.x, mv.z) || 1
      const sprint = input.sprint && s.stamina > 0.02
      const grace = s.graceT > 0
      const speed = grace ? 7.4 : sprint ? s.sprintSpeed : s.walkSpeed
      s.move = { x: mv.x / len, z: mv.z / len }
      s.speed = speed
      s.sprinting = sprint || grace
      s.doll.faceTowards(s.pos.x + s.move.x, s.pos.z + s.move.z, dt, 9)
      if (sprint && !grace) {
        s.stamina = Math.max(0, s.stamina - dt * 0.26)
        s.noiseT -= dt
        if (s.noiseT <= 0) {
          s.noiseT = 0.75
          this.noise(s.pos.x, s.pos.z, 0.85)
        }
      } else if (!grace) {
        s.stamina = Math.min(1, s.stamina + dt * 0.14)
      }
      if (grace) {
        s.noiseT -= dt
        if (s.noiseT <= 0) { s.noiseT = 1.2; this.noise(s.pos.x, s.pos.z, 0.15) }
      }
    } else {
      s.move = null
      s.speed = 0
      s.sprinting = false
      s.stamina = Math.min(1, s.stamina + dt * 0.18)
    }
    // interacting stops the doll
    if (this.prompt && input.interactHeld && this.interactTarget && this.interactTarget.kind !== 'box') {
      s.move = null
      s.speed = 0
    }
  }

  updateHunterPlayer(dt, input) {
    const h = this.hunter
    if (h.attackCd > 0) h.attackCd -= dt
    if (h.senseCd > 0) h.senseCd -= dt
    if (input.abilityPressed) this.hunterSense()
    if (input.attackPressed) {
      // The camera sits behind the hunter, so its forward direction is cameraYaw + PI.
      h.doll.root.rotation.y = this.cameraYaw + Math.PI
      this.hunterAttack()
    }
    const mv = input.move
    if (mv && (mv.x || mv.z)) {
      const len = Math.hypot(mv.x, mv.z) || 1
      h.move = { x: mv.x / len, z: mv.z / len }
      h.speed = h.walkSpeed
      h.doll.faceTowards(h.pos.x + h.move.x, h.pos.z + h.move.z, dt, 7)
    } else {
      h.move = null
      h.speed = 0
      // face where the camera looks
      let diff = this.cameraYaw + Math.PI - h.doll.root.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      h.doll.root.rotation.y += diff * Math.min(1, dt * 6)
    }
    if (h.lungeT > 0) {
      h.lungeT -= dt
      const p = this.world.resolveCircle(h.pos.x + Math.sin(h.doll.root.rotation.y) * dt * 5, h.pos.z + Math.cos(h.doll.root.rotation.y) * dt * 5, 0.5)
      h.pos.x = p.x
      h.pos.z = p.z
    }
  }

  /* ── AI + movement ─────────────────────────────────────── */
  updateAI(dt) {
    for (const s of this.survivors) {
      if (s.ai) s.ai.update(dt)
    }
    if (this.hunter.ai) this.hunter.ai.update(dt)
  }

  moveEntity(e, dt) {
    if (!e.move) return
    const speed = e.speed || 0
    const nx = e.pos.x + e.move.x * speed * dt
    const nz = e.pos.z + e.move.z * speed * dt
    const p = this.world.resolveCircle(nx, nz, e === this.hunter ? 0.52 : 0.42)
    e.pos.x = p.x
    e.pos.z = p.z
    e.doll.root.position.x = p.x
    e.doll.root.position.z = p.z
  }

  /* ── main update ───────────────────────────────────────── */
  update(dt, time, input) {
    if (this.ended || this.paused) return
    dt = Math.min(dt, 0.05)
    this.elapsed += dt
    this.timeLeft = Math.max(0, this.timeLeft - dt)
    if (this.timeLeft <= 0) { this.end('dawn'); return }

    // cooldowns
    const h = this.hunter
    if (h.attackCd > 0) h.attackCd -= dt
    if (h.senseCd > 0) h.senseCd -= dt
    if (h.senseTime > 0) h.senseTime = Math.max(0, h.senseTime - dt)
    for (const s of this.survivors) {
      if (s.abilityCd > 0) s.abilityCd -= dt
      if (s.graceT > 0) s.graceT = Math.max(0, s.graceT - dt)
      if (s.ping > 0) s.ping = Math.max(0, s.ping - dt)
    }
    for (const p of this.pings) p.t -= dt
    this.pings = this.pings.filter(p => p.t > 0)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2)

    // player input
    if (!this.ended) this.updatePlayer(dt, input)
    this.updateAI(dt)

    // movement for everyone
    for (const s of this.survivors) {
      if (s.status === 'downed') {
        if (!s.ai) this.moveEntity(s, dt)
        else this.moveEntity(s, dt)
      } else if (!s.hidden && s.status !== 'shattered' && s.status !== 'escaped') {
        this.moveEntity(s, dt)
      }
    }
    this.moveEntity(h, dt)

    // hidden reveal by proximity
    for (const s of this.survivors) {
      if (!s.hidden) continue
      if (Math.hypot(s.pos.x - h.pos.x, s.pos.z - h.pos.z) < 1.9) {
        this.unhide(s)
        this.damageSurvivor(s, h)
      }
    }

    // downed bleed
    for (const s of this.survivors) {
      if (s.status === 'downed') {
        s.downedTimer -= dt
        s.reviveProgress = Math.max(0, s.reviveProgress - dt * 0.12)
        if (s.downedTimer <= 0) this.shatter(s)
      }
    }

    // player hunter strike cooldown sound / lunge
    if (this.role === 'hunter' && h.lungeT > 0) {
      h.lungeT = Math.max(0, h.lungeT - dt)
    }

    // AI interaction safety: if AI is very close to an unfinished box, keep winding
    // (handled inside SurvivorAI)

    // sync dolls
    for (const s of this.survivors) {
      const state = s.hidden ? 'hide'
        : s.status === 'downed' ? 'downed'
          : s.graceT > 0 ? 'grace'
            : s.status === 'injured' ? 'injured'
              : s.aiAction === 'wind' ? 'wind'
                : s.aiAction === 'revive' ? 'revive'
                  : s.speed > 0.2 ? (s.sprinting ? 'sprint' : 'walk')
                    : 'idle'
      s.doll.update(dt, { speed: s.speed, state, time })
      if (s.hidden) s.doll.root.visible = false
    }
    const hState = h.senseTime > 0 && h.sensePulse > 0 ? 'sense'
      : h.speed > 0.2 ? 'chase' : 'idle'
    h.doll.update(dt, { speed: h.speed, state: hState, time })

    // hunter facing while standing and AI target
    // (handled by AI / player)

    // gate escape for AI is handled by AI calling escape
    this.checkEnd()
  }

  end(reason) {
    if (this.ended) return
    this.ended = true
    const remaining = this.aliveSurvivors()
    if (reason === 'dawn') {
      for (const s of remaining) {
        if (s.status !== 'escaped' && s.status !== 'shattered') {
          s.status = 'escaped'
          s.doll.root.visible = false
          this.stats.escaped++
        }
      }
    }
    const shattered = this.survivors.filter(s => s.status === 'shattered').length
    const escaped = this.survivors.filter(s => s.status === 'escaped').length
    let title = 'The night ends'
    let line = ''
    let tone = 'neutral'
    if (this.role === 'survivor') {
      if (this.player.status === 'escaped') {
        title = 'Escaped'
        line = escaped >= 3
          ? 'You slipped through the front door together. The house keeps the rest.'
          : 'You slipped through the front door. The house keeps the rest.'
        tone = 'good'
      } else if (this.player.status === 'shattered') {
        title = 'Shattered'
        line = 'The Maker sets your pieces on the shelf. Tomorrow, he will try again.'
        tone = 'bad'
      } else if (reason === 'dawn') {
        title = 'Dawn'
        line = 'Sunlight crawls across the floorboards. The dolls are still here, but the night is over.'
        tone = 'good'
      } else {
        title = 'The house is quiet'
        line = 'Every music box has stopped. Somewhere, a shelf is waiting.'
        tone = 'bad'
      }
    } else {
      const killed = shattered >= 3
      title = killed ? 'The Maker\'s Work' : 'They Got Away'
      line = killed
        ? `${shattered} dolls are back on the shelf. The house is very quiet.`
        : `${escaped} dolls made it through the door. You will find them again.`
      tone = killed ? 'good' : 'bad'
    }
    this.endData = {
      reason, title, line, tone,
      shattered, escaped, boxes: this.boxes.filter(b => b.done).length,
      time: this.elapsed,
      stats: { ...this.stats },
    }
    this.sound.stopMusic()
    if (tone === 'good') this.sound.escape()
    else this.sound.lose()
    this.onEvent('end', this.endData)
  }

  destroy() {
    for (const s of this.survivors) {
      this.scene.remove(s.doll.root)
    }
    if (this.hunter) this.scene.remove(this.hunter.doll.root)
  }
}
