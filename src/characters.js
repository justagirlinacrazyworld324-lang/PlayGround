import * as THREE from 'three'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'

/* ────────────────────────────────────────────────────────────
   Ball-jointed dolls, built from primitives, animated by hand.
   ──────────────────────────────────────────────────────────── */

const porcelain = new THREE.MeshPhysicalMaterial({
  color: 0xf3e4cf, roughness: 0.3, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.3,
})
const porcelainPale = new THREE.MeshPhysicalMaterial({
  color: 0xe8d6c2, roughness: 0.36, metalness: 0, clearcoat: 0.4,
})
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x161015, roughness: 0.28, metalness: 0.1 })
const blushMat = new THREE.MeshBasicMaterial({ color: 0xd98ba3, transparent: true, opacity: 0.4 })
const threadMat = new THREE.MeshStandardMaterial({ color: 0x3a2028, roughness: 0.8 })
const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a05c, roughness: 0.3, metalness: 0.8 })

function part(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}
function cyl(rt, rb, h, mat, x, y, z, parent, seg = 10) {
  return part(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, parent)
}
function ball(r, mat, x, y, z, parent, sx = 1, sy = 1, sz = 1) {
  const m = part(new THREE.SphereGeometry(r, 20, 16), mat, x, y, z, parent)
  m.scale.set(sx, sy, sz)
  return m
}

function makeButtonEye(parent, x, y, z, scale = 1, dark = true) {
  const mat = dark ? eyeMat : new THREE.MeshStandardMaterial({ color: 0xd8e6e0, roughness: 0.25 })
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.042 * scale, 0.042 * scale, 0.018, 16), mat)
  eye.rotation.x = Math.PI / 2
  eye.position.set(x, y, z)
  eye.castShadow = false
  parent.add(eye)
  // four button holes
  for (const [hx, hy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.006 * scale, 5, 4), new THREE.MeshBasicMaterial({ color: 0x070507 }))
    hole.position.set(x + hx * 0.014 * scale, y + hy * 0.014 * scale, z + 0.012)
    parent.add(hole)
  }
  // glint
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.009 * scale, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }))
  glint.position.set(x - 0.012 * scale, y + 0.014 * scale, z + 0.014)
  parent.add(glint)
  return eye
}

function makeHair(head, color, style) {
  const hairMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  // cap
  const cap = ball(0.228, hairMat, 0, 0.075, -0.06, head, 1.02, 0.98, 0.98)
  cap.scale.y = 0.9
  // fringe
  for (let i = 0; i < 5; i++) {
    const strand = ball(0.048, hairMat, -0.15 + i * 0.075, 0.205, 0.135, head, 1, 1.15, 0.5)
    strand.rotation.z = (i - 2) * 0.2
  }
  if (style === 'braids') {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        ball(0.075 - i * 0.008, hairMat, s * 0.22, 0.02 - i * 0.09, -0.06, head, 1, 1.2, 1)
      }
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 5, 10), goldMat)
      tie.position.set(s * 0.22, -0.25, -0.06)
      tie.rotation.x = Math.PI / 2
      head.add(tie)
    }
  } else if (style === 'bun') {
    ball(0.13, hairMat, 0, 0.19, -0.16, head)
    const pin = cyl(0.008, 0.008, 0.3, goldMat, 0, 0.2, -0.16, head, 5)
    pin.rotation.z = Math.PI / 2
  } else if (style === 'long') {
    for (const s of [-1, 1]) {
      const lock = ball(0.08, hairMat, s * 0.2, -0.12, -0.1, head, 0.9, 2.6, 0.7)
      lock.rotation.z = s * 0.15
    }
    const back = ball(0.18, hairMat, 0, -0.1, -0.17, head, 1.1, 1.6, 0.6)
  }
}

