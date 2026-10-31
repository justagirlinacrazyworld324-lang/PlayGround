import * as THREE from 'three'
import { createWorld, drawMinimap } from './world.js'
import { buildProps } from './props.js'
import { Game } from './game.js'
import { Sound } from './audio.js'

/* ────────────────────────────────────────────────────────────
   The Dollhouse — bootstrap, camera, input, HUD, menus.
   ──────────────────────────────────────────────────────────── */

const canvas = document.getElementById('scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.32
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0911)
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.08, 90)
scene.add(camera)
const camFill = new THREE.PointLight(0xffd6ae, 6.5, 8, 2)
camFill.position.set(0, 0.3, 0.6)
camera.add(camFill)

const sound = new Sound()

let world = null
let props = null
let propsReady = false
let pendingStart = false
let game = null
let state = 'boot' // boot | menu | playing | paused | ended
let role = 'survivor'
let difficulty = 'classic'
let lastTime = performance.now()
let menuTime = 0
let time = 0

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || window.innerWidth <= 760
if (isTouch) document.body.classList.add('touch-device')

/* ── DOM ───────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id)
const ui = {
  loading: $('loading'), loadFill: $('loadFill'),
  menu: $('menu'), start: $('start'), how: $('how'), howto: $('howto'), howClose: $('howClose'),
  hud: $('hud'), roleGlyph: $('roleGlyph'), roleLabel: $('roleLabel'), roleObjective: $('roleObjective'),
  boxPips: $('boxPips'), boxCount: $('boxCount'), timer: $('timer'), pauseBtn: $('pauseBtn'),
  team: $('team'), minimap: $('minimap'), hearts: $('hearts'), staminaFill: $('staminaFill'),
  stamina: $('stamina'), vitalLabel: $('vitalLabel'), prompt: $('prompt'), promptText: $('promptText'),
  promptFill: $('promptFill'), abilityBtn: $('abilityBtn'), abilityKey: $('abilityKey'),
  abilityName: $('abilityName'), abilityState: $('abilityState'), abilityCd: $('abilityCd'),
  toasts: $('toasts'), sense: $('sense'), touch: $('touch'),
  stick: $('stick'), knob: $('stickKnob'), tInteract: $('tInteract'), tSprint: $('tSprint'),
  tAbility: $('tAbility'), tAttack: $('tAttack'),
  pause: $('pause'), resume: $('resume'), restart: $('restart'), quit: $('quit'),
  end: $('end'), endEyebrow: $('endEyebrow'), endTitle: $('endTitle'), endLine: $('endLine'),
  endStats: $('endStats'), again: $('again'), change: $('change'),
  flash: $('flash'), blood: $('blood'), mapLabel: $('mapLabel'),
}
ui.touch.querySelectorAll('.tbtn').forEach(b => { b.disabled = false })

/* ── input state ───────────────────────────────────────── */
const input = {
  move: { x: 0, z: 0 }, sprint: false,
  interactHeld: false, interactPressed: false,
  attackPressed: false, abilityPressed: false,
}
const keys = new Set()
let camYaw = 0
let camPitch = 0.26
let camDist = 5.2
let dragging = false
let dragId = null
let lastPointer = { x: 0, y: 0 }
let stickPointer = null
let stickVec = { x: 0, y: 0 }
let lookTouch = null
let touchSprint = false
let suppressLook = false

function resetInput() {
  keys.clear()
  input.move.x = 0; input.move.z = 0
  input.sprint = false
  input.interactHeld = false
  input.interactPressed = false
  input.attackPressed = false
  input.abilityPressed = false
  stickVec.x = 0; stickVec.y = 0
  touchSprint = false
  if (ui.knob) ui.knob.style.transform = 'translate(0px, 0px)'
  ui.tSprint?.classList.remove('held')
}

