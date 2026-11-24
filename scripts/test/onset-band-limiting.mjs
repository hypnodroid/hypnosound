// Isolates the band-limiting behaviour of makeOnsetDetector, which is the
// feature the branch justifies with "bias toward kick-like transients".
//
//   node scripts/test/onset-band-limiting.mjs
//
// Two things are varied independently:
//   * band width in bins (a kick band at fftSize 2048 / 44.1 kHz is ~8 bins)
//   * frame-to-frame smoothness of the bed (AnalyserNode applies temporal
//     smoothing with smoothingTimeConstant, default 0.8; a raw FFT does not)
// The point is to separate "the band index math is wrong" from "an 8-bin band
// is variance-dominated, so the adaptive threshold cannot hold".

import { makeOnsetDetector } from '../../src/utils/onset.js'
import { BINS, BIN_HZ, hzToBin, noise, bandHit, drumHit, synth, runDetector, score, fmt, check, defect, exitCode, defectCount } from './onset-synth.mjs'

const header = (s) => console.log(`\n=== ${s} ===`)
const band = (loHz, hiHz) => ({ lowBin: Math.floor(hzToBin(loHz)), highBin: Math.ceil(hzToBin(hiHz)) })

const BANDS = {
    'kick 25-180Hz': band(25, 180),
    'low 0-500Hz': band(0, 500),
    'low 0-1500Hz': band(0, 1500),
    'full band': {},
}
for (const [name, b] of Object.entries(BANDS)) {
    const lo = b.lowBin ?? 0
    const hi = Number.isFinite(b.highBin) ? b.highBin : BINS
    console.log(`  ${name}: bins [${lo}, ${hi}) = ${hi - lo} bins`)
}
console.log(`  (binHz=${fmt(BIN_HZ)} at 44.1kHz / fftSize 2048)`)

// AnalyserNode-style temporal smoothing applied to a whole frame sequence.
const smoothSequence = ({ frames, times }, tau) => {
    if (!tau) return { frames, times }
    const state = new Float64Array(frames[0].length)
    const out = frames.map((f) => {
        const o = new Uint8Array(f.length)
        for (let i = 0; i < f.length; i++) {
            state[i] = tau * state[i] + (1 - tau) * f[i]
            o[i] = Math.max(0, Math.min(255, Math.round(state[i])))
        }
        return o
    })
    return { frames: out, times }
}

const beds = {
    'silent bed': null,
    'quiet white bed (level 18)': (frame, _t, out) => {
        for (let i = 0; i < BINS; i++) out[i] += 18 * (0.5 + 0.5 * noise(frame, i))
    },
    'quiet spectrally-shaped bed': (frame, _t, out) => {
        // Pink-ish, and the per-bin value only wobbles slightly frame to frame —
        // much closer to what a real analyser emits.
        for (let i = 0; i < BINS; i++) out[i] += (60 / (1 + i / 24)) * (0.92 + 0.08 * noise(frame, i))
    },
}

// -------------------------------------------- 1. single hit, band selectivity
header('1. Single hit at t=2000ms: does a bass-band detector select bass and reject treble?')
const singles = {
    'bass-only 40-140Hz': bandHit({ loHz: 40, hiHz: 140 }),
    'treble-only 5k-12kHz': bandHit({ loHz: 5000, hiHz: 12000 }),
    'full kick (body + click)': drumHit(),
}
for (const [bedName, bed] of Object.entries(beds)) {
    for (const tau of [0, 0.8]) {
        console.log(`\n  ${bedName}, smoothingTimeConstant=${tau}`)
        for (const [sigName, source] of Object.entries(singles)) {
            const raw = synth({ durationMs: 4000, bed, events: [{ atMs: 2000, source }] })
            const sig = smoothSequence(raw, tau)
            const row = []
            for (const [bandName, cfg] of Object.entries(BANDS)) {
                const { detected } = runDetector(makeOnsetDetector(cfg), sig)
                const nearHit = detected.filter((d) => Math.abs(d.timeMs - 2000) <= 50).length
                row.push(`${bandName}=${detected.length}(${nearHit}@hit)`)
            }
            console.log(`    ${sigName.padEnd(26)} ${row.join('  ')}`)
        }
    }
}

