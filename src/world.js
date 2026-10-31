import * as THREE from 'three'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import {
  wallpaper, woodFloor, checkerTile, rugTexture, fabric, portrait, glowTexture, makeDust, nightView, mirrorTexture,
} from './textures.js'

export const WALL_H = 4.2
export const WORLD = 19
const WALL_T = 0.5

export const ROOMS = [
  { id: 'nursery', name: 'Nursery', x1: -19, z1: -19, x2: -6, z2: -0.3, wall: 'nursery' },
  { id: 'workshop', name: 'Workshop', x1: -19, z1: 0.3, x2: -6, z2: 19, wall: 'workshop' },
  { id: 'kitchen', name: 'Kitchen', x1: 6, z1: -19, x2: 19, z2: -0.3, wall: 'kitchen' },
  { id: 'parlor', name: 'Parlor', x1: 6, z1: 0.3, x2: 19, z2: 19, wall: 'parlor' },
  { id: 'hall', name: 'Great Hall', x1: -6, z1: -11, x2: 6, z2: 11, wall: 'hall' },
  { id: 'foyer', name: 'Front Hall', x1: -6, z1: -19, x2: 6, z2: -11, wall: 'hall' },
  { id: 'south', name: 'Morning Room', x1: -6, z1: 11, x2: 6, z2: 19, wall: 'hall' },
]

const BOX_POSITIONS = [
  { id: 0, x: -14, z: -12.5, room: 'Nursery' },
  { id: 1, x: 8.6, z: -17.6, room: 'Kitchen' },
  { id: 2, x: -16.8, z: 14.2, room: 'Workshop' },
  { id: 3, x: 15.6, z: 7.2, room: 'Parlor' },
  { id: 4, x: 0, z: 7.2, room: 'Great Hall' },
]

const CHEST_POSITIONS = [
  { id: 0, x: -8.6, z: -16.8, rot: Math.PI * 0.5, room: 'Nursery' },
  { id: 1, x: 17.2, z: -4.2, rot: -Math.PI * 0.5, room: 'Kitchen' },
  { id: 2, x: -17.2, z: 4.2, rot: Math.PI * 0.5, room: 'Workshop' },
  { id: 3, x: 8.6, z: 16.8, rot: Math.PI, room: 'Parlor' },
  { id: 4, x: -4.6, z: 9.2, rot: Math.PI * 0.5, room: 'Great Hall' },
  { id: 5, x: 4.6, z: -16.6, rot: -Math.PI * 0.5, room: 'Front Hall' },
]