/* ── camera helpers ────────────────────────────────────── */
const camPos = new THREE.Vector3(0, 6, 14)
const camLook = new THREE.Vector3(0, 1.5, 0)
const tmpV = new THREE.Vector3()

function cameraCollision(target, dist) {
  const cp = Math.cos(camPitch)
  const dx = Math.sin(camYaw) * cp
  const dz = Math.cos(camYaw) * cp
  const dy = Math.sin(camPitch)
  let best = 1
  for (let k = 0.18; k <= 1.0001; k += 0.035) {
    const x = target.x + dx * dist * k
    const y = target.y + dy * dist * k
    const z = target.z + dz * dist * k
    if (y > 3.95 || y < 0.35) { best = Math.max(0.2, k - 0.035); break }
    let blocked = false
    for (const c of world.colliders) {
      if (y < (c.h || 1.5) + 0.22 && x > c.x - c.hw - 0.22 && x < c.x + c.hw + 0.22 && z > c.z - c.hd - 0.22 && z < c.z + c.hd + 0.22) { blocked = true; break }
    }
    if (blocked) { best = Math.max(0.2, k - 0.035); break }
    best = k
  }
  return dist * best
}

function updateCamera(dt, instant = false) {
  if (!game || !game.player) return
  const p = game.player
  const isHunter = role === 'hunter'
  const shoulder = 0.48
  const target = {
    x: p.pos.x + Math.cos(camYaw) * shoulder,
    y: isHunter ? 1.78 : 1.12,
    z: p.pos.z - Math.sin(camYaw) * shoulder,
  }
  const baseDist = isHunter ? 6.0 : 5.2
  camDist += (baseDist - camDist) * Math.min(1, dt * 3)
  const dist = cameraCollision(target, camDist)
  const cp = Math.cos(camPitch)
  const desired = new THREE.Vector3(
    target.x + Math.sin(camYaw) * cp * dist,
    target.y + Math.sin(camPitch) * dist + 0.25,
    target.z + Math.cos(camYaw) * cp * dist,
  )
  if (instant) {
    camPos.copy(desired)
    camLook.set(target.x, target.y + 0.15, target.z)
  } else {
    const a = 1 - Math.exp(-dt * 11)
    // Snap across large gaps (teleports, walls appearing) instead of sweeping through geometry.
    if (camPos.distanceToSquared(desired) > 9) camPos.copy(desired)
    else camPos.lerp(desired, a)
    const lookDesired = new THREE.Vector3(target.x, target.y + 0.15, target.z)
    if (camLook.distanceToSquared(lookDesired) > 9) camLook.copy(lookDesired)
    else camLook.lerp(lookDesired, 1 - Math.exp(-dt * 14))
  }
  // shake
  const shake = game.shake || 0
  const sx = shake ? (Math.random() - 0.5) * shake * 0.18 : 0
  const sy = shake ? (Math.random() - 0.5) * shake * 0.14 : 0
  camera.position.set(camPos.x + sx, Math.max(0.45, camPos.y + sy), camPos.z)
  camera.lookAt(camLook)
  const targetFov = p.sprinting && role === 'survivor' ? 63 : 58
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 5)
  camera.updateProjectionMatrix()
}

function menuCamera(dt) {
  menuTime += dt
  const yaw = menuTime * 0.055
  const target = new THREE.Vector3(0, 1.7, 1.5)
  const desired = new THREE.Vector3(
    target.x + Math.sin(yaw) * 12.5,
    4.1 + Math.sin(menuTime * 0.21) * 0.35,
    target.z + Math.cos(yaw) * 12.5,
  )
  camPos.lerp(desired, 1 - Math.exp(-dt * 1.5))
  camLook.lerp(target, 1 - Math.exp(-dt * 2))
  camera.position.copy(camPos)
  camera.lookAt(camLook)
}