function buildSurvivor({ dress = 0x8d4a58, hair = 0x2a1a14, hairStyle = 'braids', skin = 0, name = '' } = {}) {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const dressMat = new THREE.MeshStandardMaterial({ color: dress, roughness: 0.82 })
  const dressMat2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(dress).offsetHSL(0, -0.05, 0.08), roughness: 0.85 })
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 })
  const skinMat = skin ? porcelainPale : porcelain

  // legs
  const legs = []
  for (const s of [-1, 1]) {
    const hip = new THREE.Group()
    hip.position.set(s * 0.105, 0.56, 0)
    body.add(hip)
    cyl(0.045, 0.038, 0.46, skinMat, 0, -0.23, 0, hip, 8)
    const shoe = ball(0.075, dressMat2, 0, -0.48, 0.045, hip, 1, 0.7, 1.5)
    shoe.castShadow = true
    legs.push(hip)
  }

  // skirt
  const skirt = cyl(0.19, 0.4, 0.52, dressMat, 0, 0.36, 0, body, 16)
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 6, 24), goldMat)
  hem.rotation.x = Math.PI / 2
  hem.position.y = 0.11
  body.add(hem)
  // petticoat frill
  const frill = cyl(0.4, 0.42, 0.09, new THREE.MeshStandardMaterial({ color: 0xe8d9c8, roughness: 0.9 }), 0, 0.12, 0, body, 18)
  // torso
  cyl(0.15, 0.19, 0.44, dressMat, 0, 0.82, 0, body, 14)
  ball(0.16, dressMat, 0, 1.0, 0, body, 1, 0.55, 0.85)
  // collar + bow
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 5, 14), new THREE.MeshStandardMaterial({ color: 0xefe1cb, roughness: 0.9 }))
  collar.rotation.x = Math.PI / 2
  collar.position.y = 1.06
  body.add(collar)
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.028, 6, 10), dressMat2)
  bow.position.set(0, 1.0, 0.15)
  body.add(bow)
  // buttons
  for (let i = 0; i < 3; i++) ball(0.022, goldMat, 0, 0.92 - i * 0.1, 0.155, body)

  // arms
  const arms = []
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group()
    shoulder.position.set(s * 0.245, 0.99, 0)
    shoulder.rotation.z = s * 0.18
    body.add(shoulder)
    cyl(0.038, 0.033, 0.34, skinMat, 0, -0.18, 0, shoulder, 8)
    ball(0.045, skinMat, 0, -0.36, 0, shoulder)
    cyl(0.033, 0.03, 0.28, skinMat, 0, -0.5, 0, shoulder, 8)
    ball(0.055, skinMat, 0, -0.66, 0.01, shoulder, 1, 0.9, 0.8)
    // sleeve puff
    ball(0.075, dressMat, 0, -0.03, 0, shoulder)
    arms.push(shoulder)
  }

  // head
  const head = new THREE.Group()
  head.position.set(0, 1.16, 0)
  body.add(head)
  const skull = ball(0.225, skinMat, 0, 0.1, 0, head, 1, 1.04, 0.95)
  // neck
  cyl(0.055, 0.065, 0.12, skinMat, 0, -0.02, 0, head, 8)
  // face
  makeButtonEye(head, -0.082, 0.11, 0.223)
  makeButtonEye(head, 0.082, 0.11, 0.223)
  // cheeks
  for (const s of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), blushMat)
    blush.position.set(s * 0.12, 0.04, 0.224)
    head.add(blush)
  }
  // stitched smile
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * 0.25
    const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.02, 2, 4), threadMat)
    stitch.position.set(Math.sin(a) * 0.075, 0.0 + Math.cos(a) * 0.015 - 0.005, 0.225)
    stitch.rotation.z = -a
    head.add(stitch)
  }
  // nose
  ball(0.018, skinMat, 0, 0.065, 0.228, head)
  // hair
  makeHair(head, hair, hairStyle)
  // hair bow
  const hairBow = new THREE.Group()
  hairBow.position.set(0.16, 0.27, 0.08)
  hairBow.rotation.z = -0.4
  head.add(hairBow)
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 5, 10), dressMat2)
    loop.position.x = s * 0.045
    loop.scale.set(1, 1.3, 1)
    hairBow.add(loop)
  }
  ball(0.02, goldMat, 0, 0, 0, hairBow)

  // ground ring
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf4e8d5, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 32), ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  root.add(ring)
  ring.visible = false

  // shards (hidden)
  const shards = new THREE.Group()
  shards.visible = false
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xf0e0cc, roughness: 0.4 })
  for (let i = 0; i < 9; i++) {
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.09), shardMat)
    const a = Math.random() * Math.PI * 2
    const r = 0.15 + Math.random() * 0.5
    shard.position.set(Math.cos(a) * r, 0.05 + Math.random() * 0.12, Math.sin(a) * r)
    shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    shards.add(shard)
  }
  const rag = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 8, 1, true), dressMat)
  rag.position.y = 0.12
  rag.rotation.z = 1.2
  shards.add(rag)
  root.add(shards)

  return {
    root, body, head, arms, legs, ring, shards, headGroup: head, name,
    state: 'idle', phase: Math.random() * 10, attackT: 0, shatterT: 0,
    baseY: 0,
  }
}

