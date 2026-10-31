/* ────────────────────────────────────────────────────────────
   A* on the dollhouse grid, plus the little minds that live here.
   ──────────────────────────────────────────────────────────── */

class MinHeap {
  constructor() { this.a = [] }
  push(node) {
    const a = this.a
    a.push(node)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].f <= a[i].f) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.a
    if (!a.length) return null
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let s = i
        if (l < a.length && a[l].f < a[s].f) s = l
        if (r < a.length && a[r].f < a[s].f) s = r
        if (s === i) break
        ;[a[s], a[i]] = [a[i], a[s]]
        i = s
      }
    }
    return top
  }
  get size() { return this.a.length }
}

export class Nav {
  constructor(world) {
    this.world = world
    this.nav = world.nav
    this.g = new Float32Array(this.nav.w * this.nav.h)
    this.came = new Int32Array(this.nav.w * this.nav.h)
    this.closed = new Uint8Array(this.nav.w * this.nav.h)
    this.stamp = new Int32Array(this.nav.w * this.nav.h)
    this.gen = 0
  }

  cell(x, z) {
    const cx = Math.floor((x - this.nav.x0) / this.nav.cell)
    const cz = Math.floor((z - this.nav.z0) / this.nav.cell)
    return { cx, cz, i: cz * this.nav.w + cx, ok: cx >= 0 && cz >= 0 && cx < this.nav.w && cz < this.nav.h }
  }

  blocked(i) { return this.nav.blocked[i] === 1 }

  nearestOpen(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= this.nav.w || cz >= this.nav.h) return null
    if (!this.blocked(cz * this.nav.w + cx)) return { cx, cz }
    for (let r = 1; r <= 10; r++) {
      let best = null, bestD = Infinity
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
          const nx = cx + dx, nz = cz + dz
          if (nx < 0 || nz < 0 || nx >= this.nav.w || nz >= this.nav.h) continue
          if (this.blocked(nz * this.nav.w + nx)) continue
          const d = dx * dx + dz * dz
          if (d < bestD) { bestD = d; best = { cx: nx, cz: nz } }
        }
      }
      if (best) return best
    }
    return null
  }

  lineClear(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1
    const len = Math.hypot(dx, dz)
    const steps = Math.max(2, Math.ceil(len / 0.3))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (this.world.isBlocked(x1 + dx * t, z1 + dz * t)) return false
    }
    return true
  }

  findPath(sx, sz, tx, tz) {
    const start = this.cell(sx, sz)
    let goal = this.cell(tx, tz)
    if (!start.ok || !goal.ok) return []
    const so = this.nearestOpen(start.cx, start.cz)
    let go = this.nearestOpen(goal.cx, goal.cz)
    if (!so || !go) return []
    const startI = so.cz * this.nav.w + so.cx
    const goalI = go.cz * this.nav.w + go.cx
    if (startI === goalI) return [{ x: tx, z: tz }]

    this.gen++
    const gen = this.gen
    const W = this.nav.w, H = this.nav.h
    const g = this.g, came = this.came, closed = this.closed, stamp = this.stamp
    const open = new MinHeap()
    g[startI] = 0
    came[startI] = -1
    stamp[startI] = gen
    closed[startI] = 0
    open.push({ i: startI, f: 0 })

    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142],
    ]
    let found = false
    let guard = 0
    while (open.size && guard++ < 12000) {
      const node = open.pop()
      const i = node.i
      if (closed[i] === 1 && stamp[i] === gen) continue
      closed[i] = 1
      stamp[i] = gen
      if (i === goalI) { found = true; break }
      const cx = i % W, cz = (i / W) | 0
      for (const [dx, dz, cost] of dirs) {
        const nx = cx + dx, nz = cz + dz
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue
        const ni = nz * W + nx
        if (this.blocked(ni)) continue
        if (dx && dz) {
          if (this.blocked(cz * W + nx) || this.blocked(nz * W + cx)) continue
        }
        if (stamp[ni] !== gen) {
          stamp[ni] = gen
          closed[ni] = 0
          g[ni] = Infinity
        }
        if (closed[ni] === 1) continue
        const ng = g[i] + cost
        if (ng < g[ni]) {
          g[ni] = ng
          came[ni] = i
          const h = Math.hypot(nx - go.cx, nz - go.cz)
          open.push({ i: ni, f: ng + h })
        }
      }
    }
    if (!found) return []
    const cells = []
    let cur = goalI
    let guard2 = 0
    while (cur !== -1 && guard2++ < 3000) {
      cells.push(cur)
      if (cur === startI) break
      cur = came[cur]
    }
    cells.reverse()
    const pts = cells.map(i => ({
      x: this.nav.x0 + ((i % W) + 0.5) * this.nav.cell,
      z: this.nav.z0 + (((i / W) | 0) + 0.5) * this.nav.cell,
    }))
    if (pts.length) pts[pts.length - 1] = { x: tx, z: tz }

    // smooth
    const out = []
    let anchor = { x: sx, z: sz }
    let k = 0
    while (k < pts.length) {
      let far = k
      for (let j = pts.length - 1; j > k; j--) {
        if (this.lineClear(anchor.x, anchor.z, pts[j].x, pts[j].z)) { far = j; break }
      }
      out.push(pts[far])
      anchor = pts[far]
      k = far + 1
    }
    return out
  }
}