/* ── UI helpers ────────────────────────────────────────── */
let toastCount = 0
function toast(text, kind = '') {
  if (!text) return
  const el = document.createElement('div')
  el.className = `toast ${kind}`
  el.textContent = text
  ui.toasts.appendChild(el)
  toastCount++
  while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove()
  setTimeout(() => { el.remove(); toastCount = Math.max(0, toastCount - 1) }, 3300)
}

function flash(kind = 'hurt') {
  ui.flash.classList.add('on')
  setTimeout(() => ui.flash.classList.remove('on'), 90)
  if (kind === 'downed' || kind === 'shatter') {
    ui.blood.classList.add('on')
    setTimeout(() => ui.blood.classList.remove('on'), 900)
  }
}

function buildTeam() {
  ui.team.innerHTML = ''
  for (const s of game.survivors) {
    const el = document.createElement('div')
    el.className = 'teammate' + (s.isPlayer ? ' you' : '')
    el.dataset.id = s.id
    el.innerHTML = `<span class="doll-face"></span><span class="tinfo"><span class="tname">${s.name}${s.isPlayer ? ' · you' : ''}</span><span class="tstate">Healthy</span></span>`
    ui.team.appendChild(el)
  }
}

function updateTeam() {
  for (const s of game.survivors) {
    const el = ui.team.querySelector(`[data-id="${s.id}"]`)
    if (!el) continue
    el.className = 'teammate' + (s.isPlayer ? ' you' : '')
    let label = 'Healthy'
    if (s.status === 'injured') { el.classList.add('injured'); label = 'Cracked' }
    else if (s.status === 'downed') { el.classList.add('downed'); label = `Downed ${Math.ceil(s.downedTimer)}s` }
    else if (s.status === 'shattered') { el.classList.add('shattered'); label = 'On the shelf' }
    else if (s.status === 'escaped') { el.classList.add('escaped'); label = 'Escaped' }
    else if (s.hidden) { el.classList.add('hidden'); label = 'Hidden' }
    if (s.ping > 0 && role === 'hunter' && s.status !== 'shattered' && s.status !== 'escaped') el.classList.add('ping')
    el.querySelector('.tstate').textContent = label
  }
}

function setRoleUI() {
  document.body.classList.toggle('hunter', role === 'hunter')
  document.body.classList.toggle('survivor', role === 'survivor')
  ui.hud.classList.toggle('hunter', role === 'hunter')
  ui.roleGlyph.textContent = role === 'hunter' ? '✂' : '❦'
  ui.roleLabel.textContent = role === 'hunter' ? 'You are the Dollmaker' : 'You are a doll'
  ui.abilityName.textContent = role === 'hunter' ? 'Thread Sense' : "Doll's Grace"
  ui.mapLabel.textContent = role === 'hunter' ? 'The house' : 'Dollhouse'
  ui.hearts.style.display = role === 'hunter' ? 'none' : 'flex'
  ui.stamina.parentElement.style.display = role === 'hunter' ? 'none' : 'flex'
  ui.vitalLabel.textContent = role === 'hunter' ? 'The house is listening' : 'Healthy'
  ui.abilityBtn.style.display = ''
  if (role === 'hunter') {
    ui.abilityKey.textContent = 'Q'
    ui.tAttack.style.display = 'grid'
    ui.tSprint.style.display = 'none'
  } else {
    ui.tAttack.style.display = 'none'
    ui.tSprint.style.display = 'grid'
  }
}