function buildHunter() {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const coatMat = new THREE.MeshStandardMaterial({ color: 0x211722, roughness: 0.78 })
  const coatMat2 = new THREE.MeshStandardMaterial({ color: 0x2f2130, roughness: 0.82 })
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3c2430, roughness: 0.9 })
  const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xdcc9b6, roughness: 0.4, clearcoat: 0.3 })
  const thread = new THREE.MeshStandardMaterial({ color: 0x241118, roughness: 0.8 })

  // legs
  const legs = []
  for (const s of [-1, 1]) {
    const hip = new THREE.Group()
    hip.position.set(s * 0.16, 1.02, 0)
    body.add(hip)
    cyl(0.075, 0.06, 0.9, coatMat2, 0, -0.45, 0, hip, 8)
    const boot = ball(0.11, new THREE.MeshStandardMaterial({ color: 0x140e14, roughness: 0.5 }), 0, -0.94, 0.07, hip, 1, 0.7, 1.6)
    legs.push(hip)
  }
  // long coat
  const coat = cyl(0.26, 0.52, 1.3, coatMat, 0, 0.85, 0, body, 14)
  const coatTail = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.9, 12, 1, true), coatMat)
  coatTail.position.y = 0.45
  body.add(coatTail)
  // belt, back buckle and shoulder mantle — the silhouette from behind
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 6, 20), new THREE.MeshStandardMaterial({ color: 0x120c12, roughness: 0.55 }))
  belt.rotation.x = Math.PI / 2
  belt.position.y = 1.2
  body.add(belt)
  part(new THREE.BoxGeometry(0.15, 0.12, 0.05), goldMat, 0, 1.2, -0.4, body)
  for (const s of [-1, 1]) {
    ball(0.12, coatMat2, s * 0.34, 1.86, -0.01, body, 1.15, 0.5, 1.05)
    ball(0.028, goldMat, s * 0.34, 1.94, 0.02, body)
  }
  // high collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.29, 0.26, 12, 1, true), coatMat2)
  collar.position.y = 1.98
  body.add(collar)
  // stitched seam down the upper back
  for (let i = 0; i < 4; i++) {
    const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.038, 2, 4), thread)
    stitch.position.set(0, 1.88 - i * 0.12, -0.285)
    stitch.rotation.z = Math.PI / 2
    body.add(stitch)
  }
  // torso
  cyl(0.22, 0.28, 0.7, shirtMat, 0, 1.55, 0, body, 12)
  ball(0.28, coatMat, 0, 1.85, 0, body, 1.25, 0.55, 0.9)
  // coat lapels
  for (const s of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.55), coatMat2)
    lapel.position.set(s * 0.1, 1.55, 0.26)
    lapel.rotation.z = s * 0.28
    body.add(lapel)
  }
  // buttons
  for (let i = 0; i < 4; i++) ball(0.026, goldMat, 0.02, 1.75 - i * 0.17, 0.27, body)
  // thread spool charm
  cyl(0.05, 0.05, 0.1, new THREE.MeshStandardMaterial({ color: 0x9b2b42, roughness: 0.8 }), 0.22, 1.15, 0.2, body, 10)

  // arms (long)
  const arms = []
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group()
    shoulder.position.set(s * 0.43, 1.78, 0)
    shoulder.rotation.z = s * 0.2
    body.add(shoulder)
    cyl(0.06, 0.05, 0.62, coatMat2, 0, -0.3, 0, shoulder, 8)
    ball(0.06, coatMat2, 0, -0.62, 0, shoulder)
    cyl(0.05, 0.042, 0.62, skinMat, 0, -0.93, 0, shoulder, 8)
    // hand
    const hand = ball(0.085, skinMat, 0, -1.26, 0.01, shoulder, 0.9, 1.1, 0.8)
    for (let f = 0; f < 3; f++) {
      const finger = cyl(0.012, 0.014, 0.22, skinMat, (f - 1) * 0.04, -1.39, 0.03, shoulder, 5)
      finger.rotation.x = 0.2
    }
    arms.push(shoulder)
  }

  // scissors in right hand
  const scissors = new THREE.Group()
  scissors.position.set(0, -1.35, 0.06)
  scissors.rotation.x = 0.4
  arms[1].add(scissors)
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xb8c2c8, roughness: 0.22, metalness: 0.9 })
  for (const s of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.7, 4), bladeMat)
    blade.position.set(s * 0.035, -0.28, 0)
    blade.rotation.z = s * 0.06
    scissors.add(blade)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 6, 14), goldMat)
    handle.position.set(s * 0.07, 0.1, 0)
    handle.rotation.y = Math.PI / 2
    scissors.add(handle)
  }
  ball(0.03, goldMat, 0, 0.02, 0, scissors)

  // head
  const head = new THREE.Group()
  head.position.set(0, 2.02, 0)
  body.add(head)
  cyl(0.07, 0.09, 0.16, skinMat, 0, -0.08, 0, head, 8)
  const skull = ball(0.25, skinMat, 0, 0.14, 0, head, 0.95, 1.12, 0.92)
  // left button eye, right stitched X
  makeButtonEye(head, -0.09, 0.16, 0.24, 1.25)
  const xMat = thread
  for (const r of [0.6, -0.6]) {
    const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.1, 2, 4), xMat)
    st.position.set(0.095, 0.16, 0.245)
    st.rotation.z = r
    head.add(st)
  }
  // stitched mouth
  for (let i = 0; i < 7; i++) {
    const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.035, 2, 4), xMat)
    st.position.set(-0.09 + i * 0.03, -0.02 + Math.sin(i) * 0.008, 0.245)
    st.rotation.z = Math.PI / 2
    head.add(st)
  }
  // crack
  const crackMat = new THREE.MeshBasicMaterial({ color: 0x6b3a44 })
  let cx = -0.02, cy = 0.24
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.06, 2, 4), crackMat)
    seg.position.set(cx + i * 0.02, cy - i * 0.05, 0.243)
    seg.rotation.z = 0.5 - i * 0.35
    head.add(seg)
  }
  // hair (thin, grey)
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a4048, roughness: 0.9 })
  for (let i = 0; i < 8; i++) {
    const strand = ball(0.045, hairMat, -0.18 + i * 0.05, 0.28 + Math.sin(i) * 0.02, -0.05, head, 0.8, 1.6, 0.7)
    strand.rotation.z = (i - 3.5) * 0.12
  }
  // grey queue down the back, tied with a wine-red ribbon
  const queue = new THREE.Group()
  queue.position.set(0, 0.14, -0.19)
  head.add(queue)
  for (let i = 0; i < 4; i++) {
    ball(0.075 - i * 0.012, hairMat, 0, -i * 0.11, -0.01 - i * 0.012, queue, 1, 1.25, 0.8)
  }
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 5, 10), new THREE.MeshStandardMaterial({ color: 0x6d1f35, roughness: 0.8 }))
  ribbon.position.set(0, 0.02, -0.03)
  ribbon.rotation.x = Math.PI / 2
  queue.add(ribbon)
  // top hat
  const hat = new THREE.Group()
  hat.position.set(0, 0.37, -0.02)
  hat.rotation.z = -0.06
  head.add(hat)
  cyl(0.24, 0.24, 0.025, coatMat, 0, 0, 0, hat, 20)
  cyl(0.15, 0.17, 0.34, coatMat, 0, 0.18, 0, hat, 20)
  const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.018, 5, 20), new THREE.MeshStandardMaterial({ color: 0x6d1f35, roughness: 0.7 }))
  hatBand.rotation.x = Math.PI / 2
  hatBand.position.y = 0.05
  hat.add(hatBand)
  // tiny doll on hat
  ball(0.04, porcelain, 0.12, 0.36, 0, hat)
  // brass winding key in the small of his back
  const windKey = new THREE.Group()
  windKey.position.set(0, 1.4, -0.42)
  body.add(windKey)
  const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.2, 8), goldMat)
  keyShaft.rotation.x = Math.PI / 2
  keyShaft.position.z = 0.1
  windKey.add(keyShaft)
  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.026, 6, 18), goldMat)
  keyRing.position.z = 0.2
  windKey.add(keyRing)
  const keySpoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.035), goldMat)
  keySpoke.position.set(0.08, 0, 0.2)
  windKey.add(keySpoke)
  ball(0.035, goldMat, 0, 0, 0.2, windKey)
  // marionette strings + bar
  const stringMat = new THREE.MeshBasicMaterial({ color: 0xd8cbb0, transparent: true, opacity: 0.35 })
  const bar = new THREE.Group()
  bar.position.set(0, 3.15, 0)
  root.add(bar)
  cyl(0.018, 0.018, 0.9, new THREE.MeshStandardMaterial({ color: 0x3a2a20 }), 0, 0, 0, bar, 5).rotation.z = Math.PI / 2
  for (const [x, z] of [[-0.35, 0], [0.35, 0], [0, 0.25]]) {
    const str = cyl(0.003, 0.003, 2.7, stringMat, x, -1.4, z, bar, 3)
    str.castShadow = false
  }
  // eye glow
  const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff3048, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))
  eyeGlow.position.set(-0.09, 2.18, 0.24)
  eyeGlow.scale.set(0.35, 0.35, 1)
  root.add(eyeGlow)
  eyeGlow.visible = false

  // ground ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.58, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4a5e, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  root.add(ring)
  ring.visible = false

  // shards
  const shards = new THREE.Group()
  shards.visible = false
  root.add(shards)

  return {
    root, body, head, arms, legs, ring, shards, headGroup: head, eyeGlow, windKey,
    state: 'idle', phase: Math.random() * 10, attackT: 0, shatterT: 0, baseY: 0,
  }
}

