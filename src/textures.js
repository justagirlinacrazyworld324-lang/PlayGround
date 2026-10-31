import * as THREE from 'three'

/* ────────────────────────────────────────────────────────────
   Hand-painted canvas textures. No external assets.
   ──────────────────────────────────────────────────────────── */

function makeCanvas(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')]
}

function finish(c, repeat = [1, 1]) {
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function speckle(ctx, size, amount = 0.05, alpha = 0.25) {
  ctx.save()
  ctx.globalAlpha = alpha
  for (let i = 0; i < size * size * amount; i++) {
    const v = Math.random() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4)
  }
  ctx.restore()
}

export function wallpaper(base, stripe, motif, repeat = [3, 2]) {
  const [c, ctx] = makeCanvas(512)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 512, 512)

  // soft vertical wash
  const grad = ctx.createLinearGradient(0, 0, 512, 0)
  grad.addColorStop(0, 'rgba(0,0,0,.12)')
  grad.addColorStop(0.5, 'rgba(255,255,255,.05)')
  grad.addColorStop(1, 'rgba(0,0,0,.12)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  ctx.globalAlpha = 0.22
  ctx.fillStyle = stripe
  for (let x = 0; x < 512; x += 64) ctx.fillRect(x, 0, 22, 512)
  ctx.globalAlpha = 1

  // damask diamonds
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = motif
  ctx.fillStyle = motif
  ctx.lineWidth = 2
  for (let y = 32; y < 512; y += 128) {
    for (let x = 32; x < 512; x += 128) {
      const ox = (Math.floor(y / 128) % 2) * 64
      ctx.beginPath()
      ctx.moveTo(x + ox, y - 26)
      ctx.quadraticCurveTo(x + ox + 22, y, x + ox, y + 26)
      ctx.quadraticCurveTo(x + ox - 22, y, x + ox, y - 26)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + ox, y, 7, 0, Math.PI * 2)
      ctx.fillStyle = base
      ctx.fill()
      ctx.fillStyle = motif
    }
  }
  ctx.globalAlpha = 1
  speckle(ctx, 512, 0.08, 0.12)
  return finish(c, repeat)
}

export function woodFloor(light = '#7a5238', dark = '#5a3a28') {
  const [c, ctx] = makeCanvas(512)
  ctx.fillStyle = light
  ctx.fillRect(0, 0, 512, 512)
  const plank = 64
  for (let y = 0; y < 512; y += plank) {
    const shade = 0.86 + Math.random() * 0.22
    ctx.fillStyle = shade > 1 ? dark : light
    ctx.globalAlpha = 0.22
    ctx.fillRect(0, y, 512, plank)
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(25,12,8,.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
    // plank seams
    for (let x = (y / plank) % 2 ? 0 : 128; x < 512; x += 256) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + plank)
      ctx.stroke()
    }
    // grain
    ctx.globalAlpha = 0.16
    ctx.strokeStyle = dark
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      const gy = y + 8 + Math.random() * (plank - 16)
      ctx.moveTo(0, gy)
      for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, gy + Math.sin(x * 0.02 + i) * 2.5)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  speckle(ctx, 512, 0.05, 0.1)
  return finish(c, [5, 5])
}

export function checkerTile(a = '#cdd6c7', b = '#415a52') {
  const [c, ctx] = makeCanvas(512)
  const n = 8
  const s = 512 / n
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? b : a
      ctx.fillRect(x * s, y * s, s, s)
      ctx.globalAlpha = 0.08
      ctx.fillStyle = '#000'
      ctx.fillRect(x * s, y * s, s, 2)
      ctx.fillRect(x * s, y * s, 2, s)
      ctx.globalAlpha = 1
    }
  }
  speckle(ctx, 512, 0.12, 0.1)
  return finish(c, [3, 3])
}