/* ── HUD update ────────────────────────────────────────── */
let hudTimer = 0
function updateHud(dt) {
  if (!game) return
  hudTimer -= dt
  if (hudTimer > 0) return
  hudTimer = 0.1

  const done = game.boxes.filter(b => b.done).length
  const pips = ui.boxPips.children
  for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('done', i < done)
  ui.boxCount.textContent = `${done} / 5`

  const m = Math.floor(game.timeLeft / 60)
  const s = Math.floor(game.timeLeft % 60)
  ui.timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  ui.timer.parentElement.classList.toggle('urgent', game.timeLeft < 60)

  if (role === 'survivor') {
    const p = game.player
    const objective = game.world.gate.open ? 'Escape through the front door'
      : game.world.gate.unlocked ? 'Open the front door'
        : 'Wind five music boxes'
    ui.roleObjective.textContent = objective
    const sh = p.status === 'shattered' || p.status === 'escaped'
    const health = sh ? 0 : p.status === 'healthy' ? 2 : p.status === 'injured' ? 1 : 0
    const hearts = ui.hearts.children
    for (let i = 0; i < hearts.length; i++) hearts[i].classList.toggle('empty', i >= health)
    ui.vitalLabel.textContent = p.status === 'downed' ? 'Downed — crawl' : p.status === 'injured' ? 'Cracked' : p.status === 'shattered' ? 'Shattered' : p.status === 'escaped' ? 'Escaped' : 'Healthy'
    ui.vitalLabel.classList.toggle('hurt', p.status !== 'healthy' && p.status !== 'escaped')
    ui.staminaFill.style.width = `${Math.round(p.stamina * 100)}%`
    ui.stamina.classList.toggle('low', p.stamina < 0.25)
    const cd = Math.ceil(p.abilityCd)
    ui.abilityState.textContent = p.abilityCd > 0 ? `${cd}s` : 'Ready'
    ui.abilityBtn.classList.toggle('cooling', p.abilityCd > 0)
    ui.abilityCd.style.width = `${p.abilityCd > 0 ? (1 - p.abilityCd / 22) * 100 : 100}%`
  } else {
    const shattered = game.survivors.filter(x => x.status === 'shattered').length
    const escaped = game.survivors.filter(x => x.status === 'escaped').length
    ui.roleObjective.textContent = `${shattered} on the shelf · ${escaped} escaped`
    const h = game.hunter
    const cd = Math.ceil(h.senseCd)
    ui.abilityState.textContent = h.senseTime > 0 ? 'Listening…' : h.senseCd > 0 ? `${cd}s` : 'Ready'
    ui.abilityBtn.classList.toggle('cooling', h.senseCd > 0)
    ui.abilityCd.style.width = `${h.senseCd > 0 ? (1 - h.senseCd / game.diff.senseCd) * 100 : 100}%`
    ui.vitalLabel.textContent = h.senseTime > 0 ? 'Every stitch is listening' : 'Hunt them'
  }

  // prompt
  if (game.prompt && game.prompt.show) {
    ui.prompt.classList.remove('hidden')
    ui.promptText.textContent = game.prompt.text
    ui.prompt.querySelector('kbd').style.display = game.prompt.key ? '' : 'none'
    if (game.prompt.key && game.prompt.key !== 'E') ui.prompt.querySelector('kbd').textContent = 'E'
    ui.promptFill.style.width = `${Math.max(0, Math.min(1, game.prompt.progress || 0)) * 100}%`
  } else {
    ui.prompt.classList.add('hidden')
  }

  // sense banner
  const sensing = game.hunter && game.hunter.senseTime > 0
  ui.sense.classList.toggle('hidden', !sensing)
  if (sensing) ui.sense.childNodes[1].textContent = role === 'hunter' ? 'Every stitch is listening' : 'The Maker is listening'

  updateTeam()
  drawMinimap(game.world, game.player, game.survivors, game.boxes, game.hunter, role)
}

/* ── screens ───────────────────────────────────────────── */
function showMenu() {
  state = 'menu'
  if (world) world.root.visible = false
  ui.menu.classList.remove('hidden')
  ui.howto.classList.add('hidden')
  ui.pause.classList.add('hidden')
  ui.end.classList.add('hidden')
  ui.hud.classList.add('hidden')
  ui.touch.classList.add('hidden')
  ui.loading.classList.add('hidden')
  document.body.classList.remove('hunter', 'survivor')
  resetInput()
  if (document.pointerLockElement) document.exitPointerLock()
  sound.stopMusic(1.5)
}