class Agent {
  constructor(world, nav) {
    this.world = world
    this.nav = nav
    this.path = []
    this.pathI = 0
    this.repath = 0
    this.goal = null
    this.stuckT = 0
    this.lastPos = null
  }

  setGoal(x, z) {
    if (!this.goal || Math.hypot(x - this.goal.x, z - this.goal.z) > 1.6) {
      this.goal = { x, z }
      this.path = []
      this.pathI = 0
      this.repath = 0
    }
  }

  clearGoal() { this.goal = null; this.path = []; this.pathI = 0 }

  steer(dt, pos) {
    if (!this.goal) return null
    this.repath -= dt
    if (this.repath <= 0 || !this.path.length) {
      this.repath = 0.55 + Math.random() * 0.25
      this.path = this.nav.findPath(pos.x, pos.z, this.goal.x, this.goal.z)
      this.pathI = 0
    }
    while (this.pathI < this.path.length) {
      const p = this.path[this.pathI]
      if (Math.hypot(p.x - pos.x, p.z - pos.z) < 0.55) this.pathI++
      else break
    }
    if (this.pathI >= this.path.length) {
      const dx = this.goal.x - pos.x
      const dz = this.goal.z - pos.z
      const d = Math.hypot(dx, dz)
      if (d < 0.6) return null
      return { x: dx / d, z: dz / d, dist: d }
    }
    const p = this.path[this.pathI]
    const dx = p.x - pos.x
    const dz = p.z - pos.z
    const d = Math.hypot(dx, dz) || 1
    return { x: dx / d, z: dz / d, dist: d }
  }
}

const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

/* ── survivor mind ───────────────────────────────────────── */
export class SurvivorAI {
  constructor(game, survivor) {
    this.game = game
    this.s = survivor
    this.agent = new Agent(game.world, game.nav)
    this.think = 0
    this.action = null
    this.actionT = 0
    this.fleeT = 0
    this.stamina = 1
    this.sprintT = 0
    this.targetBox = null
    this.targetAlly = null
    this.hideT = 0
    this.personality = Math.random()
  }

