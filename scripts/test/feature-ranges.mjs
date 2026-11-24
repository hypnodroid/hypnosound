// Empirically measure the observed output range of every exported audio feature.
// Used to document ranges in README.md — do not hand-write ranges, run this.
import AudioProcessor, * as hs from '../../index.js'

const N = 1024
const u8 = (fn) => Uint8Array.from({ length: N }, (_, i) => Math.max(0, Math.min(255, Math.round(fn(i)))))

// Deterministic pseudo-noise so runs are reproducible.
let seed = 12345
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

const spectra = {
    silence: () => u8(() => 0),
    fullScale: () => u8(() => 255),
    halfScale: () => u8(() => 128),
    noise: () => u8(() => rnd() * 255),
    lowTone: () => u8((i) => (i === 10 ? 255 : 0)),
    midTone: () => u8((i) => (i === 256 ? 255 : 0)),
    highTone: () => u8((i) => (i === 900 ? 255 : 0)),
    rampUp: () => u8((i) => (i / N) * 255),
    rampDown: () => u8((i) => (1 - i / N) * 255),
    sparse: () => u8((i) => (i % 64 === 0 ? 255 : 0)),
}

const FEATURES = hs.AudioFeatures
const obs = {}
for (const f of FEATURES) obs[f] = { min: Infinity, max: -Infinity, nan: 0, n: 0 }

// Drive through AudioProcessor (stateful path, as consumers use it).
for (const [name, gen] of Object.entries(spectra)) {
    const a = new AudioProcessor()
    for (let frame = 0; frame < 30; frame++) {
        const fft = gen()
        for (const f of FEATURES) {
            const o = obs[f]
            o.n++
            let value
            try { value = a[f](fft).value } catch (e) { o.threw = (o.threw || 0) + 1; continue }
            if (Number.isNaN(value)) { o.nan++; continue }
            if (value < o.min) o.min = value
            if (value > o.max) o.max = value
        }
    }
}

console.log('=== AudioProcessor path: observed min/max over 10 spectra x 30 frames ===')
const pad = (s, n) => String(s).padEnd(n)
console.log(pad('feature', 20), pad('min', 24), pad('max', 24), 'NaN frames')
for (const f of FEATURES) {
    const o = obs[f]
    console.log(pad(f, 20), pad(o.min === Infinity ? 'n/a' : o.min, 24), pad(o.max === -Infinity ? 'n/a' : o.max, 24), `NaN ${o.nan}/${o.n} threw ${o.threw||0}`)
}

// Functional path for the stateless features.
console.log('\n=== Functional path (single call per spectrum) ===')
for (const f of FEATURES) {
    if (f === 'spectralFlux') continue
    let min = Infinity, max = -Infinity, nan = 0
    for (const gen of Object.values(spectra)) {
        const v = hs[f](gen())
        if (Number.isNaN(v)) { nan++; continue }
        if (v < min) min = v
        if (v > max) max = v
    }
    console.log(pad(f, 20), pad(min, 24), pad(max, 24), nan ? `NaN on ${nan} spectra` : '')
}

// spectralFlux state-shape probe: AudioProcessor passes a scalar, the function indexes it.
console.log('\n=== spectralFlux state-shape probe ===')
const a2 = new AudioProcessor()
const noiseFrames = Array.from({ length: 5 }, () => spectra.noise())
noiseFrames.forEach((fft, i) => {
    try { console.log(`  AudioProcessor frame ${i}: ${a2.spectralFlux(fft).value}`) }
    catch (e) { console.log(`  AudioProcessor frame ${i}: THREW -> ${e.message}`) }
})
console.log('  functional, correct prev-FFT array:')
for (let i = 1; i < 4; i++) {
    console.log(`    frame ${i}: ${hs.spectralFlux(noiseFrames[i], noiseFrames[i - 1])}`)
}