function startGame() {
  if (game) game.destroy()
  sound.init()
  sound.startMusic()
  state = 'playing'
  ui.menu.classList.add('hidden')
  ui.howto.classList.add('hidden')
  ui.pause.classList.add('hidden')
  ui.end.classList.add('hidden')
  ui.hud.classList.remove('hidden')
  ui.loading.classList.add('hidden')
  if (isTouch) ui.touch.classList.remove('hidden')
  setRoleUI()
  resetInput()

  if (world) world.root.visible = true
  game = new Game(scene, world, sound, {
    role, difficulty,
    onToast: toast,
    onEvent: handleEvent,
  })
  game.cameraYaw = camYaw
  camYaw = 0
  camPitch = role === 'hunter' ? 0.3 : 0.24
  camDist = role === 'hunter' ? 6.0 : 5.2
  updateCamera(1, true)
  buildTeam()
  updateHud(1)
  lastTime = performance.now()
  if (!isTouch) {
    try { canvas.requestPointerLock() } catch { /* drag fallback */ }
  }
  if (role === 'survivor') toast('Wind five music boxes. Do not let him hear you.', 'gold')
  else toast('Listen. The house tells you where they are.', 'gold')
}

function pauseGame() {
  if (state !== 'playing') return
  state = 'paused'
  game.paused = true
  ui.pause.classList.remove('hidden')
  ui.touch.classList.add('hidden')
  if (document.pointerLockElement) document.exitPointerLock()
  sound.stopMusic(0.5)
}

function resumeGame() {
  if (state !== 'paused') return
  state = 'playing'
  game.paused = false
  ui.pause.classList.add('hidden')
  if (isTouch) ui.touch.classList.remove('hidden')
  sound.startMusic()
  lastTime = performance.now()
  if (!isTouch) {
    try { canvas.requestPointerLock() } catch { /* ignore */ }
  }
}

function quitToMenu() {
  if (game) { game.destroy(); game = null }
  ui.pause.classList.add('hidden')
  ui.hud.classList.add('hidden')
  ui.touch.classList.add('hidden')
  ui.end.classList.add('hidden')
  showMenu()
}

function handleEvent(kind, data) {
  if (kind === 'hurt') flash('hurt')
  else if (kind === 'downed') flash('downed')
  else if (kind === 'shatter') {
    if (data && data.isPlayer) flash('shatter')
    else flash('hurt')
  } else if (kind === 'end') {
    showEnd(data)
  } else if (kind === 'sense') {
    if (role === 'survivor') flash('hurt')
  }
}

function showEnd(data) {
  state = 'ended'
  if (game) game.paused = true
  if (document.pointerLockElement) document.exitPointerLock()
  setTimeout(() => {
    ui.hud.classList.add('hidden')
    ui.touch.classList.add('hidden')
    ui.end.classList.remove('hidden')
    ui.endEyebrow.textContent = role === 'survivor' ? 'Your night in the dollhouse' : 'The night in the dollhouse'
    ui.endTitle.textContent = data.title
    ui.endTitle.style.color = data.tone === 'bad' ? '#ff9fae' : data.tone === 'good' ? '#f0d39a' : '#f4e8d5'
    ui.endLine.textContent = data.line
    const mm = Math.floor(data.time / 60)
    const ss = Math.floor(data.time % 60)
    ui.endStats.innerHTML = `
      <div class="end-stat"><b>${data.boxes}/5</b><span>boxes wound</span></div>
      <div class="end-stat"><b>${data.shattered}</b><span>on the shelf</span></div>
      <div class="end-stat"><b>${data.escaped}</b><span>escaped</span></div>
      <div class="end-stat"><b>${mm}:${String(ss).padStart(2, '0')}</b><span>time</span></div>`
  }, 650)
}