  update(dt) {
    const g = this.game
    const s = this.s
    if (s.status === 'shattered' || s.status === 'escaped') return
    this.think -= dt
    const h = g.hunter
    const hp = h ? h.pos : { x: 99, z: 99 }
    const hd = h ? dist2(s.pos, hp) : 99
    const canSeeHunter = h && hd < 17 && g.world.lineOfSight(s.pos.x, s.pos.z, hp.x, hp.z) && !h.hidden
    const sensed = h && h.senseTime > 0 && hd < 16
    const threat = !s.hidden && (canSeeHunter || sensed || hd < 5.5)
    const calm = !threat && hd > 9

    if (s.status === 'downed') {
      s.aiAction = 'crawl'
      // crawl away from the hunter
      if (h && hd < 8) {
        const dx = s.pos.x - hp.x, dz = s.pos.z - hp.z
        const d = Math.hypot(dx, dz) || 1
        s.move = { x: dx / d, z: dz / d }
        s.speed = 0.8
      } else {
        s.move = null
        s.speed = 0
      }
      return
    }

    if (s.hidden) {
      s.move = null
      s.speed = 0
      s.aiAction = 'hide'
      // leave if the hunter is far and it has been a while
      this.hideT += dt
      if ((calm && this.hideT > 4) || (h && hd > 15)) {
        g.unhide(s)
        this.hideT = 0
      }
      return
    }

    // reaction delay on high difficulty is shorter
    if (this.think > 0) {
      this.applyMove(dt)
      return
    }
    this.think = 0.18 + Math.random() * 0.18

    // downed ally nearby
    const downed = g.survivors.find(o => o !== s && o.status === 'downed' && dist2(s.pos, o.pos) < 22)
    if (downed && hd > 11 && s.status === 'healthy') {
      this.action = 'revive'
      this.targetAlly = downed
      this.targetBox = null
      this.agent.setGoal(downed.pos.x, downed.pos.z)
      if (dist2(s.pos, downed.pos) < 1.8) {
        g.reviveTick(s, downed, dt)
        s.aiAction = 'revive'
        s.move = null
        s.speed = 0
        return
      }
    } else if (threat) {
      this.action = 'flee'
      this.targetBox = null
      this.targetAlly = null
      this.fleeT = 1.1
      // try a nearby hiding spot if it's very close and the hunter hasn't seen us
      if (!canSeeHunter && hd > 6.5) {
        let best = null, bd = 4.2
        for (const c of g.chests) {
          if (c.occupant) continue
          const d = dist2(s.pos, c)
          if (d < bd) { bd = d; best = c }
        }
        if (best && Math.random() < 0.7) {
          if (dist2(s.pos, best) < 1.7) {
            g.hide(s, best)
            this.hideT = 0
            return
          }
          this.agent.setGoal(best.x, best.z)
          this.applyMove(dt, true)
          return
        }
      }
      const dx = s.pos.x - hp.x, dz = s.pos.z - hp.z
      const d = Math.hypot(dx, dz) || 1
      let tx = s.pos.x + (dx / d) * 7
      let tz = s.pos.z + (dz / d) * 7
      // keep away from walls
      const open = g.world.nearestOpen(tx, tz)
      this.agent.setGoal(open.x, open.z)
      this.applyMove(dt, true)
      if (hd < 7 && s.abilityCd <= 0) g.useGrace(s)
      return
    } else if (g.world.gate.open) {
      this.action = 'escape'
      this.targetBox = null
      this.agent.setGoal(0, -18)
      if (s.pos.z < -16.7 && Math.abs(s.pos.x) < 2.4) g.escape(s)
      this.applyMove(dt, true)
      return
    } else if (g.world.gate.unlocked) {
      this.action = 'gate'
      this.targetBox = null
      this.agent.setGoal(0, -16.9)
      if (dist2(s.pos, { x: 0, z: -17.4 }) < 2.2) {
        g.openGateTick(s, dt)
        s.aiAction = 'gate'
        s.move = null
        s.speed = 0
        return
      }
    } else {
      // choose a music box
      let box = this.targetBox
      if (!box || box.done) {
        box = g.chooseBoxFor(s)
        this.targetBox = box
      }
      if (box) {
        this.action = 'work'
        this.targetAlly = null
        this.agent.setGoal(box.x, box.z)
        if (dist2(s.pos, box) < 2.2) {
          s.aiAction = 'wind'
          s.move = null
          s.speed = 0
          g.windTick(s, box, dt)
          s.doll.faceTowards(box.x, box.z, dt, 4)
          return
        }
      }
    }
    this.applyMove(dt, false)
  }

