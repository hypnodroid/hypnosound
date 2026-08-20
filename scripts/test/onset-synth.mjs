// Shared FFT-frame synthesizer + scoring helpers for onset-detector validation.
//
// Convention: 44.1 kHz, fftSize 2048 => 1024 magnitude bins, 21.53 Hz/bin.
// Spectra are Uint8Array (0-255) like AnalyserNode.getByteFrequencyData.
// Frames are emitted at a fixed rate; event times are in ms and are NOT
// snapped to frame boundaries unless a scenario says so.

export const SAMPLE_RATE = 44100
export const FFT_SIZE = 2048
export const BINS = FFT_SIZE / 2
export const BIN_HZ = SAMPLE_RATE / FFT_SIZE
export const FPS = 60
export const FRAME_MS = 1000 / FPS

export const hzToBin = (hz) => hz / BIN_HZ

// Deterministic hash noise: stable across runs, decorrelated across (frame, bin).
const hash = (a, b) => {
    let h = (a * 374761393 + b * 668265263) >>> 0
    h = (h ^ (h >>> 13)) >>> 0
    h = (h * 1274126177) >>> 0
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
export const noise = (frame, bin) => hash(frame + 1, bin + 1)

const gauss = (hz, centerHz, widthHz) => Math.exp(-0.5 * ((hz - centerHz) / widthHz) ** 2)

// A drum hit: narrow low-frequency body with a slow decay plus a broadband
// click with a fast decay. amp scales the whole thing.
export const drumHit = ({ centerHz = 60, widthHz = 35, bodyAmp = 230, bodyTauMs = 55, clickAmp = 45, clickHiHz = 5000, clickTauMs = 9 } = {}) => ({
    contribute(out, dtMs, frame) {
        if (dtMs < 0) return
        const body = bodyAmp * Math.exp(-dtMs / bodyTauMs)
        const click = clickAmp * Math.exp(-dtMs / clickTauMs)
        const clickHiBin = Math.min(BINS, Math.ceil(hzToBin(clickHiHz)))
        for (let i = 0; i < BINS; i++) {
            const hz = i * BIN_HZ
            out[i] += body * gauss(hz, centerHz, widthHz)
            if (i < clickHiBin) out[i] += click * (0.6 + 0.4 * noise(frame, i))
        }
    },
})

// A band-limited burst confined to [loHz, hiHz) — used for band-limiting tests.
export const bandHit = ({ loHz, hiHz, amp = 220, tauMs = 55 } = {}) => ({
    contribute(out, dtMs) {
        if (dtMs < 0) return
        const a = amp * Math.exp(-dtMs / tauMs)
        const lo = Math.max(0, Math.floor(hzToBin(loHz)))
        const hi = Math.min(BINS, Math.ceil(hzToBin(hiHz)))
        for (let i = lo; i < hi; i++) out[i] += a
    },
})

// Build a frame sequence. `events` = [{ atMs, source }]. `bed(frame, timeMs, out)`
// paints the always-on background (noise floor, drones, swells) before events.
export const synth = ({ durationMs, events = [], bed = null, fps = FPS, bins = BINS }) => {
    const frames = []
    const times = []
    const nFrames = Math.round((durationMs / 1000) * fps)
    const frameMs = 1000 / fps
    for (let frame = 0; frame < nFrames; frame++) {
        const timeMs = frame * frameMs
        const acc = new Float64Array(bins)
        if (bed) bed(frame, timeMs, acc)
        for (const { atMs, source } of events) source.contribute(acc, timeMs - atMs, frame)
        const out = new Uint8Array(bins)
        for (let i = 0; i < bins; i++) out[i] = Math.max(0, Math.min(255, Math.round(acc[i])))
        frames.push(out)
        times.push(timeMs)
    }
    return { frames, times }
}

export const runDetector = (detector, { frames, times }, overrides = {}) => {
    const detected = []
    const trace = []
    for (let i = 0; i < frames.length; i++) {
        const r = detector(frames[i], times[i], overrides)
        trace.push(r)
        if (r.onset) detected.push({ frame: i, timeMs: times[i], strength: r.strength, flux: r.flux, threshold: r.threshold })
    }
    return { detected, trace }
}

// One-to-one greedy nearest matching of detections to ground truth within toleranceMs.
export const score = (groundTruthMs, detectedMs, toleranceMs = 50) => {
    const usedGt = new Set()
    const usedDet = new Set()
    const pairs = []
    const cands = []
    for (let d = 0; d < detectedMs.length; d++) {
        for (let g = 0; g < groundTruthMs.length; g++) {
            const err = detectedMs[d] - groundTruthMs[g]
            if (Math.abs(err) <= toleranceMs) cands.push({ d, g, abs: Math.abs(err), err })
        }
    }
    cands.sort((a, b) => a.abs - b.abs)
    for (const c of cands) {
        if (usedGt.has(c.g) || usedDet.has(c.d)) continue
        usedGt.add(c.g)
        usedDet.add(c.d)
        pairs.push(c)
    }
    const tp = pairs.length
    const fp = detectedMs.length - tp
    const fn = groundTruthMs.length - tp
    const errs = pairs.map((p) => p.err)
    const abs = errs.map(Math.abs)
    return {
        tp,
        fp,
        fn,
        precision: detectedMs.length ? tp / detectedMs.length : groundTruthMs.length ? 0 : 1,
        recall: groundTruthMs.length ? tp / groundTruthMs.length : 1,
        meanErrMs: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : NaN,
        meanAbsErrMs: abs.length ? abs.reduce((a, b) => a + b, 0) / abs.length : NaN,
        maxAbsErrMs: abs.length ? Math.max(...abs) : NaN,
        errs,
    }
}

export const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : String(n))

let failures = 0
export const check = (label, ok, detail = '') => {
    if (!ok) failures++
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}
export const exitCode = () => failures

// Defect probes: report a fail when the defect IS present (opposite polarity to
// `check`, which reports a fail when an expectation is NOT met).
let defects = 0
export const defect = (label, present, detail = '') => {
    if (present) defects++
    console.log(`  ${present ? 'DEFECT' : 'ok    '}  ${label}${detail ? ` — ${detail}` : ''}`)
}
export const defectCount = () => defects