export class Doll {
  constructor(scene, opts = {}) {
    this.isHunter = Boolean(opts.hunter)
    this.rig = this.isHunter ? buildHunter() : buildSurvivor(opts)
    this.root = this.rig.root
    this.root.position.set(opts.x || 0, 0, opts.z || 0)
    scene.add(this.root)
    this.state = 'idle'
    this.speed = 0
    this.attackT = 0
    this.time = Math.random() * 20
    this.ring = this.rig.ring
    this.downedTilt = 0
    this.hitFlash = 0
    this.windKeySpin = 0
    this.visible = true
    this.shattered = false
  }

  setRing(visible, color) {
    this.ring.visible = visible
    if (color) this.ring.material.color.set(color)
  }

  setPosition(x, z) {
    this.root.position.x = x
    this.root.position.z = z
  }

  getPosition() {
    return { x: this.root.position.x, z: this.root.position.z }
  }

  faceTowards(x, z, dt = 1, speed = 10) {
    const dx = x - this.root.position.x
    const dz = z - this.root.position.z
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return
    const target = Math.atan2(dx, dz)
    let cur = this.root.rotation.y
    let diff = target - cur
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this.root.rotation.y = cur + diff * Math.min(1, dt * speed)
  }

  attack() {
    this.attackT = 0.42
  }