  applyMove(dt, urgent = false) {
    const s = this.s
    const dir = this.agent.steer(dt, s.pos)
    if (!dir) { s.move = null; s.speed = 0; return }
    s.move = { x: dir.x, z: dir.z }
    const wantsSprint = (urgent || this.fleeT > 0 || (this.action === 'escape' && Math.random() < 0.8)) && s.stamina > 0.18
    s.speed = wantsSprint ? s.sprintSpeed : s.walkSpeed
    s.sprinting = wantsSprint
    if (wantsSprint) {
      s.stamina = Math.max(0, s.stamina - dt * 0.22)
      s.noiseT = (s.noiseT || 0) - dt
      if (s.noiseT <= 0) {
        s.noiseT = 0.9
        this.game.noise(s.pos.x, s.pos.z, 0.7)
      }
    } else {
      s.stamina = Math.min(1, s.stamina + dt * 0.13)
    }
    if (this.fleeT > 0) this.fleeT -= dt
    s.doll.faceTowards(s.pos.x + dir.x, s.pos.z + dir.z, dt, 7)
  }
}

/* ── hunter mind ─────────────────────────────────────────── */
export class HunterAI {
  constructor(game, hunter) {
    this.game = game
    this.h = hunter
    this.agent = new Agent(game.world, game.nav)
    this.think = 0
    this.state = 'patrol'
    this.target = null
    this.lastSeen = null
    this.searchT = 0
    this.senseT = 0
    this.targetBox = null
    this.stuck = 0
  }

  update(dt) {
    const g = this.game
    const h = this.h
    if (!h || h.status === 'shattered') return
    this.think -= dt
    if (this.think > 0) { this.move(dt); return }
    this.think = 0.16 + Math.random() * 0.14

    const alive = g.survivors.filter(s => s.status !== 'shattered' && s.status !== 'escaped' && !s.hidden)
    let visible = null, vd = Infinity
    for (const s of alive) {
      const d = dist2(h.pos, s.pos)
      if (d < 18 && d < vd && g.world.lineOfSight(h.pos.x, h.pos.z, s.pos.x, s.pos.z)) {
        vd = d
        visible = s
      }
    }
    // sense reveals through walls
    if (!visible && h.senseTime > 0) {
      for (const s of alive) {
        const d = dist2(h.pos, s.pos)
        if (d < 20 && d < vd) { vd = d; visible = s }
      }
    }

    if (visible) {
      this.target = visible
      this.lastSeen = { x: visible.pos.x, z: visible.pos.z }
      this.state = 'chase'
      this.searchT = 0
    } else if (this.state === 'chase') {
      this.state = 'search'
      this.searchT = 3.2
    }

    if (this.state === 'search') {
      this.searchT -= 0.3
      if (this.searchT <= 0 || !this.lastSeen) this.state = 'patrol'
    }

    if (this.state === 'chase' && this.target) {
      const t = this.target
      const d = dist2(h.pos, t.pos)
      if (t.status === 'downed') {
        if (d < 2.2) {
          if (h.attackCd <= 0) g.hunterAttack()
        } else {
          this.agent.setGoal(t.pos.x, t.pos.z)
        }
      } else if (d < 2.35 && h.attackCd <= 0) {
        g.hunterAttack()
      } else {
        this.agent.setGoal(t.pos.x, t.pos.z)
      }
      // occasional sense to keep pressure
      if (h.senseCd <= 0 && d > 8) g.hunterSense()
    } else if (this.state === 'search' && this.lastSeen) {
      this.agent.setGoal(this.lastSeen.x, this.lastSeen.z)
      if (h.senseCd <= 0) g.hunterSense()
    } else {
      // patrol music boxes / gate
      const remaining = g.boxes.filter(b => !b.done)
      if (!remaining.length) {
        this.agent.setGoal(0, -16.4)
      } else {
        if (!this.targetBox || this.targetBox.done) {
          this.targetBox = remaining[Math.floor(Math.random() * remaining.length)]
        }
        this.agent.setGoal(this.targetBox.x, this.targetBox.z)
      }
      if (h.senseCd <= 0 && Math.random() < 0.02) g.hunterSense()
    }
    this.move(dt)
  }

  move(dt) {
    const h = this.h
    const dir = this.agent.steer(dt, h.pos)
    if (!dir) {
      h.move = null
      h.speed = 0
      return
    }
    h.move = { x: dir.x, z: dir.z }
    h.speed = this.state === 'chase' ? h.chaseSpeed : h.walkSpeed
    h.doll.faceTowards(h.pos.x + dir.x, h.pos.z + dir.z, dt, 6)
  }
}