/* ── event wiring ──────────────────────────────────────── */
ui.pauseBtn.addEventListener('click', () => {
  if (state !== 'playing') return
  sound.ui()
  pauseGame()
})

document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.role-card').forEach(c => {
      c.classList.remove('selected')
      c.setAttribute('aria-checked', 'false')
    })
    card.classList.add('selected')
    card.setAttribute('aria-checked', 'true')
    role = card.dataset.role
    sound.init()
    sound.ui()
  })
})
document.querySelectorAll('.difficulty button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.difficulty button').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
    difficulty = b.dataset.diff
    sound.init()
    sound.ui()
  })
})
function requestStart() {
  sound.init()
  sound.ui()
  if (!propsReady) { pendingStart = true; return }
  startGame()
}
ui.start.addEventListener('click', requestStart)
ui.how.addEventListener('click', () => { sound.ui(); ui.howto.classList.remove('hidden') })
ui.howClose.addEventListener('click', () => { sound.ui(); ui.howto.classList.add('hidden') })
ui.howto.addEventListener('click', (e) => { if (e.target === ui.howto) ui.howto.classList.add('hidden') })
ui.abilityBtn.addEventListener('click', () => { input.abilityPressed = true })
ui.resume.addEventListener('click', () => { sound.ui(); resumeGame() })
ui.restart.addEventListener('click', () => { sound.ui(); if (game) { game.destroy(); game = null } startGame() })
ui.quit.addEventListener('click', () => { sound.ui(); quitToMenu() })
ui.again.addEventListener('click', () => { sound.ui(); if (game) { game.destroy(); game = null } startGame() })
ui.change.addEventListener('click', () => { sound.ui(); if (game) { game.destroy(); game = null } ui.end.classList.add('hidden'); showMenu() })

/* ── keyboard ──────────────────────────────────────────── */
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (state === 'playing') { pauseGame(); return }
    if (state === 'paused') { resumeGame(); return }
  }
  if (state !== 'playing') return
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault()
  keys.add(e.code)
  if (e.code === 'KeyE' && !e.repeat) {
    input.interactPressed = true
    input.interactHeld = true
  }
  if (e.code === 'KeyQ' && !e.repeat) input.abilityPressed = true
  if (e.code === 'Space' && role === 'hunter' && !e.repeat) input.attackPressed = true
  if (e.code === 'KeyM' && !e.repeat) sound.setMuted(!sound.muted)
})
window.addEventListener('keyup', (e) => {
  keys.delete(e.code)
  if (e.code === 'KeyE') input.interactHeld = false
})
window.addEventListener('blur', () => { keys.clear(); input.interactHeld = false })

/* ── pointer / look ────────────────────────────────────── */
function lookDelta(dx, dy) {
  camYaw -= dx * 0.0027
  camPitch = Math.max(-0.12, Math.min(0.92, camPitch + dy * 0.0021))
}

canvas.addEventListener('mousedown', (e) => {
  if (state !== 'playing' || isTouch) return
  if (document.pointerLockElement === canvas) {
    if (role === 'hunter' && e.button === 0) input.attackPressed = true
    return
  }
  if (e.button === 0) {
    dragging = true
    dragId = 'mouse'
    lastPointer = { x: e.clientX, y: e.clientY }
  }
})
window.addEventListener('mousemove', (e) => {
  if (state !== 'playing') return
  if (document.pointerLockElement === canvas) {
    lookDelta(e.movementX || 0, e.movementY || 0)
  } else if (dragging) {
    const dx = e.clientX - lastPointer.x
    const dy = e.clientY - lastPointer.y
    lastPointer = { x: e.clientX, y: e.clientY }
    lookDelta(dx, dy)
  }
})
window.addEventListener('mouseup', () => { dragging = false; dragId = null })
canvas.addEventListener('click', () => {
  if (state === 'playing' && !isTouch && document.pointerLockElement !== canvas && role === 'hunter') {
    // clicking without lock still strikes; drag-look is still available
    if (!dragging) input.attackPressed = true
  }
})
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && state === 'playing' && !isTouch) {
    // user pressed Esc or lost the lock
    pauseGame()
  }
})
canvas.addEventListener('contextmenu', (e) => e.preventDefault())