export function rugTexture(base = '#6d2039', accent = '#d8b87a', inner = '#2c1520') {
  const [c, ctx] = makeCanvas(512)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = accent
  ctx.lineWidth = 10
  ctx.strokeRect(20, 20, 472, 472)
  ctx.lineWidth = 3
  ctx.strokeRect(40, 40, 432, 432)
  ctx.strokeStyle = inner
  ctx.lineWidth = 18
  ctx.strokeRect(64, 64, 384, 384)
  // medallion
  ctx.save()
  ctx.translate(256, 256)
  ctx.strokeStyle = accent
  ctx.fillStyle = inner
  ctx.lineWidth = 4
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4)
    ctx.beginPath()
    ctx.ellipse(0, 110, 34, 96, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(0, 0, 58, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(0, 0, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // corner flourishes
  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.65
  for (const [x, y] of [[90, 90], [422, 90], [90, 422], [422, 422]]) {
    ctx.beginPath()
    ctx.arc(x, y, 26, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  speckle(ctx, 512, 0.18, 0.16)
  return finish(c, [1, 1])
}

export function fabric(base = '#7a2a3d', repeat = [2, 2]) {
  const [c, ctx] = makeCanvas(256)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 256, 256)
  ctx.globalAlpha = 0.12
  for (let i = 0; i < 256; i += 3) {
    ctx.fillStyle = i % 6 ? '#000' : '#fff'
    ctx.fillRect(0, i, 256, 1)
    ctx.fillRect(i, 0, 1, 256)
  }
  ctx.globalAlpha = 1
  speckle(ctx, 256, 0.2, 0.12)
  return finish(c, repeat)
}

export function portrait(seed = 0) {
  const [c, ctx] = makeCanvas(256)
  const hues = ['#3c2030', '#22303a', '#3a2a1e', '#2b2438']
  const skins = ['#e8cfb8', '#dcc0ab', '#f0dcc8']
  ctx.fillStyle = hues[seed % hues.length]
  ctx.fillRect(0, 0, 256, 256)
  const g = ctx.createRadialGradient(128, 90, 10, 128, 120, 170)
  g.addColorStop(0, 'rgba(255,225,190,.35)')
  g.addColorStop(1, 'rgba(0,0,0,.4)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  // shoulders
  ctx.fillStyle = seed % 2 ? '#5a1f35' : '#25343b'
  ctx.beginPath()
  ctx.ellipse(128, 250, 105, 85, 0, 0, Math.PI * 2)
  ctx.fill()
  // neck
  ctx.fillStyle = skins[seed % skins.length]
  ctx.fillRect(112, 165, 32, 40)
  // head
  ctx.beginPath()
  ctx.ellipse(128, 120, 52, 62, 0, 0, Math.PI * 2)
  ctx.fill()
  // hair
  ctx.fillStyle = seed % 2 ? '#2a1a14' : '#4a3020'
  ctx.beginPath()
  ctx.arc(128, 100, 56, Math.PI, 0)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(80, 128, 18, 46, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(176, 128, 18, 46, -0.2, 0, Math.PI * 2)
  ctx.fill()
  // eyes
  ctx.fillStyle = '#20141a'
  ctx.beginPath(); ctx.ellipse(108, 116, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(148, 116, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  // mouth
  ctx.strokeStyle = '#7c2c3a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(128, 145, 12, 0.2, Math.PI - 0.2)
  ctx.stroke()
  // varnish
  ctx.globalAlpha = 0.1
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 256, Math.random() * 256, 20, 1)
  ctx.globalAlpha = 1
  speckle(ctx, 256, 0.1, 0.1)
  return finish(c, [1, 1])
}

export function nightView() {
  const [c, ctx] = makeCanvas(512)
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#0a1324')
  g.addColorStop(0.55, '#14243a')
  g.addColorStop(1, '#25394a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  // stars
  ctx.fillStyle = 'rgba(220,235,255,.75)'
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512, y = Math.random() * 300
    const r = Math.random() * 1.4 + 0.3
    ctx.globalAlpha = 0.3 + Math.random() * 0.7
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  // moon
  const moon = ctx.createRadialGradient(370, 92, 4, 370, 92, 90)
  moon.addColorStop(0, 'rgba(255,248,225,.95)')
  moon.addColorStop(0.18, 'rgba(230,238,255,.85)')
  moon.addColorStop(0.55, 'rgba(170,200,240,.18)')
  moon.addColorStop(1, 'rgba(120,160,220,0)')
  ctx.fillStyle = moon
  ctx.beginPath(); ctx.arc(370, 92, 90, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f3f0dd'
  ctx.beginPath(); ctx.arc(370, 92, 26, 0, Math.PI * 2); ctx.fill()
  // distant trees / rooftops
  ctx.fillStyle = '#070c14'
  ctx.beginPath()
  ctx.moveTo(0, 512)
  ctx.lineTo(0, 380)
  for (let x = 0; x <= 512; x += 26) {
    ctx.lineTo(x, 380 - Math.abs(Math.sin(x * 0.021)) * 70 - Math.random() * 10)
  }
  ctx.lineTo(512, 512)
  ctx.closePath()
  ctx.fill()
  // window panes darkening
  ctx.fillStyle = 'rgba(8,14,24,.22)'
  for (let i = 0; i < 6; i++) ctx.fillRect(0, i * 85, 512, 3)
  return finish(c, [1, 1])
}

export function mirrorTexture() {
  const [c, ctx] = makeCanvas(256)
  const g = ctx.createLinearGradient(0, 0, 256, 256)
  g.addColorStop(0, '#9aa9ac')
  g.addColorStop(0.35, '#637579')
  g.addColorStop(0.55, '#394a4f')
  g.addColorStop(1, '#1d292d')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)

  // soft reflected room shapes
  ctx.globalAlpha = 0.16
  ctx.fillStyle = '#d8c8a8'
  ctx.fillRect(26, 34, 70, 118)
  ctx.fillStyle = '#a66a72'
  ctx.fillRect(148, 150, 82, 70)
  ctx.globalAlpha = 1

  // diagonal sheen
  const sheen = ctx.createLinearGradient(40, 220, 210, 30)
  sheen.addColorStop(0, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.48, 'rgba(255,255,255,.16)')
  sheen.addColorStop(0.56, 'rgba(255,255,255,.28)')
  sheen.addColorStop(0.64, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, 256, 256)

  // aged edge darkening
  const edge = ctx.createRadialGradient(128, 128, 60, 128, 128, 150)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,.55)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, 256, 256)
  speckle(ctx, 256, 0.006, 0.1)
  return finish(c, [1, 1])
}

export function glowTexture(color = '255,220,170') {
  const [c, ctx] = makeCanvas(128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, `rgba(${color},1)`)
  g.addColorStop(0.18, `rgba(${color},.75)`)
  g.addColorStop(0.45, `rgba(${color},.18)`)
  g.addColorStop(1, `rgba(${color},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeDust() {
  const count = 520
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 36
    positions[i * 3 + 1] = 0.25 + Math.random() * 3.6
    positions[i * 3 + 2] = (Math.random() - 0.5) * 36
    seeds[i] = Math.random() * Math.PI * 2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xffe0b0,
    size: 0.055,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geo, mat)
  points.userData.seeds = seeds
  return points
}