export function createWorld(scene) {
  const root = new THREE.Group()
  root.name = 'dollhouse'
  scene.add(root)

  const colliders = []
  const walls = []
  const doorways = []
  const animators = []
  const lights = []

  /* ── materials ─────────────────────────────────────────── */
  const texWall = {
    nursery: wallpaper('#d9bfc4', '#b17e8e', '#f2dfe3', [2.4, 1.6]),
    kitchen: wallpaper('#bfcbb8', '#7c9485', '#e8eddf', [2.4, 1.6]),
    workshop: wallpaper('#b59b74', '#7d6141', '#dcc9a6', [2.4, 1.6]),
    parlor: wallpaper('#6b2a3d', '#3d1524', '#8d455c', [2.4, 1.6]),
    hall: wallpaper('#cbbd9d', '#a8946d', '#efe5cc', [2.4, 1.6]),
  }
  const matWall = {}
  for (const k of Object.keys(texWall)) {
    matWall[k] = new THREE.MeshStandardMaterial({ map: texWall[k], roughness: 0.92, metalness: 0 })
  }
  const matWood = new THREE.MeshStandardMaterial({ map: woodFloor(), roughness: 0.72, metalness: 0.02 })
  const matTile = new THREE.MeshStandardMaterial({ map: checkerTile(), roughness: 0.55, metalness: 0.03 })
  const matTrim = new THREE.MeshStandardMaterial({ color: 0x2c1b1c, roughness: 0.62, metalness: 0.05 })
  const matTrimLight = new THREE.MeshStandardMaterial({ color: 0x4a3030, roughness: 0.7 })
  const matBrass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.28, metalness: 0.85 })
  const matBrassDark = new THREE.MeshStandardMaterial({ color: 0x6d5128, roughness: 0.4, metalness: 0.7 })
  const matIron = new THREE.MeshStandardMaterial({ color: 0x2c2a2c, roughness: 0.45, metalness: 0.6 })
  const matPorcelain = new THREE.MeshPhysicalMaterial({
    color: 0xf1e2ce, roughness: 0.26, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.28,
  })
  const matVelvet = new THREE.MeshStandardMaterial({ map: fabric('#6d1f35'), roughness: 0.94 })
  const matVelvetGreen = new THREE.MeshStandardMaterial({ map: fabric('#2f4a42'), roughness: 0.94 })
  const matCream = new THREE.MeshStandardMaterial({ color: 0xe8dcc6, roughness: 0.85 })
  const matDark = new THREE.MeshStandardMaterial({ color: 0x1c1317, roughness: 0.75 })
  const matBlack = new THREE.MeshStandardMaterial({ color: 0x0e0a0d, roughness: 0.9 })
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xa9c6cf, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.28,
    transmission: 0.4, side: THREE.DoubleSide,
  })
  const matPaper = new THREE.MeshStandardMaterial({ color: 0xd9cbb0, roughness: 0.95 })
  const matMirror = new THREE.MeshStandardMaterial({
    map: mirrorTexture(), color: 0xc4cdd0, roughness: 0.16, metalness: 0.45,
  })

  const rugMats = [
    new THREE.MeshStandardMaterial({ map: rugTexture('#6d2039', '#d8b87a', '#2c1520'), roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ map: rugTexture('#283f3b', '#c9a86a', '#14201e'), roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ map: rugTexture('#4a2c4e', '#cba8b8', '#241426'), roughness: 0.96 }),
  ]

  const glowWarm = new THREE.SpriteMaterial({
    map: glowTexture('255,208,140'), color: 0xffd9a0, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const glowCool = new THREE.SpriteMaterial({
    map: glowTexture('170,210,255'), color: 0xa8c8ff, transparent: true, opacity: 0.32,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })

  /* ── helpers ───────────────────────────────────────────── */
  function mesh(geo, mat, x = 0, y = 0, z = 0, ry = 0, parent = root) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.rotation.y = ry
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  function box(w, h, d, mat, x, y, z, ry = 0, parent = root, rounded = false) {
    const geo = rounded ? new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.14) : new THREE.BoxGeometry(w, h, d)
    return mesh(geo, mat, x, y, z, ry, parent)
  }
  function cylinder(rt, rb, h, mat, x, y, z, seg = 16, parent = root) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, 0, parent)
  }
  function sphere(r, mat, x, y, z, parent = root, sx = 1, sy = 1, sz = 1) {
    const m = mesh(new THREE.SphereGeometry(r, 20, 16), mat, x, y, z, 0, parent)
    m.scale.set(sx, sy, sz)
    return m
  }
  function plane(w, h, mat, x, y, z, rx = -Math.PI / 2, ry = 0, parent = root) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    m.rotation.x = rx
    m.rotation.y = ry
    m.position.set(x, y, z)
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  function collider(x, z, w, d, tag = 'prop', h = 1.5) {
    colliders.push({ x, z, hw: w / 2, hd: d / 2, tag, h })
  }
  function sprite(mat, x, y, z, scale = 3, parent = root) {
    const s = new THREE.Sprite(mat.clone())
    s.position.set(x, y, z)
    s.scale.set(scale, scale, 1)
    parent.add(s)
    return s
  }

  /* ── floors & ceilings ─────────────────────────────────── */
  for (const r of ROOMS) {
    const w = r.x2 - r.x1
    const d = r.z2 - r.z1
    const mat = r.id === 'kitchen' ? matTile : matWood
    const f = plane(w, d, mat, (r.x1 + r.x2) / 2, 0.012, (r.z1 + r.z2) / 2)
    f.receiveShadow = true
    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x3a2b32, roughness: 1 }))
    ceil.rotation.x = Math.PI / 2
    ceil.position.set((r.x1 + r.x2) / 2, WALL_H - 0.01, (r.z1 + r.z2) / 2)
    root.add(ceil)
  }

  /* ── walls ─────────────────────────────────────────────── */
  function wall(x1, z1, x2, z2, mat, tag = 'wall') {
    const w = Math.max(Math.abs(x2 - x1), WALL_T)
    const d = Math.max(Math.abs(z2 - z1), WALL_T)
    const cx = (x1 + x2) / 2
    const cz = (z1 + z2) / 2
    const m = box(w, WALL_H, d, mat, cx, WALL_H / 2, cz)
    m.castShadow = true
    m.receiveShadow = true
    // baseboard + crown
    box(w + 0.04, 0.34, d + 0.04, matTrim, cx, 0.17, cz)
    box(w + 0.08, 0.18, d + 0.08, matTrimLight, cx, WALL_H - 0.12, cz)
    colliders.push({ x: cx, z: cz, hw: w / 2 + 0.02, hd: d / 2 + 0.02, tag, h: WALL_H })
    walls.push({ x1: Math.min(x1, x2) - WALL_T / 2, z1: Math.min(z1, z2) - WALL_T / 2, x2: Math.max(x1, x2) + WALL_T / 2, z2: Math.max(z1, z2) + WALL_T / 2 })
  }
  function lintel(x, z, w, d) {
    box(w, 0.85, d, matWall.hall, x, WALL_H - 0.42, z)
    box(w + 0.16, 0.18, d + 0.16, matTrim, x, WALL_H - 0.92, z)
  }

  const wallHall = matWall.hall
  const wallNursery = matWall.nursery
  const wallKitchen = matWall.kitchen
  const wallWorkshop = matWall.workshop
  const wallParlor = matWall.parlor

  // outer shell
  wall(-19, -19, -1.6, -19, wallHall, 'outer')
  wall(1.6, -19, 19, -19, wallHall, 'outer')
  wall(-19, 19, 19, 19, wallHall, 'outer')
  wall(-19, -19, -19, 19, wallHall, 'outer')
  wall(19, -19, 19, 19, wallHall, 'outer')
  doorways.push({ x: 0, z: -19, w: 3.2, d: 0.6, axis: 'x' })
  lintel(0, -19, 3.2, 0.5)

  // hall / foyer + south room
  wall(-6, -11, -1.4, -11, wallHall)
  wall(1.4, -11, 6, -11, wallHall)
  lintel(0, -11, 2.8, 0.5)
  doorways.push({ x: 0, z: -11, w: 2.8, d: 0.5, axis: 'x' })
  wall(-6, 11, -1.4, 11, wallHall)
  wall(1.4, 11, 6, 11, wallHall)
  lintel(0, 11, 2.8, 0.5)
  doorways.push({ x: 0, z: 11, w: 2.8, d: 0.5, axis: 'x' })

  // vertical partitions, with two doors per side
  for (const [x, mat] of [[-6, wallNursery], [6, wallKitchen]]) {
    wall(x, -19, x, -11, mat)
    wall(x, -11, x, -7.2, mat)
    wall(x, -4.8, x, -0.3, mat)
    wall(x, 0.3, x, 4.8, mat)
    wall(x, 7.2, x, 11, mat)
    wall(x, 11, x, 19, mat)
    doorways.push({ x, z: -6, w: 2.4, d: 0.5, axis: 'z' })
    doorways.push({ x, z: 6, w: 2.4, d: 0.5, axis: 'z' })
    lintel(x, -6, 0.5, 2.4)
    lintel(x, 6, 0.5, 2.4)
  }

  // horizontal room dividers at z=0 on both sides
  wall(-19, 0, -6, 0, wallWorkshop)
  wall(6, 0, 19, 0, wallParlor)

  /* ── rugs ──────────────────────────────────────────────── */
  plane(8.4, 8.4, rugMats[0], -12.6, 0.02, -9.5)
  plane(7.6, 7.6, rugMats[1], 12.8, 0.02, -9.6)
  plane(8.2, 8.2, rugMats[2], -12.4, 0.02, 10.2)
  plane(8.4, 8.4, rugMats[0], 12.6, 0.02, 10.6)
  plane(3.4, 15.6, rugMats[0], 0, 0.025, 0.5)
  plane(3.2, 5.4, rugMats[1], 0, 0.025, 15)

  /* ── windows ───────────────────────────────────────────── */
  function windowUnit(x, z, ry, w = 2.4) {
    const g = new THREE.Group()
    g.position.set(x, 2.3, z)
    g.rotation.y = ry
    root.add(g)
    box(w, 2.2, 0.12, matTrim, 0, 0, 0, 0, g)
    const view = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 1.9), new THREE.MeshBasicMaterial({ map: nightView(), color: 0xb8c8e0 }))
    view.position.z = 0.04
    g.add(view)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 1.9), matGlass)
    glass.position.z = 0.08
    g.add(glass)
    box(w - 0.28, 0.09, 0.16, matTrim, 0, 0, 0.04, 0, g)
    box(0.09, 1.9, 0.16, matTrim, 0, 0, 0.04, 0, g)
    // moon glow
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, 1.8), new THREE.MeshBasicMaterial({ color: 0x9fb6d8, transparent: true, opacity: 0.22 }))
    glow.position.z = 0.11
    g.add(glow)
    sprite(glowCool, x, 2.3, z, 3.6)
  }
  windowUnit(-14, -18.72, 0, 3)
  windowUnit(14, -18.72, 0, 3)
  windowUnit(-18.72, -12, Math.PI / 2, 3)
  windowUnit(18.72, 12, -Math.PI / 2, 3)
  windowUnit(-4.2, 18.72, Math.PI, 2.2)
  windowUnit(4.2, 18.72, Math.PI, 2.2)

  /* ── room signs & sconces ──────────────────────────────── */
  function sconce(x, z, ry, color = 0xffb86b) {
    const g = new THREE.Group()
    g.position.set(x, 2.5, z)
    g.rotation.y = ry
    root.add(g)
    cylinder(0.06, 0.06, 0.5, matBrassDark, 0, 0, 0, 8, g)
    box(0.1, 0.16, 0.34, matBrass, 0, 0.2, 0.15, 0, g)
    const bulb = sphere(0.09, new THREE.MeshBasicMaterial({ color }), 0, 0.3, 0.28, g)
    bulb.castShadow = false
    sprite(glowWarm, x + Math.sin(ry) * 0.3, 2.85, z + Math.cos(ry) * 0.3, 1.9)
    const l = new THREE.PointLight(color, 9, 7, 2)
    l.position.set(x + Math.sin(ry) * 0.35, 2.9, z + Math.cos(ry) * 0.35)
    root.add(l)
    lights.push(l)
  }
  sconce(-5.7, -8, Math.PI / 2)
  sconce(5.7, -8, -Math.PI / 2)
  sconce(-5.7, 8, Math.PI / 2)
  sconce(5.7, 8, -Math.PI / 2)

  /* ── light fixtures ────────────────────────────────────── */
  function chandelier(x, z) {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    root.add(g)
    cylinder(0.05, 0.05, 1.1, matBrassDark, 0, WALL_H - 0.55, 0, 8, g)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.045, 8, 32), matBrass)
    ring.rotation.x = Math.PI / 2
    ring.position.y = WALL_H - 1.25
    g.add(ring)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const cx = Math.cos(a) * 0.9
      const cz = Math.sin(a) * 0.9
      cylinder(0.05, 0.05, 0.32, matCream, cx, WALL_H - 1.08, cz, 6, g)
      const flame = sphere(0.06, new THREE.MeshBasicMaterial({ color: 0xffdca0 }), cx, WALL_H - 0.9, cz, g)
      flame.castShadow = false
    }
    const glow = sprite(glowWarm, x, WALL_H - 1.1, z, 6.5)
    glow.material.opacity = 0.42
    const l = new THREE.PointLight(0xffc98c, 64, 22, 2)
    l.position.set(x, WALL_H - 1.3, z)
    l.castShadow = false
    root.add(l)
    lights.push(l)
    animators.push((t) => { l.intensity = 62 + Math.sin(t * 7.1) * 2.2 + Math.sin(t * 13.7) * 1.4; glow.material.opacity = 0.4 + Math.sin(t * 5) * 0.04 })
  }
  chandelier(0, 0.5)

  function hangingBulb(x, z, color = 0xffb066, intensity = 20, height = 2.9) {
    cylinder(0.02, 0.02, WALL_H - height, matDark, x, (WALL_H + height) / 2, z, 5)
    const bulb = sphere(0.11, new THREE.MeshBasicMaterial({ color }), x, height, z)
    bulb.castShadow = false
    sprite(glowWarm, x, height, z, 3.2)
    const l = new THREE.PointLight(color, intensity, 13, 2)
    l.position.set(x, height, z)
    root.add(l)
    lights.push(l)
    animators.push((t) => { l.intensity = intensity + Math.sin(t * 9.3 + x) * intensity * 0.05 })
  }
  hangingBulb(-12, -9, 0xffb066, 30, 3.1)
  hangingBulb(12, -9, 0xd8e6c8, 28, 3.1)
  hangingBulb(-12, 10, 0xffa860, 28, 2.9)
  hangingBulb(12, 10, 0xffb066, 30, 3.1)
  hangingBulb(0, -15.5, 0xffc07a, 18, 3.0)
  hangingBulb(0, 15.5, 0xffc07a, 18, 3.0)

  const hemi = new THREE.HemisphereLight(0x9a8fb0, 0x3a2426, 1.0)
  scene.add(hemi)
  const moon = new THREE.DirectionalLight(0xa9c1e8, 1.25)
  moon.position.set(12, 24, -14)
  moon.castShadow = true
  moon.shadow.mapSize.set(2048, 2048)
  moon.shadow.camera.left = -26
  moon.shadow.camera.right = 26
  moon.shadow.camera.top = 26
  moon.shadow.camera.bottom = -26
  moon.shadow.camera.near = 1
  moon.shadow.camera.far = 60
  moon.shadow.bias = -0.0008
  moon.shadow.normalBias = 0.04
  scene.add(moon)
  const fill = new THREE.AmbientLight(0x6c5568, 0.55)
  scene.add(fill)

  scene.fog = new THREE.FogExp2(0x140e18, 0.023)

  /* ── dust ──────────────────────────────────────────────── */
  const dust = makeDust()
  root.add(dust)

  /* ── doors (front exit) ────────────────────────────────── */
  const doorGroup = new THREE.Group()
  doorGroup.position.set(0, 0, -19)
  root.add(doorGroup)
  const leaves = []
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(side * 1.55, 0, 0)
    doorGroup.add(pivot)
    const leaf = box(1.5, 3.55, 0.18, matTrim, -side * 0.75, 1.78, 0, 0, pivot, true)
    const panel = box(1.05, 2.5, 0.06, new THREE.MeshStandardMaterial({ color: 0x3b2526, roughness: 0.65 }), -side * 0.75, 1.95, 0.1, 0, pivot)
    panel.castShadow = false
    box(0.1, 0.1, 0.1, matBrass, -side * 0.18, 1.7, 0.18, 0, pivot)
    // stained glass arch
    const arch = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6b3a4e, roughness: 0.4, emissive: 0x2a0d18, emissiveIntensity: 0.6 }))
    arch.position.set(-side * 0.75, 2.9, 0.12)
    pivot.add(arch)
    leaves.push({ pivot, side })
  }
  const doorGlow = sprite(glowWarm, 0, 2.4, -18.6, 4.5)
  doorGlow.material.color.set(0xff5c6e)
  const lockLight = new THREE.PointLight(0xff3048, 3, 5, 2)
  lockLight.position.set(0, 2.2, -18.4)
  root.add(lockLight)
  colliders.push({ x: 0, z: -19, hw: 1.7, hd: 0.35, tag: 'gate', h: 3.6 })

  /* ── glow lamps (decor) ────────────────────────────────── */
  const candleSpots = [
    [-17.6, 2.1, -16.5], [17.6, 2.1, -16.5], [-17.6, 2.1, 16.5], [17.6, 2.1, 16.5],
  ]
  for (const [x, y, z] of candleSpots) {
    cylinder(0.035, 0.04, 0.28, matCream, x, y, z, 8)
    const flame = sphere(0.035, new THREE.MeshBasicMaterial({ color: 0xffd28a }), x, y + 0.18, z)
    flame.castShadow = false
    sprite(glowWarm, x, y + 0.2, z, 1.15)
  }

  /* ── minimap ───────────────────────────────────────────── */
  const map = { ctx: null, scale: 1, ox: 0, oz: 0 }
  const mapCanvas = document.getElementById('minimap')
  if (mapCanvas) map.ctx = mapCanvas.getContext('2d')

  /* ── navigation grid ───────────────────────────────────── */
  const nav = { cell: 0.8, x0: -19.2, z0: -19.2, w: 48, h: 48, blocked: null }
  function buildNav() {
    nav.blocked = new Uint8Array(nav.w * nav.h)
    const pad = 0.42
    for (let cz = 0; cz < nav.h; cz++) {
      for (let cx = 0; cx < nav.w; cx++) {
        const x = nav.x0 + (cx + 0.5) * nav.cell
        const z = nav.z0 + (cz + 0.5) * nav.cell
        if (x < -18.4 || x > 18.4 || z < -18.4 || z > 18.4) { nav.blocked[cz * nav.w + cx] = 1; continue }
        for (const c of colliders) {
          if (Math.abs(x - c.x) < c.hw + pad && Math.abs(z - c.z) < c.hd + pad) { nav.blocked[cz * nav.w + cx] = 1; break }
        }
      }
    }
  }
  function cellIndex(x, z) {
    const cx = Math.floor((x - nav.x0) / nav.cell)
    const cz = Math.floor((z - nav.z0) / nav.cell)
    if (cx < 0 || cz < 0 || cx >= nav.w || cz >= nav.h) return -1
    return cz * nav.w + cx
  }
  function cellCenter(cx, cz) {
    return { x: nav.x0 + (cx + 0.5) * nav.cell, z: nav.z0 + (cz + 0.5) * nav.cell }
  }
  function isBlocked(x, z) {
    const i = cellIndex(x, z)
    return i < 0 || nav.blocked[i] === 1
  }
  function nearestOpen(x, z) {
    if (!isBlocked(x, z)) return { x, z }
    let best = null, bestD = Infinity
    for (let r = 1; r <= 8; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
          const nx = x + dx * nav.cell
          const nz = z + dz * nav.cell
          if (isBlocked(nx, nz)) continue
          const d = dx * dx + dz * dz
          if (d < bestD) { bestD = d; best = { x: nx, z: nz } }
        }
      }
      if (best) return best
    }
    return { x: 0, z: 0 }
  }

  /* ── collision + line of sight ─────────────────────────── */
  function resolveCircle(x, z, r) {
    let px = x, pz = z
    for (let iter = 0; iter < 3; iter++) {
      for (const c of colliders) {
        const nx = Math.max(c.x - c.hw, Math.min(px, c.x + c.hw))
        const nz = Math.max(c.z - c.hd, Math.min(pz, c.z + c.hd))
        const dx = px - nx
        const dz = pz - nz
        const d2 = dx * dx + dz * dz
        if (d2 >= r * r) continue
        if (d2 > 0.000001) {
          const d = Math.sqrt(d2)
          px = nx + (dx / d) * r
          pz = nz + (dz / d) * r
        } else {
          // center inside rect: push out along smallest axis
          const ox = c.hw + r - Math.abs(px - c.x)
          const oz = c.hd + r - Math.abs(pz - c.z)
          if (ox < oz) px += Math.sign(px - c.x || 1) * ox
          else pz += Math.sign(pz - c.z || 1) * oz
        }
      }
    }
    return { x: Math.max(-18.3, Math.min(18.3, px)), z: Math.max(-18.3, Math.min(18.3, pz)) }
  }

  function segmentRect(x1, z1, x2, z2, r) {
    // Liang–Barsky against AABB
    let t0 = 0, t1 = 1
    const dx = x2 - x1, dz = z2 - z1
    const p = [-dx, dx, -dz, dz]
    const q = [x1 - r.x1, r.x2 - x1, z1 - r.z1, r.z2 - z1]
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; continue }
      const t = q[i] / p[i]
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t }
      else { if (t < t0) return false; if (t < t1) t1 = t }
    }
    return true
  }
  function lineOfSight(ax, az, bx, bz) {
    for (const w of walls) if (segmentRect(ax, az, bx, bz, w)) return false
    return true
  }

  /* ── update ────────────────────────────────────────────── */
  function update(dt, time) {
    for (const fn of animators) fn(time, dt)
    for (const b of world.boxes || []) b.update(dt, time)
    for (const c of world.chests || []) c.update(dt)
    if (world.clockPendulum) {
      const p = world.clockPendulum
      p.phase += dt * 2.4
      p.pend.rotation.x = Math.sin(p.phase) * 0.22
      p.bob.position.x = Math.sin(p.phase) * 0.2
      p.bob.position.y = 0.62 + Math.cos(p.phase) * 0.02
    }
    const pos = dust.geometry.attributes.position
    const arr = pos.array
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += Math.sin(time * 0.22 + i) * dt * 0.035
      arr[i + 1] += Math.sin(time * 0.16 + i * 0.7) * dt * 0.018
      arr[i + 2] += Math.cos(time * 0.19 + i * 0.5) * dt * 0.03
      if (arr[i + 1] > 3.8) arr[i + 1] = 0.2
    }
    pos.needsUpdate = true
    // front door state
    const gate = world.gate
    if (gate.openT > 0) {
      gate.openT = Math.min(1, gate.openT + dt * 0.55)
      const ease = 1 - Math.pow(1 - gate.openT, 3)
      for (const leaf of leaves) leaf.pivot.rotation.y = leaf.side * ease * 1.5
    }
    const unlocked = gate.unlocked
    doorGlow.material.color.set(unlocked ? 0xffd27a : 0xff5c6e)
    doorGlow.material.opacity = unlocked ? 0.5 + Math.sin(time * 3) * 0.08 : 0.28
    lockLight.color.set(unlocked ? 0xffc060 : 0xff3048)
    lockLight.intensity = unlocked ? 6 : 3
  }

  const world = {
    root, colliders, walls, doorways, rooms: ROOMS, lights, nav,
    materials: {
      matWood, matTile, matTrim, matBrass, matBrassDark, matIron, matPorcelain, matVelvet,
      matCream, matDark, matGlass, matPaper, rugMats, glowWarm, matVelvetGreen, matBlack, matMirror,
    },
    boxPositions: BOX_POSITIONS,
    chestPositions: CHEST_POSITIONS,
    gate: { unlocked: false, open: false, openT: 0, group: doorGroup, leaves },
    helpers: { mesh, box, cylinder, sphere, plane, collider, sprite, windowUnit },
    resolveCircle, lineOfSight, isBlocked, nearestOpen, buildNav, cellIndex, cellCenter,
    update,
    map,
    mapCanvas,
  }

  // fill nav after props are placed (main calls buildNav)
  return world
}

