import * as THREE from 'three'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'

/* ────────────────────────────────────────────────────────────
   Furniture, music boxes, hiding chests.
   ──────────────────────────────────────────────────────────── */

export function buildProps(world) {
  const { box, cylinder, sphere, plane, collider, sprite, mesh } = world.helpers
  const M = world.materials
  const root = world.root
  const boxes = []
  const chests = []

  const painted = (color, rough = 0.75) => new THREE.MeshStandardMaterial({ color, roughness: rough })
  const matRose = painted(0x8d4a58)
  const matMint = painted(0x6f8f7f)
  const matOchre = painted(0x9c7a46)
  const matIvory = painted(0xd8c9ae)
  const matWalnut = painted(0x4a2e24)
  const matRosewood = painted(0x3c1e20)
  const matWhite = painted(0xe6ded0, 0.6)
  const matIron = new THREE.MeshStandardMaterial({ color: 0x2c2a2c, roughness: 0.45, metalness: 0.6 })
  const matCopper = new THREE.MeshStandardMaterial({ color: 0x9c5f3a, roughness: 0.35, metalness: 0.8 })
  const matCandle = new THREE.MeshStandardMaterial({ color: 0xefe3c8, roughness: 0.7 })
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd28a })

  function flame(x, y, z, scale = 1) {
    const f = sphere(0.035 * scale, flameMat, x, y, z)
    f.castShadow = false
    sprite(M.glowWarm, x, y, z, 0.9 * scale)
    return f
  }
  function candle(x, y, z, h = 0.3) {
    cylinder(0.035, 0.04, h, matCandle, x, y + h / 2, z, 8)
    flame(x, y + h + 0.04, z)
  }

  /* ══════════════════════════════════════════════════════════
     NURSERY
     ══════════════════════════════════════════════════════════ */
  // crib
  {
    const g = new THREE.Group()
    g.position.set(-14, 0, -16.2)
    root.add(g)
    const legMat = matIvory
    box(3.6, 0.22, 2.2, legMat, 0, 1.1, 0, 0, g)
    box(3.6, 0.18, 2.2, matRose, 0, 0.55, 0, 0, g)
    for (const sx of [-1.72, 1.72]) {
      box(0.14, 1.3, 2.2, legMat, sx, 0.65, 0, 0, g)
      for (let i = 0; i < 9; i++) {
        box(0.08, 0.95, 0.08, legMat, sx, 0.95, -1 + i * 0.25, 0, g)
      }
    }
    box(3.6, 0.14, 0.14, legMat, 0, 1.45, -1.03, 0, g)
    box(3.6, 0.14, 0.14, legMat, 0, 1.45, 1.03, 0, g)
    for (const sx of [-1.55, 1.55]) for (const sz of [-0.85, 0.85]) {
      box(0.14, 0.5, 0.14, legMat, sx, 0.25, sz, 0, g)
    }
    // blanket + pillow
    box(2.6, 0.12, 1.5, M.matVelvet, 0.2, 1.26, 0.1, 0, g)
    box(1.1, 0.18, 0.7, matWhite, -0.9, 1.32, 0.1, 0, g)
    collider(-14, -16.2, 3.9, 2.5, 'prop', 1.8)
  }
  // mobile above crib
  {
    const g = new THREE.Group()
    g.position.set(-14, 0, -16.2)
    root.add(g)
    cylinder(0.02, 0.02, 1.3, M.matDark, 0, 3.45, 0, 5, g)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 24), M.matBrass)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 2.8
    g.add(ring)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      const x = Math.cos(a) * 0.58
      const z = Math.sin(a) * 0.58
      cylinder(0.008, 0.008, 0.55, M.matDark, x, 2.55, z, 4, g)
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), i % 2 ? matRose : matIvory)
      star.position.set(x, 2.26, z)
      g.add(star)
    }
  }
  // teddy bear
  {
    const g = new THREE.Group()
    g.position.set(-16.4, 0, -4.6)
    g.rotation.y = 2.35
    root.add(g)
    const fur = painted(0x7d5a42, 0.98)
    sphere(0.72, fur, 0, 0.75, 0, g, 1, 1.1, 0.9)
    sphere(0.5, fur, 0, 1.62, 0.02, g)
    sphere(0.2, fur, -0.38, 1.94, 0.02, g)
    sphere(0.2, fur, 0.38, 1.94, 0.02, g)
    sphere(0.15, matIvory, 0, 1.55, 0.44, g, 1, 0.8, 0.7)
    sphere(0.06, M.matBlack, 0, 1.58, 0.56, g)
    for (const s of [-1, 1]) {
      sphere(0.055, M.matBlack, s * 0.19, 1.72, 0.42, g)
      const ear = sphere(0.15, matRose, s * 0.4, 1.92, 0.05, g)
      ear.scale.set(1, 1, 0.45)
      sphere(0.42, fur, s * 0.66, 0.85, 0.12, g, 0.85, 1, 0.85)
      sphere(0.3, fur, s * 0.46, 0.2, 0.4, g, 1, 0.6, 1.1)
    }
    // bow
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 8, 16), M.matVelvet)
    bow.position.set(0, 1.34, 0.44)
    g.add(bow)
    collider(-16.4, -4.6, 2.1, 1.8, 'prop', 2.2)
  }
  // rocking horse
  {
    const g = new THREE.Group()
    g.position.set(-8.8, 0, -9.4)
    g.rotation.y = -0.7
    root.add(g)
    const body = sphere(0.5, matIvory, 0, 1.05, 0, g, 1.35, 0.72, 0.62)
    sphere(0.3, matIvory, 0.72, 1.24, 0, g, 1.15, 0.9, 0.8)
    cylinder(0.1, 0.14, 0.55, matIvory, 0.84, 1.0, 0, 8, g).rotation.z = -0.72
    sphere(0.18, matIvory, 1.06, 1.34, 0, g, 1.2, 0.78, 0.8)
    for (const s of [-1, 1]) sphere(0.07, matIvory, 0.68, 1.55, s * 0.16, g, 0.6, 1, 0.5)
    for (const sx of [-0.42, 0.42]) for (const sz of [-0.24, 0.24]) {
      cylinder(0.055, 0.07, 0.62, matIvory, sx, 0.5, sz, 6, g).rotation.z = sx > 0 ? 0.18 : -0.18
    }
    for (const sz of [-0.38, 0.38]) {
      const rocker = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 6, 24, Math.PI * 0.75), matWalnut)
      rocker.position.set(0, 0.95, sz)
      rocker.rotation.z = Math.PI * 1.125
      g.add(rocker)
    }
    // mane + tail
    for (let i = 0; i < 6; i++) sphere(0.09, matRose, 0.5 + i * 0.06, 1.46 - i * 0.04, 0, g)
    sphere(0.12, matRose, -0.66, 1.06, 0, g, 0.7, 1.5, 0.7)
    collider(-8.8, -9.4, 2.4, 1.6, 'prop', 1.6)
  }
  // toy blocks
  {
    const colors = [0xd98ba3, 0x7aa8a0, 0xcfaa68, 0x8d4a58, 0xd8c9ae]
    const spots = [[-11.4, -14.6], [-10.8, -13.8], [-11.9, -13.6], [-12.6, -14.9], [-9.9, -12.2], [-11.2, -11.4], [-12.9, -11.7]]
    for (let i = 0; i < spots.length; i++) {
      const [x, z] = spots[i]
      const s = 0.32 + (i % 3) * 0.05
      const b = box(s, s, s, painted(colors[i % colors.length]), x, s / 2, z, i * 0.7)
      b.castShadow = true
      if (i % 3 === 0) {
        const letter = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.5, s * 0.5), new THREE.MeshBasicMaterial({ color: 0x241527, transparent: true, opacity: 0.35 }))
        letter.position.set(x, s / 2, z + s / 2 + 0.005)
        root.add(letter)
      }
    }
  }
  // dresser + doll shelf
  {
    box(4.6, 1.0, 1.2, matRosewood, -12.4, 0.5, -18.25, 0)
    box(4.8, 0.12, 1.35, matWalnut, -12.4, 1.06, -18.2, 0)
    for (let i = 0; i < 3; i++) {
      box(4.3, 0.02, 0.04, M.matBrassDark, -12.4, 0.3 + i * 0.26, -17.63, 0)
      for (const s of [-1, 1]) sphere(0.04, M.matBrass, -12.4 + s * 1.4, 0.34 + i * 0.26, -17.6)
    }
    // little doll audience on top
    for (let i = 0; i < 5; i++) {
      const x = -14.2 + i * 0.9
      cylinder(0.14, 0.2, 0.32, painted([0x8d4a58, 0x6f8f7f, 0x9c7a46, 0x6d1f35, 0x4a6d7c][i]), x, 1.28, -18.25, 10)
      sphere(0.12, M.matPorcelain, x, 1.58, -18.25)
    }
    collider(-12.4, -18.2, 4.9, 1.5, 'prop', 1.4)
  }
  // low table for music box
  {
    box(1.7, 0.14, 1.5, matRose, -14, 1.02, -12.5, 0.1)
    for (const sx of [-0.65, 0.65]) for (const sz of [-0.55, 0.55]) {
      cylinder(0.06, 0.08, 1.0, matWalnut, -14 + sx, 0.5, -12.5 + sz, 8)
    }
    collider(-14, -12.5, 1.9, 1.7, 'prop', 1.2)
  }
  // toy house
  {
    const g = new THREE.Group()
    g.position.set(-17.2, 0, -8.2)
    g.rotation.y = 0.4
    root.add(g)
    box(1.8, 1.4, 1.3, matRose, 0, 0.7, 0, 0, g)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.8, 4), matWalnut)
    roof.position.y = 1.8
    roof.rotation.y = Math.PI / 4
    g.add(roof)
    box(0.4, 0.7, 0.06, matWalnut, 0, 0.35, 0.67, 0, g)
    for (const s of [-1, 1]) box(0.3, 0.3, 0.06, new THREE.MeshBasicMaterial({ color: 0xffc98c }), s * 0.55, 0.9, 0.67, 0, g)
    collider(-17.2, -8.2, 2.1, 1.6, 'prop', 2.2)
  }

  /* ══════════════════════════════════════════════════════════
     KITCHEN
     ══════════════════════════════════════════════════════════ */
  // counters along north wall
  {
    box(11.6, 1.0, 1.4, matMint, 12.6, 0.5, -18.1, 0)
    box(11.9, 0.12, 1.6, matWhite, 12.6, 1.06, -18.05, 0)
    for (let i = 0; i < 5; i++) {
      box(2.0, 0.72, 0.04, matMint, 8.3 + i * 2.2, 0.5, -17.37, 0)
      sphere(0.045, M.matBrass, 8.3 + i * 2.2 + 0.75, 0.5, -17.33)
    }
    // upper cabinets
    box(11.6, 1.1, 0.55, matMint, 12.6, 3.2, -18.5, 0)
    for (let i = 0; i < 5; i++) box(2.0, 0.9, 0.04, matMint, 8.3 + i * 2.2, 3.2, -18.2, 0)
    // stove
    box(2.2, 1.1, 1.5, matIron, 17.2, 0.55, -18.1, 0)
    box(1.9, 0.08, 1.2, new THREE.MeshStandardMaterial({ color: 0x111012, roughness: 0.3 }), 17.2, 1.14, -18.05, 0)
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 18), matIron)
      ring.rotation.x = Math.PI / 2
      ring.position.set(16.6 + (i % 2) * 1.2, 1.19, -18.4 + Math.floor(i / 2) * 0.6)
      root.add(ring)
    }
    box(1.5, 0.55, 0.05, new THREE.MeshStandardMaterial({ color: 0x1a1618, roughness: 0.25, metalness: 0.5 }), 17.2, 0.55, -17.33, 0)
    box(0.5, 0.05, 0.05, M.matBrass, 17.2, 0.86, -17.3, 0)
    // pot on stove
    cylinder(0.28, 0.24, 0.34, matCopper, 16.5, 1.34, -18.3, 14)
    cylinder(0.3, 0.3, 0.04, matCopper, 16.5, 1.52, -18.3, 14)
    collider(12.6, -18.1, 12.2, 1.8, 'prop', 1.2)
  }
  // fridge
  {
    box(1.5, 2.8, 1.2, matWhite, 18.1, 1.4, -15.6, 0)
    box(1.4, 0.05, 0.04, M.matBrassDark, 18.1, 1.75, -15.0, 0)
    cylinder(0.03, 0.03, 0.5, M.matBrass, 17.7, 2.2, -14.98, 6)
    collider(18.1, -15.6, 1.8, 1.5, 'prop', 2.9)
  }
  // hanging pots
  for (let i = 0; i < 4; i++) {
    const x = 9.5 + i * 1.1
    cylinder(0.012, 0.012, 1.0, M.matIron, x, 3.0, -17.1, 5)
    cylinder(0.18 + i * 0.02, 0.14 + i * 0.02, 0.22, i % 2 ? matCopper : matIron, x, 2.4, -17.1, 12)
  }
  // kitchen table + chairs
  {
    const top = cylinder(1.55, 1.55, 0.12, matWalnut, 12, 1.02, -10.6, 24)
    top.receiveShadow = true
    cylinder(0.18, 0.28, 0.95, matWalnut, 12, 0.5, -10.6, 10)
    for (const [x, z, r] of [[9.7, -10.6, 0.2], [14.3, -10.6, -0.2], [12, -8.3, 0.1], [12, -12.9, Math.PI]]) {
      const g = new THREE.Group()
      g.position.set(x, 0, z)
      g.rotation.y = r
      root.add(g)
      box(0.9, 0.1, 0.9, matMint, 0, 0.85, 0, 0, g)
      for (const sx of [-0.37, 0.37]) box(0.12, 1.0, 0.1, matMint, sx, 1.4, -0.4, 0, g)
      box(0.9, 0.13, 0.1, matMint, 0, 1.86, -0.4, 0, g)
      box(0.82, 0.08, 0.1, matMint, 0, 1.22, -0.4, 0, g)
      for (const sx of [-0.35, 0.35]) for (const sz of [-0.35, 0.35]) {
        cylinder(0.045, 0.05, 0.82, matWalnut, sx, 0.42, sz, 6, g)
      }
    }
    // tea set
    cylinder(0.22, 0.26, 0.16, matWhite, 12, 1.16, -10.6, 14)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      cylinder(0.07, 0.06, 0.09, matWhite, 12 + Math.cos(a) * 0.55, 1.13, -10.6 + Math.sin(a) * 0.55, 10)
    }
    collider(12, -10.6, 3.6, 3.6, 'prop', 1.5)
  }
  // jars
  for (let i = 0; i < 5; i++) {
    const x = 10.4 + i * 1.3
    cylinder(0.12, 0.12, 0.3, new THREE.MeshPhysicalMaterial({ color: 0xc8d8c0, transparent: true, opacity: 0.55, roughness: 0.15 }), x, 1.28, -18.3, 10)
    cylinder(0.13, 0.13, 0.05, M.matBrass, x, 1.46, -18.3, 10)
  }
  // window herbs
  for (let i = 0; i < 3; i++) {
    box(0.3, 0.28, 0.3, matOchre, 13 + i * 0.6, 2.7, -18.55, 0)
    for (let j = 0; j < 4; j++) sphere(0.09, painted(0x4d6b3d), 13 + i * 0.6 + (j % 2 ? 0.08 : -0.08), 2.9 + j * 0.05, -18.55 + (j % 2 ? 0.06 : -0.06))
  }

  /* ══════════════════════════════════════════════════════════
     WORKSHOP
     ══════════════════════════════════════════════════════════ */
  // workbench
  {
    box(2.2, 0.18, 8.0, matWalnut, -17.1, 1.15, 8.8, 0)
    for (const z of [5.2, 8.8, 12.4]) {
      box(0.16, 1.1, 0.16, matWalnut, -16.2, 0.55, z, 0)
      box(0.16, 1.1, 0.16, matWalnut, -18.0, 0.55, z, 0)
    }
    box(1.9, 0.5, 7.6, matOchre, -17.1, 0.72, 8.8, 0)
    // vise
    box(0.4, 0.35, 0.4, matIron, -16.2, 1.4, 12.4, 0)
    // tools on top
    for (let i = 0; i < 5; i++) {
      const z = 5.6 + i * 1.5
      cylinder(0.03, 0.03, 0.7, M.matIron, -17.4, 1.62, z, 6).rotation.x = Math.PI / 2
      box(0.2, 0.08, 0.08, M.matIron, -17.4, 1.62, z + 0.38, 0)
    }
    // doll arm
    cylinder(0.06, 0.05, 0.6, M.matPorcelain, -16.6, 1.58, 6.2, 8).rotation.z = 1.2
    collider(-17.1, 8.8, 2.7, 8.3, 'prop', 1.4)
  }
  // pegboard + tools
  {
    box(0.08, 2.4, 6.0, painted(0x6b5638), -18.65, 2.5, 9.2, 0)
    for (let i = 0; i < 7; i++) {
      const z = 6.8 + i * 0.8
      cylinder(0.018, 0.018, 0.5 + (i % 3) * 0.18, M.matIron, -18.55, 2.7, z, 5)
      if (i % 2) {
        const saw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 3), M.matIron)
        saw.position.set(-18.5, 2.3, z)
        saw.rotation.z = Math.PI
        root.add(saw)
      }
    }
  }
  // shelves with doll parts
  {
    box(0.9, 0.1, 5.4, matWalnut, -18.2, 2.2, 12.0, 0)
    box(0.9, 0.1, 5.4, matWalnut, -18.2, 3.0, 12.0, 0)
    for (let i = 0; i < 6; i++) {
      const z = 9.8 + i * 0.85
      sphere(0.16, M.matPorcelain, -18.15, 2.42, z)
      if (i % 2 === 0) {
        sphere(0.03, M.matBlack, -18.08, 2.45, z - 0.06)
        sphere(0.03, M.matBlack, -18.08, 2.45, z + 0.06)
      } else {
        sphere(0.16, M.matPorcelain, -18.15, 3.22, z)
        sphere(0.03, M.matBlack, -18.08, 3.25, z)
      }
    }
  }
  // dress form
  {
    const g = new THREE.Group()
    g.position.set(-9.2, 0, 7.4)
    g.rotation.y = 0.8
    root.add(g)
    cylinder(0.07, 0.09, 1.2, matWalnut, 0, 0.6, 0, 8, g)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 1.0, 14), M.matVelvetGreen)
    torso.position.y = 1.65
    g.add(torso)
    sphere(0.26, matWalnut, 0, 2.22, 0, g, 1, 0.7, 0.8)
    // measuring tape
    const tape = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 4, 24), painted(0xe8d9a8))
    tape.rotation.x = Math.PI / 2
    tape.position.y = 1.5
    g.add(tape)
    collider(-9.2, 7.4, 1.2, 1.2, 'prop', 2.4)
  }
  // sewing table
  {
    box(2.6, 0.12, 1.4, matWalnut, -10.8, 1.0, 14.2, 0)
    for (const sx of [-1.1, 1.1]) for (const sz of [-0.5, 0.5]) {
      cylinder(0.055, 0.07, 0.95, matWalnut, -10.8 + sx, 0.48, 14.2 + sz, 6)
    }
    // sewing machine
    box(0.8, 0.3, 0.5, matIron, -10.8, 1.2, 14.2, 0)
    box(0.18, 0.45, 0.18, matIron, -10.5, 1.4, 14.2, 0)
    cylinder(0.03, 0.03, 0.3, M.matIron, -10.5, 1.2, 14.4, 5)
    sphere(0.12, matOchre, -11.2, 1.22, 14.2)
    collider(-10.8, 14.2, 2.9, 1.7, 'prop', 1.6)
  }
  // doll head pile on floor
  {
    for (let i = 0; i < 6; i++) {
      const x = -13.4 + Math.random() * 1.6
      const z = 5.0 + Math.random() * 2.2
      sphere(0.16, M.matPorcelain, x, 0.16, z)
    }
  }
  // crate for music box
  {
    box(1.5, 1.0, 1.5, matOchre, -16.8, 0.5, 14.2, 0.15)
    box(1.55, 0.1, 1.55, matWalnut, -16.8, 1.03, 14.2, 0.15)
    collider(-16.8, 14.2, 1.7, 1.7, 'prop', 1.2)
  }

  /* ══════════════════════════════════════════════════════════
     PARLOR
     ══════════════════════════════════════════════════════════ */
  // piano
  {
    const g = new THREE.Group()
    g.position.set(17.0, 0, 12.0)
    g.rotation.y = -Math.PI / 2
    root.add(g)
    box(4.6, 1.0, 1.6, matRosewood, 0, 1.3, 0, 0, g)
    box(4.8, 0.12, 1.7, matWalnut, 0, 1.86, 0, 0, g)
    box(4.2, 0.1, 0.6, matWhite, 0, 1.78, 0.5, 0, g)
    for (let i = 0; i < 18; i++) box(0.1, 0.08, 0.5, matWhite, -2 + i * 0.23, 1.86, 0.5, 0, g)
    for (let i = 0; i < 12; i++) box(0.06, 0.09, 0.32, M.matBlack, -1.9 + i * 0.32, 1.9, 0.62, 0, g)
    for (const sx of [-1.8, 1.8]) cylinder(0.1, 0.12, 1.3, matWalnut, sx, 0.65, 0.2, 8, g)
    // sheet music
    box(1.0, 0.04, 0.7, matWhite, 0, 1.94, -0.1, 0, g).rotation.x = -0.3
    // bench
    box(1.6, 0.12, 0.55, matRosewood, 0, 0.72, 1.25, 0, g)
    for (const sx of [-0.6, 0.6]) for (const sz of [-0.18, 0.18]) cylinder(0.045, 0.05, 0.7, matWalnut, sx, 0.36, 1.25 + sz, 6, g)
    collider(17.0, 12.0, 1.9, 4.9, 'prop', 2.2)
  }
  // fireplace
  {
    const g = new THREE.Group()
    g.position.set(11.5, 0, 18.55)
    root.add(g)
    box(4.4, 2.6, 0.7, matIvory, 0, 1.3, 0, 0, g)
    // black insert sits on the room side of the chimney breast so the
    // opening actually reads as a fireplace rather than a blank slab.
    box(2.4, 1.5, 0.4, M.matBlack, 0, 0.75, -0.18, 0, g)
    box(4.9, 0.22, 0.9, matWalnut, 0, 2.6, 0, 0, g)
    box(3.2, 0.16, 1.1, matIvory, 0, 0.08, -0.55, 0, g)
    box(1.6, 0.3, 0.35, M.matBlack, 0, 0.15, -0.5, 0, g)
    // brass fender
    box(2.6, 0.06, 0.06, M.matBrass, 0, 0.22, -1.02, 0, g)
    // logs + fire
    cylinder(0.12, 0.12, 1.2, matWalnut, -0.3, 0.28, -0.52, 6, g).rotation.z = Math.PI / 2
    cylinder(0.12, 0.12, 1.2, matWalnut, 0.3, 0.32, -0.52, 6, g).rotation.z = Math.PI / 2
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.75 })
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.25 - i * 0.05, 0.7 + i * 0.15, 6), fireMat)
      f.position.set(-0.2 + i * 0.2, 0.7, -0.52)
      g.add(f)
    }
    sprite(M.glowWarm, 11.5, 0.78, 17.98, 2.3)
    const fireLight = new THREE.PointLight(0xff7a30, 11, 7, 2)
    fireLight.position.set(11.5, 0.9, 17.95)
    root.add(fireLight)
    world.lights.push(fireLight)
    // mantel candles
    candle(10.05, 2.74, 18.28, 0.3)
    candle(12.95, 2.74, 18.28, 0.3)
    collider(11.5, 18.55, 4.7, 1.0, 'prop', 2.9)
  }
  // chaise
  {
    const g = new THREE.Group()
    g.position.set(9.2, 0, 6.6)
    g.rotation.y = 0.5
    root.add(g)
    box(2.8, 0.45, 1.2, M.matVelvet, 0, 0.62, 0, 0, g)
    box(2.8, 0.9, 0.22, M.matVelvet, 0, 1.1, -0.5, 0, g)
    for (const s of [-1, 1]) {
      box(0.22, 0.7, 1.2, M.matVelvet, s * 1.3, 0.85, 0, 0, g)
      cylinder(0.05, 0.05, 0.3, M.matBrass, s * 1.1, 0.2, 0.4, 6, g)
    }
    box(2.6, 0.1, 0.9, M.matVelvet, 0, 0.9, 0.1, 0, g)
    collider(9.2, 6.6, 3.3, 1.8, 'prop', 1.6)
  }
  // side table + music box
  {
    box(1.5, 0.12, 1.5, matRosewood, 15.6, 1.0, 7.2, 0.2)
    cylinder(0.08, 0.12, 0.95, matWalnut, 15.6, 0.5, 7.2, 8)
    collider(15.6, 7.2, 1.7, 1.7, 'prop', 1.2)
  }
  // gramophone
  {
    const g = new THREE.Group()
    g.position.set(7.6, 0, 18.1)
    g.rotation.y = -0.3
    root.add(g)
    box(1.4, 0.9, 1.1, matWalnut, 0, 0.45, 0, 0, g)
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.08, 0.7, 16, 1, true), M.matBrass)
    horn.position.set(0, 1.25, 0)
    horn.rotation.x = -0.5
    g.add(horn)
    cylinder(0.05, 0.05, 0.6, M.matBrassDark, 0, 0.9, 0, 6, g)
    collider(7.6, 18.1, 1.7, 1.4, 'prop', 1.7)
  }
  // portraits
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group()
    const x = i < 2 ? 18.65 : 7.0 + i * 0.1
    const z = i < 2 ? 4.0 + i * 5.5 : 1.4
    const ry = i < 2 ? -Math.PI / 2 : 0
    g.position.set(x, 2.4, z)
    g.rotation.y = ry
    root.add(g)
    box(1.3, 1.7, 0.1, M.matBrassDark, 0, 0, 0, 0, g)
    box(1.1, 1.5, 0.05, M.matPaper, 0, 0, 0.06, 0, g)
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshStandardMaterial({ map: worldPortrait(i), roughness: 0.8 }))
    p.position.z = 0.09
    g.add(p)
  }
  // candelabra on piano
  {
    cylinder(0.04, 0.12, 0.7, M.matBrass, 15.7, 2.0, 13.4, 8)
    for (const s of [-1, 0, 1]) candle(15.7 + s * 0.28, 2.35, 13.4, 0.22)
  }

  /* ══════════════════════════════════════════════════════════
     GREAT HALL
     ══════════════════════════════════════════════════════════ */
  // pedestal + music box
  {
    cylinder(0.65, 0.8, 1.0, matRosewood, 0, 0.5, 7.2, 12)
    cylinder(0.72, 0.72, 0.1, matWalnut, 0, 1.03, 7.2, 12)
    collider(0, 7.2, 1.5, 1.5, 'prop', 1.2)
  }
  // console table + mirror
  {
    box(1.1, 0.12, 3.0, matWalnut, -5.4, 1.05, 2.0, 0)
    for (const z of [0.7, 3.3]) {
      cylinder(0.06, 0.08, 1.0, matWalnut, -5.0, 0.5, z, 8)
      cylinder(0.06, 0.08, 1.0, matWalnut, -5.8, 0.5, z, 8)
    }
    // mirror
    const mg = new THREE.Group()
    mg.position.set(-5.78, 2.4, 2.0)
    mg.rotation.y = Math.PI / 2
    root.add(mg)
    box(1.5, 2.2, 0.1, M.matBrassDark, 0, 0, 0, 0, mg)
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.0), M.matMirror)
    mirror.position.z = 0.07
    mg.add(mirror)
    // vase
    cylinder(0.16, 0.22, 0.5, matMint, -5.4, 1.36, 2.0, 12)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      cylinder(0.01, 0.01, 0.6, painted(0x4d6b3d), -5.4 + Math.cos(a) * 0.1, 1.85, 2.0 + Math.sin(a) * 0.1, 4)
      sphere(0.09, matRose, -5.4 + Math.cos(a) * 0.18, 2.16, 2.0 + Math.sin(a) * 0.18)
    }
    collider(-5.4, 2.0, 1.5, 3.3, 'prop', 1.3)
  }
  // grandfather clock
  {
    const g = new THREE.Group()
    g.position.set(5.25, 0, -8.4)
    root.add(g)
    box(1.2, 3.2, 0.8, matRosewood, 0, 1.6, 0, 0, g)
    box(1.0, 1.0, 0.1, matWalnut, 0, 2.5, 0.42, 0, g)
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshStandardMaterial({ color: 0xe8dcc6, roughness: 0.7 }))
    face.position.set(0, 2.5, 0.49)
    g.add(face)
    cylinder(0.02, 0.02, 0.3, M.matBlack, 0, 2.58, 0.51, 4, g)
    cylinder(0.02, 0.02, 0.24, M.matBlack, 0.06, 2.5, 0.51, 4, g).rotation.z = -1.2
    box(0.7, 1.2, 0.08, M.matGlass, 0, 1.1, 0.42, 0, g)
    // pendulum
    const pend = cylinder(0.02, 0.02, 1.0, M.matBrass, 0, 1.1, 0.47, 4, g)
    const bob = sphere(0.14, M.matBrass, 0, 0.62, 0.47, g)
    world.animators?.push?.(() => {})
    collider(5.25, -8.4, 1.5, 1.1, 'prop', 3.2)
    world.clockPendulum = { pend, bob, phase: Math.random() * 6 }
  }
  // hall portraits
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group()
    g.position.set(i ? 5.72 : -5.72, 2.6, -2.5)
    g.rotation.y = i ? -Math.PI / 2 : Math.PI / 2
    root.add(g)
    box(1.4, 1.9, 0.1, M.matBrassDark, 0, 0, 0, 0, g)
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.7), new THREE.MeshStandardMaterial({ map: worldPortrait(i + 2), roughness: 0.8 }))
    p.position.z = 0.07
    g.add(p)
  }
  // hall bench
  {
    box(1.0, 0.12, 3.0, M.matVelvet, 4.6, 0.62, 2.2, 0)
    for (const z of [1.0, 3.4]) {
      cylinder(0.05, 0.07, 0.6, matWalnut, 4.6, 0.3, z, 6)
    }
    collider(4.6, 2.2, 1.4, 3.3, 'prop', 0.9)
  }

  /* ══════════════════════════════════════════════════════════
     FRONT HALL + MORNING ROOM
     ══════════════════════════════════════════════════════════ */
  // coat rack
  {
    cylinder(0.05, 0.08, 2.6, matWalnut, -4.6, 1.3, -16.8, 8)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      cylinder(0.025, 0.025, 0.5, matWalnut, -4.6 + Math.cos(a) * 0.18, 2.35, -16.8 + Math.sin(a) * 0.18, 5).rotation.z = Math.cos(a) * 0.8
    }
    // coat
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.5, 10, 1, true), painted(0x3a3038, 0.95))
    coat.position.set(-4.25, 1.7, -16.8)
    root.add(coat)
    collider(-4.5, -16.8, 1.0, 1.0, 'prop', 2.7)
  }
  // side table
  {
    box(1.6, 0.12, 1.0, matWalnut, 3.8, 0.95, -13.0, 0)
    for (const sx of [-0.65, 0.65]) for (const sz of [-0.35, 0.35]) {
      cylinder(0.05, 0.06, 0.9, matWalnut, 3.8 + sx, 0.45, -13.0 + sz, 6)
    }
    candle(3.5, 1.02, -13.0, 0.3)
    collider(3.8, -13.0, 1.8, 1.2, 'prop', 1.2)
  }
  // exit sign
  {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 96
    const ctx = c.getContext('2d')
    ctx.fillStyle = 'rgba(20,12,18,.85)'
    ctx.fillRect(0, 0, 256, 96)
    ctx.strokeStyle = '#c9a05c'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, 248, 88)
    ctx.fillStyle = '#f0d39a'
    ctx.font = '600 44px Georgia, serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('EXIT', 128, 50)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.56), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
    sign.position.set(0, 3.75, -18.7)
    root.add(sign)
    sprite(M.glowWarm, 0, 3.75, -18.6, 1.8).material.opacity = 0.2
  }
  // morning room console + mirror
  {
    box(1.2, 0.12, 3.2, matWalnut, 0, 1.05, 18.1, 0)
    for (const x of [-0.45, 0.45]) for (const z of [16.8, 19.2]) {
      cylinder(0.06, 0.08, 1.0, matWalnut, x, 0.5, z, 8)
    }
    const mg = new THREE.Group()
    mg.position.set(0, 2.4, 18.6)
    mg.rotation.y = Math.PI
    root.add(mg)
    box(1.7, 2.2, 0.1, M.matBrassDark, 0, 0, 0, 0, mg)
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), M.matMirror)
    mirror.position.z = 0.07
    mg.add(mirror)
    collider(0, 18.1, 1.5, 3.5, 'prop', 1.3)
  }
  // dead plant
  {
    cylinder(0.3, 0.24, 0.5, matOchre, -4.8, 0.25, 17.4, 10)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const stem = cylinder(0.012, 0.012, 0.9, painted(0x5b4a2a), -4.8 + Math.cos(a) * 0.12, 0.85, 17.4 + Math.sin(a) * 0.12, 4)
      stem.rotation.z = Math.cos(a) * 0.4
      stem.rotation.x = Math.sin(a) * 0.4
    }
    collider(-4.8, 17.4, 0.8, 0.8, 'prop', 1.4)
  }

  /* ══════════════════════════════════════════════════════════
     MUSIC BOXES
     ══════════════════════════════════════════════════════════ */
  const boxTops = { 0: 1.1, 1: 1.12, 2: 1.09, 3: 1.07, 4: 1.08 }
  const boxPositions = [
    [-14, -12.5], [8.6, -17.55], [-16.8, 14.2], [15.6, 7.2], [0, 7.2],
  ]
  const dressColors = [0xd98ba3, 0x7aa8a0, 0xcfaa68, 0x8d4a58, 0xb85a78]

  for (let i = 0; i < 5; i++) {
    const [x, z] = boxPositions[i]
    const y = boxTops[i]
    const g = new THREE.Group()
    g.position.set(x, y, z)
    g.rotation.y = (i * 0.7) % Math.PI
    root.add(g)

    box(1.0, 0.52, 0.72, matRosewood, 0, 0.26, 0, 0, g, true)
    box(1.04, 0.06, 0.76, M.matBrass, 0, 0.5, 0, 0, g)
    for (const sx of [-0.42, 0.42]) {
      box(0.05, 0.52, 0.76, M.matBrass, sx, 0.26, 0, 0, g)
    }
    // inlaid lid
    const lid = new THREE.Group()
    lid.position.set(0, 0.53, -0.36)
    g.add(lid)
    box(1.0, 0.1, 0.72, matRosewood, 0, 0.05, 0.36, 0, lid)
    box(0.62, 0.02, 0.42, M.matBrass, 0, 0.11, 0.36, 0, lid)
    // ballerina
    const dancer = new THREE.Group()
    dancer.position.set(0, 0.54, 0)
    g.add(dancer)
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 12), new THREE.MeshStandardMaterial({ color: dressColors[i], roughness: 0.8 }))
    skirt.position.y = 0.11
    dancer.add(skirt)
    cylinder(0.035, 0.05, 0.18, M.matPorcelain, 0, 0.27, 0, 8, dancer)
    sphere(0.055, M.matPorcelain, 0, 0.4, 0, dancer)
    for (const s of [-1, 1]) {
      const arm = cylinder(0.014, 0.014, 0.18, M.matPorcelain, s * 0.07, 0.31, 0, 5, dancer)
      arm.rotation.z = s * 1.1
    }
    // winding key
    const key = new THREE.Group()
    key.position.set(0.52, 0.26, 0)
    g.add(key)
    cylinder(0.025, 0.025, 0.18, M.matBrass, 0, 0, 0, 6, key).rotation.z = Math.PI / 2
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 12), M.matBrass)
    handle.position.set(0.1, 0, 0)
    handle.rotation.y = Math.PI / 2
    key.add(handle)
    // glow
    const glow = sprite(M.glowWarm, x, y + 0.7, z, 1.8)
    glow.material.opacity = 0

    const boxObj = {
      id: i, x, z, y: y + 0.6, mesh: g, lid, dancer, key, glow,
      progress: 0, done: false, radius: 2.4,
      update(dt, t) {
        const target = this.done ? -1.45 : this.progress > 0 ? -0.55 : 0
        this.lid.rotation.x += (target - this.lid.rotation.x) * Math.min(1, dt * 6)
        if (this.done || this.progress > 0) {
          this.key.rotation.x += dt * (this.done ? 6 : 3.5)
          this.dancer.rotation.y += dt * (this.done ? 3.4 : 0.8)
        }
        if (this.done) {
          this.glow.material.opacity = 0.35 + Math.sin(t * 2.4 + i) * 0.08
          this.dancer.position.y = 0.54 + Math.sin(t * 2.2 + i) * 0.012
        } else {
          this.glow.material.opacity = 0
        }
      },
    }
    boxes.push(boxObj)
  }

  /* ══════════════════════════════════════════════════════════
     HIDING CHESTS
     ══════════════════════════════════════════════════════════ */
  const chestSpots = [
    [-8.6, -16.8, Math.PI * 0.5],
    [17.2, -4.2, -Math.PI * 0.5],
    [-17.2, 3.2, Math.PI * 0.5],
    [8.6, 16.8, Math.PI],
    [-4.6, 9.2, Math.PI * 0.5],
    [4.6, -16.6, -Math.PI * 0.5],
  ]
  for (let i = 0; i < chestSpots.length; i++) {
    const [x, z, ry] = chestSpots[i]
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = ry
    root.add(g)
    box(1.9, 0.9, 1.25, matWalnut, 0, 0.45, 0, 0, g, true)
    for (const sx of [-0.86, 0.86]) box(0.08, 0.95, 1.3, M.matBrassDark, sx, 0.48, 0, 0, g)
    const lid = new THREE.Group()
    lid.position.set(0, 0.9, -0.62)
    g.add(lid)
    box(1.94, 0.16, 1.28, matWalnut, 0, 0.08, 0.62, 0, lid, true)
    // star emblem
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 5), M.matBrass)
    star.rotation.x = Math.PI / 2
    star.position.set(0, 0.5, 0.64)
    g.add(star)
    box(0.3, 0.1, 0.06, M.matBrass, 0, 0.7, 0.64, 0, g)
    collider(x, z, 2.1, 1.45, 'prop', 1.1)
    const chest = {
      id: i, x, z, rot: ry, mesh: g, lid, occupant: null, radius: 2.0,
      update(dt) {
        const target = this.occupant ? -1.9 : 0
        this.lid.rotation.x += (target - this.lid.rotation.x) * Math.min(1, dt * 5)
      },
    }
    chests.push(chest)
  }

  /* ── generic wall decor ────────────────────────────────── */
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group()
    const side = i % 2 ? 1 : -1
    const roomZ = i < 2 ? -14 : i < 4 ? 12 : 4
    const x = side * 18.68
    g.position.set(x, 2.7, roomZ)
    g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
    root.add(g)
    box(0.9, 1.2, 0.08, M.matBrassDark, 0, 0, 0, 0, g)
    box(0.75, 1.0, 0.04, M.matPaper, 0, 0, 0.05, 0, g)
  }

  return { boxes, chests }
}

/* portrait texture cache (avoid re-creating canvases) */
import { portrait } from './textures.js'
const portraits = []
function worldPortrait(i) {
  if (!portraits[i]) portraits[i] = portrait(i)
  return portraits[i]
}