/* ── touch ─────────────────────────────────────────────── */
function stickStart(e) {
  if (state !== 'playing') return
  e.preventDefault()
  stickPointer = e.pointerId
  ui.stick.setPointerCapture(e.pointerId)
  stickMove(e)
}
function stickMove(e) {
  if (e.pointerId !== stickPointer) return
  const rect = ui.stick.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  let dx = e.clientX - cx
  let dy = e.clientY - cy
  const max = rect.width * 0.34
  const len = Math.hypot(dx, dy)
  if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max }
  ui.knob.style.transform = `translate(${dx}px, ${dy}px)`
  stickVec.x = dx / max
  stickVec.y = dy / max
}
function stickEnd(e) {
  if (e.pointerId !== stickPointer) return
  stickPointer = null
  stickVec.x = 0; stickVec.y = 0
  ui.knob.style.transform = 'translate(0px, 0px)'
}
ui.stick.addEventListener('pointerdown', stickStart)
ui.stick.addEventListener('pointermove', stickMove)
ui.stick.addEventListener('pointerup', stickEnd)
ui.stick.addEventListener('pointercancel', stickEnd)

function isControlTarget(t) {
  return t.closest && t.closest('#stick, .tbtn, .screen, .sheet, #abilityBtn')
}
window.addEventListener('pointerdown', (e) => {
  if (!isTouch || state !== 'playing') return
  if (e.pointerType === 'mouse') return
  if (isControlTarget(e.target)) return
  lookTouch = e.pointerId
  lastPointer = { x: e.clientX, y: e.clientY }
}, { passive: true })
window.addEventListener('pointermove', (e) => {
  if (!isTouch || state !== 'playing') return
  if (e.pointerId !== lookTouch) return
  const dx = e.clientX - lastPointer.x
  const dy = e.clientY - lastPointer.y
  lastPointer = { x: e.clientX, y: e.clientY }
  lookDelta(dx, dy)
}, { passive: true })
window.addEventListener('pointerup', (e) => { if (e.pointerId === lookTouch) lookTouch = null })
window.addEventListener('pointercancel', (e) => { if (e.pointerId === lookTouch) lookTouch = null })

function holdButton(el, onDown, onUp) {
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onDown() })
  el.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); onUp && onUp() })
  el.addEventListener('pointercancel', () => { onUp && onUp() })
  el.addEventListener('pointerleave', () => { onUp && onUp() })
}
holdButton(ui.tInteract, () => { input.interactPressed = true; input.interactHeld = true }, () => { input.interactHeld = false })
holdButton(ui.tAttack, () => { input.attackPressed = true }, null)
holdButton(ui.tAbility, () => { input.abilityPressed = true }, null)
holdButton(ui.tSprint, () => { touchSprint = true; ui.tSprint.classList.add('held') }, () => { touchSprint = false; ui.tSprint.classList.remove('held') })

/* ── resize ────────────────────────────────────────────── */
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.6 : 2)
  renderer.setPixelRatio(dpr)
})

/* ── boot ──────────────────────────────────────────────── */
async function boot() {
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)))
  ui.loadFill.style.width = '22%'
  await new Promise(r => setTimeout(r, 40))
  world = createWorld(scene)
  ui.loadFill.style.width = '52%'

  // pips + hearts before the menu can be clicked
  ui.boxPips.innerHTML = ''
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('i')
    p.className = 'pip'
    ui.boxPips.appendChild(p)
  }
  ui.hearts.innerHTML = '<span class="heart">♥</span><span class="heart">♥</span>'

  ui.loadFill.style.width = '100%'
  await new Promise(r => setTimeout(r, 180))
  ui.loading.classList.add('hidden')
  showMenu()
  window.__DOLLHOUSE_STATE = () => state
  window.__DOLLHOUSE_GAME = () => game

  // Set the table after the menu is already interactive.
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)))
  props = buildProps(world)
  world.boxes = props.boxes
  world.chests = props.chests
  propsReady = true
  window.__DOLLHOUSE_READY = true
  if (pendingStart) {
    pendingStart = false
    startGame()
  }
}