  shatter() {
    this.shattered = true
    this.root.visible = false
    if (this.rig.shards) this.rig.shards.visible = true
    if (this.ring) this.ring.visible = false
  }

  reset(x, z) {
    this.shattered = false
    this.root.visible = true
    this.root.position.set(x, 0, z)
    if (this.rig.shards) this.rig.shards.visible = false
    this.attackT = 0
    this.state = 'idle'
    this.rig.body.rotation.set(0, 0, 0)
    this.rig.body.position.set(0, 0, 0)
  }

  update(dt, { speed = 0, state = 'idle', time = 0 } = {}) {
    this.time = time
    this.speed = speed
    this.state = state
    const rig = this.rig
    const t = this.time
    if (this.shattered) {
      if (rig.shards) rig.shards.rotation.y += dt * 0.02
      return
    }
    if (this.attackT > 0) this.attackT = Math.max(0, this.attackT - dt)

    // walking cycle
    const moving = speed > 0.25 && state !== 'downed' && state !== 'hide'
    const pace = this.isHunter ? 2.4 : 3.6
    this.phase = (this.phase || 0) + dt * speed * pace
    const swing = moving ? Math.min(1, speed / 3.4) : 0
    const legAmp = (this.isHunter ? 0.7 : 0.58) * swing
    const armAmp = (this.isHunter ? 0.55 : 0.45) * swing
    const sin = Math.sin(this.phase)
    const cos = Math.cos(this.phase)

    rig.legs[0].rotation.x = sin * legAmp
    rig.legs[1].rotation.x = -sin * legAmp
    rig.legs[0].rotation.z = 0
    rig.legs[1].rotation.z = 0

    let armSwing = -sin * armAmp
    rig.arms[0].rotation.x = armSwing
    rig.arms[1].rotation.x = -armSwing
    rig.arms[0].rotation.z = this.isHunter ? 0.14 : 0.1
    rig.arms[1].rotation.z = this.isHunter ? -0.14 : -0.1
    rig.arms[0].rotation.y = 0
    rig.arms[1].rotation.y = 0

    // idle breathing / sway
    const breathe = Math.sin(t * 1.6) * 0.012
    rig.body.position.y = moving ? Math.abs(cos) * 0.025 : breathe
    rig.body.rotation.z = moving ? sin * 0.015 : Math.sin(t * 0.9) * 0.01
    rig.body.rotation.x = moving ? -swing * 0.07 : 0
    rig.head.rotation.z = Math.sin(t * 0.7 + 1) * 0.02
    rig.head.rotation.y = Math.sin(t * 0.45) * 0.06

    // wounded / grace / wind / attack poses
    if (state === 'injured') {
      rig.body.rotation.z = 0.09 + Math.sin(t * 2.2) * 0.015
      rig.arms[0].rotation.x = 0.25
      rig.arms[1].rotation.x = 0.18
      rig.head.rotation.z = -0.08
    }
    if (state === 'grace') {
      rig.body.rotation.x = -0.22
      rig.arms[0].rotation.x = -0.9
      rig.arms[1].rotation.x = 0.9
      rig.arms[0].rotation.z = 0.5
      rig.arms[1].rotation.z = -0.5
    }
    if (state === 'wind') {
      rig.arms[0].rotation.x = -1.05 + Math.sin(t * 12) * 0.08
      rig.arms[1].rotation.x = -1.05 + Math.sin(t * 12 + 1) * 0.08
      rig.arms[0].rotation.z = 0.28
      rig.arms[1].rotation.z = -0.28
      rig.body.rotation.x = -0.08
      rig.head.rotation.x = 0.18
    }
    if (state === 'revive' || state === 'heal') {
      rig.arms[0].rotation.x = -0.95 + Math.sin(t * 10) * 0.15
      rig.arms[1].rotation.x = -0.95 + Math.sin(t * 10 + 2) * 0.15
      rig.body.rotation.x = -0.25
      rig.head.rotation.x = 0.25
    }
    if (this.attackT > 0) {
      const p = 1 - this.attackT / 0.42
      const arc = Math.sin(p * Math.PI)
      rig.arms[1].rotation.x = -1.5 * arc
      rig.arms[1].rotation.z = -0.3 - 0.9 * arc
      rig.arms[1].rotation.y = -0.7 * arc
      rig.body.rotation.y = -0.35 * arc
    } else {
      rig.body.rotation.y = 0
    }
    if (state === 'sense') {
      rig.arms[0].rotation.x = -0.25
      rig.arms[1].rotation.x = -0.25
      rig.arms[0].rotation.z = 1.1
      rig.arms[1].rotation.z = -1.1
      rig.head.rotation.x = -0.2
    }
    if (this.isHunter && rig.eyeGlow) rig.eyeGlow.visible = state === 'sense' || state === 'chase'
    if (this.isHunter && rig.windKey) {
      this.windKeySpin += dt * (state === 'chase' ? 2.4 : 0.55)
      rig.windKey.rotation.z = this.windKeySpin
    }

    // downed: lie back, then subtle crawl
    const targetTilt = state === 'downed' ? -1.32 : 0
    this.downedTilt += (targetTilt - this.downedTilt) * Math.min(1, dt * 7)
    rig.body.rotation.x += this.downedTilt
    if (state === 'downed') {
      rig.body.position.y = 0.18
      rig.arms[0].rotation.x = -0.4
      rig.arms[1].rotation.x = -0.2
      rig.legs[0].rotation.x = 0.1
      rig.legs[1].rotation.x = 0.25
      rig.head.rotation.z = 0.2
    } else {
      rig.body.position.y = moving ? Math.abs(cos) * 0.025 : breathe
    }
  }
}

export function createDoll(scene, opts) {
  return new Doll(scene, opts)
}

export const SURVIVOR_LOOKS = [
  { name: 'Poppy', dress: 0x8d4a58, hair: 0x3a2119, hairStyle: 'braids', skin: 0, accent: '#e2a0b4' },
  { name: 'Mallow', dress: 0x4f7d6e, hair: 0x201817, hairStyle: 'bun', skin: 1, accent: '#9ec9b8' },
  { name: 'Jinx', dress: 0x8a6a35, hair: 0x6b3a22, hairStyle: 'long', skin: 0, accent: '#e6c48a' },
  { name: 'Wren', dress: 0x4a5f7c, hair: 0x2a2a33, hairStyle: 'long', skin: 1, accent: '#a9bfd6' },
]