// Correctness assertion that does not depend on bed noise: with a silent bed the
// index math must select exactly the right band.
{
    const clean = (source) => synth({ durationMs: 4000, bed: null, events: [{ atMs: 2000, source }] })
    const bassCfg = BANDS['kick 25-180Hz']
    const bassHit = runDetector(makeOnsetDetector(bassCfg), clean(bandHit({ loHz: 40, hiHz: 140 }))).detected
    const trebHit = runDetector(makeOnsetDetector(bassCfg), clean(bandHit({ loHz: 5000, hiHz: 12000 }))).detected
    check('silent bed: kick-band detector catches the bass-only hit', bassHit.length >= 1, `got ${bassHit.length}`)
    check('silent bed: kick-band detector rejects the treble-only hit', trebHit.length === 0, `got ${trebHit.length}`)
}

// --------------------------------------- 2. precision on a kick grid per band
header('2. 120bpm kick grid: precision/recall per band and per smoothing setting')
{
    const durationMs = 12000
    const gt = []
    for (let t = 1000; t < durationMs - 100; t += 500) gt.push(t)
    for (const [bedName, bed] of Object.entries(beds)) {
        for (const tau of [0, 0.8]) {
            const raw = synth({ durationMs, bed, events: gt.map((atMs) => ({ atMs, source: drumHit() })) })
            const sig = smoothSequence(raw, tau)
            for (const [bandName, cfg] of Object.entries(BANDS)) {
                const { detected } = runDetector(makeOnsetDetector(cfg), sig)
                const s = score(gt, detected.map((d) => d.timeMs), 50)
                console.log(
                    `  ${bedName.padEnd(29)} tau=${tau}  ${bandName.padEnd(14)} det=${String(detected.length).padStart(3)} P=${fmt(s.precision, 3)} R=${fmt(s.recall, 3)} meanAbsErr=${fmt(s.meanAbsErrMs, 1)}ms`
                )
            }
        }
    }
}

// ----------------------------------- 3. how many bins does a band need to work?
header('3. False-positive rate vs band width on a steady white bed (no hits at all)')
{
    const sig = synth({
        durationMs: 20000,
        bed: (frame, _t, out) => {
            for (let i = 0; i < BINS; i++) out[i] += 40 * (0.5 + 0.5 * noise(frame, i))
        },
    })
    console.log('  a detector on stationary noise must produce zero onsets at every band width:')
    let firstClean = null
    for (const width of [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]) {
        const { detected } = runDetector(makeOnsetDetector({ lowBin: 0, highBin: width }), sig)
        const rate = detected.length / 20
        console.log(`    band width ${String(width).padStart(4)} bins: ${String(detected.length).padStart(4)} false onsets over 20s (${fmt(rate, 2)}/s)`)
        if (detected.length === 0 && firstClean === null) firstClean = width
    }
    const narrow = runDetector(makeOnsetDetector({ lowBin: 0, highBin: 8 }), sig).detected
    defect(
        'a narrow band on stationary noise false-fires: the median+MAD threshold does not survive band-averaging over few bins',
        narrow.length > 0,
        `${narrow.length} false onsets in 20s at 8 bins (a kick band at fftSize 2048); first width with zero false positives: ${firstClean}`
    )
}

// ------------------------------- 4. is the narrow-band failure level-dependent?
header('4. Narrow-band (8-bin) false positives vs absolute noise level')
console.log('  A truly adaptive threshold should be scale-invariant, so the false-onset')
console.log('  rate should not fall as the noise gets louder. If it does not fall, the')
console.log('  8-bin band is unusable on frame-uncorrelated input at ANY level.')
{
    const rates = []
    for (const level of [5, 10, 20, 40, 80, 160, 255]) {
        const sig = synth({
            durationMs: 20000,
            bed: (frame, _t, out) => {
                for (let i = 0; i < BINS; i++) out[i] += level * (0.5 + 0.5 * noise(frame, i))
            },
        })
        const n8 = runDetector(makeOnsetDetector({ lowBin: 1, highBin: 9 }), sig).detected.length
        const nFull = runDetector(makeOnsetDetector(), sig).detected.length
        rates.push({ level, n8, nFull })
        console.log(`    bed level ${String(level).padStart(3)}: 8-bin band ${String(n8).padStart(4)} false onsets/20s   full band ${String(nFull).padStart(4)}`)
    }
    const loud = rates.filter((r) => r.level >= 20)
    defect(
        'narrow-band false-positive rate does not decrease with level (failure is scale-invariant, not a tuning problem)',
        loud.every((r) => r.n8 > 5),
        `8-bin counts at levels >=20: ${loud.map((r) => r.n8).join(', ')}`
    )
    check('full band is clean on stationary noise at every level', rates.every((r) => r.nFull === 0), `counts: ${rates.map((r) => r.nFull).join(', ')}`)
}

console.log(`\n${exitCode()} check(s) failed, ${defectCount()} defect(s) confirmed`)
process.exit(exitCode() || defectCount() ? 1 : 0)