/* ── loop ──────────────────────────────────────────────── */
function frame(now) {
  requestAnimationFrame(frame)
  const rawDt = Math.min(0.06, (now - lastTime) / 1000 || 0.016)
  lastTime = now
  time += rawDt
  const dt = state === 'playing' || state === 'paused' ? Math.min(rawDt, 0.05) : rawDt

  if (state === 'menu') {
    menuCamera(dt)
    world?.update(dt, time)
    renderer.render(scene, camera)
    return
  }
  if (state === 'boot') {
    renderer.render(scene, camera)
    return
  }

  if (game) {
    if (state === 'playing') {
      // build movement vector
      let f = 0, r = 0
      if (isTouch) {
        f = -stickVec.y
        r = stickVec.x
      }
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1
      if (keys.has('KeyD') || keys.has('ArrowRight')) r += 1
      if (keys.has('KeyA') || keys.has('ArrowLeft')) r -= 1
      const len = Math.hypot(f, r)
      if (len > 1) { f /= len; r /= len }
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw)
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw)
      input.move.x = fx * f + rx * r
      input.move.z = fz * f + rz * r
      input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || touchSprint
      game.cameraYaw = camYaw
      game.update(dt, time, input)
      input.interactPressed = false
      input.attackPressed = false
      input.abilityPressed = false
      updateCamera(dt)
      updateHud(dt)
      const p = game.player
      const h = game.hunter
      let hd = 99
      if (p && h) hd = Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z)
      sound.update(dt, {
        active: true,
        hunterDist: hd,
        sense: h.senseTime > 0,
        role,
        moving: p && p.speed > 0.4,
        hunter: role === 'hunter',
        hidden: role === 'survivor' ? game.player.hidden : false,
      })
    } else {
      updateCamera(0)
    }
    world.update(dt, time)
  }
  renderer.render(scene, camera)
}
requestAnimationFrame(frame)

boot().catch(err => {
  console.error(err)
  ui.loading.classList.remove('hidden')
  ui.loading.innerHTML = `<div class="loader"><p>Something broke in the dollhouse.</p><p style="font-size:11px;opacity:.6">${err.message}</p></div>`
})

window.__DOLLHOUSE_API = { startGame, pauseGame, resumeGame, get game() { return game } }
window.__DOLLHOUSE_DEBUG = {
  setCamera(yaw, pitch) { camYaw = yaw; camPitch = pitch },
  setDistance(d) { camDist = d },
  teleport(x, z) {
    if (!game || !game.player) return
    game.player.pos.x = x
    game.player.pos.z = z
    game.player.doll.root.position.set(x, 0, z)
  },
  pos() { return game?.player?.pos },
  camera() { return { camYaw, camPitch, camDist } },
  cameraPos() { return { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: camYaw, pitch: camPitch, dist: camDist } },
  snapCamera() { updateCamera(1, true) },
  raycast(nx, ny) {
    const rc = new THREE.Raycaster()
    rc.setFromCamera(new THREE.Vector2(nx, ny), camera)
    return rc.intersectObjects(scene.children, true).slice(0, 6).map(h => ({
      dist: +h.distance.toFixed(2),
      geo: h.object.geometry?.type,
      color: h.object.material?.color?.getHexString?.(),
      name: h.object.name || h.object.parent?.name || '',
      pos: { x: +h.point.x.toFixed(2), y: +h.point.y.toFixed(2), z: +h.point.z.toFixed(2) },
    }))
  },
}
