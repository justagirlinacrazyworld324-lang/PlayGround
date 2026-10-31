/* ────────────────────────────────────────────────────────────
   Procedural sound. A music box, a heartbeat, and a house.
   ──────────────────────────────────────────────────────────── */

export class Sound {
  constructor() {
    this.ctx = null
    this.ready = false
    this.master = null
    this.musicGain = null
    this.ambientGain = null
    this.melodyTimer = 0
    this.melodyStep = 0
    this.heartTimer = 0
    this.heartPhase = 0
    this.stepTimer = 0
    this.windTimer = 0
    this.noiseBuffer = null
    this.muted = false
  }

  init() {
    if (this.ready) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.8
    this.master.connect(ctx.destination)

    // simple generated reverb
    const conv = ctx.createConvolver()
    const len = ctx.sampleRate * 1.8
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * 0.5
      }
    }
    conv.buffer = impulse
    this.reverb = ctx.createGain()
    this.reverb.gain.value = 0.22
    conv.connect(this.reverb)
    this.reverb.connect(this.master)

    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0.0
    this.musicGain.connect(this.master)
    this.musicGain.connect(conv)

    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = 0.0
    this.ambientGain.connect(this.master)

    // noise buffer
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const nd = nb.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
    this.noiseBuffer = nb

    // ambient drone
    for (const [freq, type, gain] of [[55, 'sine', 0.05], [82.5, 'sine', 0.025], [110.2, 'triangle', 0.012]]) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = freq
      const g = ctx.createGain()
      g.gain.value = gain
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.06 + Math.random() * 0.05
      const lg = ctx.createGain()
      lg.gain.value = gain * 0.4
      lfo.connect(lg)
      lg.connect(g.gain)
      o.connect(g)
      g.connect(this.ambientGain)
      o.start()
      lfo.start()
    }
    // air / room tone
    const air = ctx.createBufferSource()
    air.buffer = nb
    air.loop = true
    const airFilter = ctx.createBiquadFilter()
    airFilter.type = 'bandpass'
    airFilter.frequency.value = 420
    airFilter.Q.value = 0.6
    const airGain = ctx.createGain()
    airGain.gain.value = 0.018
    air.connect(airFilter)
    airFilter.connect(airGain)
    airGain.connect(this.ambientGain)
    air.start()

    this.ready = true
    if (ctx.state === 'suspended') ctx.resume()
  }

  startMusic() {
    if (!this.ready) return
    const t = this.ctx.currentTime
    this.musicGain.gain.cancelScheduledValues(t)
    this.musicGain.gain.setTargetAtTime(0.24, t, 1.2)
    this.ambientGain.gain.setTargetAtTime(0.5, t, 2)
  }

  stopMusic(fade = 1.2) {
    if (!this.ready) return
    const t = this.ctx.currentTime
    this.musicGain.gain.setTargetAtTime(0, t, fade * 0.4)
    this.ambientGain.gain.setTargetAtTime(0.12, t, fade * 0.5)
  }

  setMuted(m) {
    this.muted = m
    if (this.ready) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.1)
  }

  tone(freq, dur, { type = 'sine', gain = 0.1, when = 0, slide = 0, reverb = true, attack = 0.005 } = {}) {
    if (!this.ready) return
    const ctx = this.ctx
    const t = ctx.currentTime + when
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(this.master)
    if (reverb && this.reverb) g.connect(this.reverb)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  noise(dur, { gain = 0.08, filter = 1200, type = 'bandpass', when = 0, q = 1 } = {}) {
    if (!this.ready) return
    const ctx = this.ctx
    const t = ctx.currentTime + when
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(filter, t)
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    if (this.reverb) g.connect(this.reverb)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  ui() { this.tone(660, 0.08, { type: 'triangle', gain: 0.05 }) }

  step(hunter = false) {
    if (!this.ready) return
    this.noise(0.08, { gain: hunter ? 0.1 : 0.045, filter: hunter ? 180 : 520, type: 'lowpass' })
    if (hunter) this.tone(58, 0.1, { type: 'sine', gain: 0.05 })
  }

  wind() {
    this.noise(0.03, { gain: 0.04, filter: 2600, type: 'bandpass', q: 3 })
    this.tone(880 + Math.random() * 300, 0.035, { type: 'triangle', gain: 0.015 })
  }

  boxDone() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => this.tone(f, 0.9, { type: 'triangle', gain: 0.06, when: i * 0.11, reverb: true }))
    this.tone(261.6, 1.6, { type: 'sine', gain: 0.03, when: 0.1 })
  }

  hit() {
    this.noise(0.18, { gain: 0.2, filter: 700, type: 'lowpass' })
    this.tone(90, 0.25, { type: 'sine', gain: 0.16, slide: -40 })
    this.noise(0.12, { gain: 0.09, filter: 3200, type: 'highpass', when: 0.03 })
  }

  shatter() {
    this.noise(0.5, { gain: 0.16, filter: 2800, type: 'highpass' })
    for (let i = 0; i < 6; i++) {
      this.tone(1400 + Math.random() * 1800, 0.18, { type: 'triangle', gain: 0.03, when: i * 0.03 })
    }
  }

  scream() {
    this.tone(520, 0.3, { type: 'sawtooth', gain: 0.04, slide: -180 })
    this.tone(760, 0.25, { type: 'triangle', gain: 0.03, slide: -240 })
  }

  revive() {
    ;[392, 523, 659].forEach((f, i) => this.tone(f, 0.7, { type: 'sine', gain: 0.05, when: i * 0.12 }))
  }

  gate() {
    this.tone(120, 1.4, { type: 'sine', gain: 0.08, slide: 40 })
    this.noise(1.2, { gain: 0.08, filter: 300, type: 'lowpass' })
    ;[261, 329, 392, 523].forEach((f, i) => this.tone(f, 1.2, { type: 'triangle', gain: 0.04, when: 0.4 + i * 0.13 }))
  }

  sense() {
    this.tone(180, 0.8, { type: 'sawtooth', gain: 0.03, slide: 300 })
    this.tone(240, 1.2, { type: 'sine', gain: 0.04, slide: 500 })
    this.noise(0.8, { gain: 0.03, filter: 900, type: 'bandpass', q: 2 })
  }

  heartbeat(strength = 1) {
    this.tone(52, 0.16, { type: 'sine', gain: 0.06 + strength * 0.12, slide: -18 })
    this.tone(44, 0.2, { type: 'sine', gain: 0.05 + strength * 0.1, when: 0.16, slide: -12 })
  }

  escape() {
    ;[523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 1.6, { type: 'triangle', gain: 0.045, when: i * 0.09 }))
    this.noise(1.5, { gain: 0.04, filter: 2400, type: 'highpass' })
  }

  lose() {
    ;[220, 196, 174, 146].forEach((f, i) => this.tone(f, 1.8, { type: 'sine', gain: 0.05, when: i * 0.22 }))
  }

  update(dt, { active = false, hunterDist = 99, sense = false, role = 'survivor', moving = false, hunter = false, hidden = false } = {}) {
    if (!this.ready) return
    if (!active) {
      this.musicGain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.5)
      return
    }
    // music box loop
    this.melodyTimer -= dt
    if (this.melodyTimer <= 0) {
      this.melodyTimer = 0.42
      const melody = [0, 4, 7, 11, 12, 11, 7, 4, 2, 5, 9, 12, 14, 12, 9, 5]
      const base = 392
      const step = melody[this.melodyStep % melody.length]
      const freq = base * Math.pow(2, step / 12)
      this.tone(freq, 1.1, { type: 'triangle', gain: 0.032, attack: 0.004 })
      if (this.melodyStep % 4 === 0) this.tone(freq / 2, 1.6, { type: 'sine', gain: 0.018 })
      this.melodyStep++
    }
    // heartbeat
    if (role === 'survivor' && !hidden && hunterDist < 16) {
      const strength = Math.max(0, 1 - hunterDist / 16)
      const interval = 1.15 - strength * 0.65
      this.heartTimer -= dt
      if (this.heartTimer <= 0) {
        this.heartTimer = interval
        this.heartbeat(strength)
      }
    } else {
      this.heartTimer = 0
    }
    // footsteps
    if (moving) {
      this.stepTimer -= dt
      if (this.stepTimer <= 0) {
        this.stepTimer = hunter ? 0.34 : 0.42
        this.step(hunter)
      }
    } else {
      this.stepTimer = Math.min(this.stepTimer, 0.12)
    }
    if (sense) {
      this.senseGain = (this.senseGain || 0) + dt
      if (this.senseGain > 0.9) this.senseGain = 0.9
    } else {
      this.senseGain = 0
    }
  }
}