/* ── minimap painter ─────────────────────────────────────── */
export function drawMinimap(world, player, survivors, boxes, hunter, role) {
  const canvas = world.mapCanvas
  if (!canvas || !canvas.getContext) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)
  const pad = 12
  const s = (W - pad * 2) / 38
  const tx = (x) => pad + (x + 19) * s
  const tz = (z) => pad + (z + 19) * s

  ctx.fillStyle = 'rgba(10,7,12,.55)'
  ctx.fillRect(0, 0, W, H)

  for (const r of world.rooms) {
    ctx.fillStyle = r.id === 'hall' ? 'rgba(207,170,104,.09)' : 'rgba(226,160,180,.055)'
    ctx.fillRect(tx(r.x1), tz(r.z1), (r.x2 - r.x1) * s, (r.z2 - r.z1) * s)
    ctx.strokeStyle = 'rgba(244,232,213,.26)'
    ctx.lineWidth = 1.2
    ctx.strokeRect(tx(r.x1), tz(r.z1), (r.x2 - r.x1) * s, (r.z2 - r.z1) * s)
  }
  // door gaps
  ctx.strokeStyle = 'rgba(244,232,213,.16)'
  ctx.lineWidth = 2
  for (const d of world.doorways) {
    ctx.beginPath()
    if (d.axis === 'x') { ctx.moveTo(tx(d.x - d.w / 2), tz(d.z)); ctx.lineTo(tx(d.x + d.w / 2), tz(d.z)) }
    else { ctx.moveTo(tx(d.x), tz(d.z - d.w / 2)); ctx.lineTo(tx(d.x), tz(d.z + d.w / 2)) }
    ctx.stroke()
  }
  // boxes
  for (const b of boxes) {
    const done = b.done
    ctx.beginPath()
    ctx.arc(tx(b.x), tz(b.z), done ? 5.4 : 4.2, 0, Math.PI * 2)
    ctx.fillStyle = done ? 'rgba(240,211,154,.95)' : 'rgba(240,211,154,.3)'
    ctx.fill()
    if (!done) {
      ctx.strokeStyle = 'rgba(240,211,154,.8)'
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
    if (done) {
      ctx.beginPath()
      ctx.arc(tx(b.x), tz(b.z), 9, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(240,211,154,.25)'
      ctx.stroke()
    }
  }
  // gate
  ctx.beginPath()
  ctx.arc(tx(0), tz(-18.6), 6, 0, Math.PI * 2)
  ctx.fillStyle = world.gate.open ? 'rgba(160,240,190,.95)' : world.gate.unlocked ? 'rgba(240,211,154,.95)' : 'rgba(163,38,61,.7)'
  ctx.fill()

  // teammates
  if (role === 'survivor') {
    for (const s2 of survivors) {
      if (s2.status === 'shattered' || s2.status === 'escaped') continue
      const px = tx(s2.pos.x), pz = tz(s2.pos.z)
      ctx.beginPath()
      ctx.arc(px, pz, s2.isPlayer ? 5.4 : 4, 0, Math.PI * 2)
      ctx.fillStyle = s2.isPlayer ? '#f4e8d5' : 'rgba(226,160,180,.85)'
      ctx.fill()
      if (s2.isPlayer) {
        ctx.strokeStyle = 'rgba(244,232,213,.5)'
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(px, pz, 9, 0, Math.PI * 2); ctx.stroke()
      }
    }
    if (hunter) {
      const hx = tx(hunter.pos.x), hz = tz(hunter.pos.z)
      ctx.beginPath()
      ctx.arc(hx, hz, 6, 0, Math.PI * 2)
      ctx.fillStyle = hunter.senseTime > 0 ? '#ff5c6e' : 'rgba(255,92,110,.55)'
      ctx.fill()
      if (hunter.senseTime > 0) {
        ctx.strokeStyle = 'rgba(255,92,110,.3)'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(hx, hz, 13, 0, Math.PI * 2); ctx.stroke()
      }
    }
  } else {
    // hunter: pings only
    for (const s2 of survivors) {
      if (s2.ping > 0 && s2.status !== 'shattered' && s2.status !== 'escaped') {
        const px = tx(s2.pos.x), pz = tz(s2.pos.z)
        ctx.beginPath()
        ctx.arc(px, pz, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,92,110,.9)'
        ctx.fill()
      }
    }
    const hx = tx(hunter.pos.x), hz = tz(hunter.pos.z)
    ctx.beginPath()
    ctx.arc(hx, hz, 5.6, 0, Math.PI * 2)
    ctx.fillStyle = '#f0d39a'
    ctx.fill()
  }
}
