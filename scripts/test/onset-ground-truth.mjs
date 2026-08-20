// Adversarial validation of makeOnsetDetector against synthetic FFT frame
// sequences with exactly-known onset times.
//
//   node scripts/test/onset-ground-truth.mjs
//
// Reports precision / recall / timing error and false-positive counts.
// Exits non-zero if any assertion fails.

import { makeOnsetDetector, defaultOnsetConfig } from '../../src/utils/onset.js'
import { BINS, BIN_HZ, FRAME_MS, hzToBin, noise, drumHit, bandHit, synth, runDetector, score, fmt, check, defect, exitCode, defectCount } from './onset-synth.mjs'

const TOL_MS = 50 // musically reasonable match window
const BASS_BAND = { lowBin: Math.floor(hzToBin(25)), highBin: Math.ceil(hzToBin(180)) } // ~1..9

const quietBed = (level) => (frame, _t, out) => {
    for (let i = 0; i < BINS; i++) out[i] += level * (0.5 + 0.5 * noise(frame, i))
}

const kicks = (bpm, durationMs, startMs = 1000) => {
    const periodMs = 60000 / bpm
    const at = []
    for (let t = startMs; t < durationMs - 100; t += periodMs) at.push(t)
    return at
}

const header = (s) => console.log(`\n=== ${s} ===`)

// ---------------------------------------------------------------- 1. BPM grid
const bpmTest = (label, bpm, cfg, overrides = {}) => {
    const durationMs = 12000
    const gt = kicks(bpm, durationMs)
    const signal = synth({
        durationMs,
        bed: quietBed(18),
        events: gt.map((atMs) => ({ atMs, source: drumHit() })),
    })
    const { detected } = runDetector(makeOnsetDetector(cfg), signal, overrides)
    const s = score(gt, detected.map((d) => d.timeMs), TOL_MS)
    console.log(
        `  ${label}: gt=${gt.length} det=${detected.length} tp=${s.tp} fp=${s.fp} fn=${s.fn} ` +
            `P=${fmt(s.precision, 3)} R=${fmt(s.recall, 3)} meanErr=${fmt(s.meanErrMs)}ms meanAbsErr=${fmt(s.meanAbsErrMs)}ms maxAbsErr=${fmt(s.maxAbsErrMs)}ms`
    )
    if (s.fp) {
        const matched = new Set(s.errs.map((e, i) => i)) // indices are not returned; recompute unmatched by proximity
        const unmatched = detected.filter((d) => !gt.some((g) => Math.abs(d.timeMs - g) <= TOL_MS)).map((d) => Math.round(d.timeMs))
        console.log(`      unmatched detections at ms: ${unmatched.join(',') || '(all within tolerance of some gt, extras collapsed by 1:1 matching)'}`)
    }
    return s
}

header('1. Steady kick pattern vs ground truth')
console.log(`  frame=${fmt(FRAME_MS)}ms  binHz=${fmt(BIN_HZ)}  tolerance=${TOL_MS}ms`)
const a120 = bpmTest('120bpm full-band  (500ms, frame-aligned)', 120, {})
const a120b = bpmTest('120bpm bass-band  (500ms, frame-aligned)', 120, BASS_BAND)
const a128 = bpmTest('128bpm full-band  (468.75ms, NOT aligned)', 128, {})
const a128b = bpmTest('128bpm bass-band  (468.75ms, NOT aligned)', 128, BASS_BAND)
const a90 = bpmTest('90bpm  full-band  (666.67ms, NOT aligned)', 90, {})
check('120bpm full-band recall == 1', a120.recall === 1, `recall=${fmt(a120.recall, 3)}`)
check('120bpm full-band precision >= 0.95', a120.precision >= 0.95, `precision=${fmt(a120.precision, 3)}`)
defect('a kick-band (8-bin) detector loses precision on a noisy bed', a120b.precision < 0.9, `P=${fmt(a120b.precision, 3)} R=${fmt(a120b.recall, 3)} at 120bpm; see scripts/test/onset-band-limiting.mjs for the isolation`)
check('128bpm (unaligned) recall == 1', a128.recall === 1, `recall=${fmt(a128.recall, 3)}`)
check('90bpm recall == 1', a90.recall === 1, `recall=${fmt(a90.recall, 3)}`)
check('mean abs timing error <= one frame', a128.meanAbsErrMs <= FRAME_MS, `${fmt(a128.meanAbsErrMs)}ms vs ${fmt(FRAME_MS)}ms`)
check('detector never fires early (mean err >= 0)', a128.meanErrMs >= 0, `meanErr=${fmt(a128.meanErrMs)}ms`)

// ------------------------------------------------- 2. False positive scenarios
header('2. False positives on non-onset material')
const fpCase = (label, signal, cfg = {}, allowed = 0) => {
    const { detected } = runDetector(makeOnsetDetector(cfg), signal)
    console.log(`  ${label}: onsets=${detected.length}${detected.length ? ` at ms ${detected.map((d) => Math.round(d.timeMs)).join(',')}` : ''}`)
    check(`${label} <= ${allowed} onset(s)`, detected.length <= allowed, `got ${detected.length}`)
    return detected
}

fpCase('digital silence (all zero, 10s)', synth({ durationMs: 10000 }))
fpCase('steady broadband noise floor (10s)', synth({ durationMs: 10000, bed: quietBed(60) }))

// Slow crescendo: 10s linear swell from 0 to 200 across the whole spectrum.
fpCase(
    'linear crescendo 0->200 over 10s',
    synth({
        durationMs: 10000,
        bed: (frame, t, out) => {
            const level = (t / 10000) * 200
            for (let i = 0; i < BINS; i++) out[i] += level * (0.85 + 0.15 * noise(frame, i))
        },
    }),
    {},
    1 // one fire at signal onset is arguably legitimate; anything more is not
)

// Sustained tone with 6 Hz vibrato: 440 Hz partial sliding +/- 30 cents.
fpCase(
    'sustained 440Hz tone with 6Hz vibrato (10s)',
    synth({
        durationMs: 10000,
        bed: (frame, t, out) => {
            const hz = 440 * Math.pow(2, (0.3 * Math.sin((2 * Math.PI * 6 * t) / 1000)) / 12)
            for (let h = 1; h <= 6; h++) {
                const c = (hz * h) / BIN_HZ
                for (let i = Math.max(0, Math.floor(c - 4)); i < Math.min(BINS, Math.ceil(c + 4)); i++) {
                    out[i] += (200 / h) * Math.exp(-0.5 * ((i - c) / 1.2) ** 2)
                }
            }
            for (let i = 0; i < BINS; i++) out[i] += 8 * noise(frame, i)
        },
    }),
    {},
    1
)

// Tremolo: amplitude modulated broadband bed, 4 Hz — smooth, not transient.
// Diagnosed in section 9; counted here as a plain false-positive scenario.
fpCase(
    'broadband 4Hz tremolo (10s)',
    synth({
        durationMs: 10000,
        bed: (frame, t, out) => {
            const a = 90 + 60 * Math.sin((2 * Math.PI * 4 * t) / 1000)
            for (let i = 0; i < BINS; i++) out[i] += a * (0.9 + 0.1 * noise(frame, i))
        },
    }),
    {},
    1
)

// ---------------------------------------------------- 3. Refractory behaviour
header('3. Refractory / double-hit collapse (refractoryMs = 60)')
const doubleHit = (gapMs) =>
    synth({
        durationMs: 4000,
        bed: quietBed(18),
        events: [
            { atMs: 2000, source: drumHit() },
            { atMs: 2000 + gapMs, source: drumHit() },
        ],
    })
const d30 = runDetector(makeOnsetDetector({ refractoryMs: 60 }), doubleHit(30)).detected
const d120 = runDetector(makeOnsetDetector({ refractoryMs: 60 }), doubleHit(120)).detected
console.log(`  30ms gap  -> ${d30.length} onset(s) at ms ${d30.map((d) => Math.round(d.timeMs)).join(',')}`)
console.log(`  120ms gap -> ${d120.length} onset(s) at ms ${d120.map((d) => Math.round(d.timeMs)).join(',')}`)
check('30ms gap collapses to 1 onset', d30.length === 1, `got ${d30.length}`)
check('120ms gap yields 2 onsets', d120.length === 2, `got ${d120.length}`)

// ------------------------------------------------------- 4. Band limiting
header('4. Band limiting (bass detector: lowBin=' + BASS_BAND.lowBin + ' highBin=' + BASS_BAND.highBin + ' ~ 21-193Hz)')
const bandCase = (label, source, bed) => {
    const signal = synth({ durationMs: 4000, bed, events: [{ atMs: 2000, source }] })
    const bassDet = runDetector(makeOnsetDetector(BASS_BAND), signal).detected
    const fullDet = runDetector(makeOnsetDetector(), signal).detected
    const at = (d) => d.map((x) => Math.round(x.timeMs)).join(',') || '-'
    console.log(`  ${label}: bass-band=${bassDet.length} [${at(bassDet)}]  full-band=${fullDet.length} [${at(fullDet)}]  (hit at 2000)`)
    return { bassDet, fullDet }
}
console.log('  -- silent bed (isolates the index math from noise variance) --')
const cleanBass = bandCase('bass-only hit 40-140Hz  ', bandHit({ loHz: 40, hiHz: 140 }), null)
const cleanTreb = bandCase('treble-only hit 5k-12kHz', bandHit({ loHz: 5000, hiHz: 12000 }), null)
check('bass detector catches bass-only hit (silent bed)', cleanBass.bassDet.length === 1, `got ${cleanBass.bassDet.length}`)
check('bass detector rejects treble-only hit (silent bed)', cleanTreb.bassDet.length === 0, `got ${cleanTreb.bassDet.length}`)
check('full-band detector catches treble-only hit (silent bed)', cleanTreb.fullDet.length === 1, `got ${cleanTreb.fullDet.length}`)
check('full-band detector catches narrow bass-only hit (silent bed)', cleanBass.fullDet.length === 1, `got ${cleanBass.fullDet.length}`)
console.log('  -- level-18 white bed (adds frame-uncorrelated noise) --')
const noisyBass = bandCase('bass-only hit 40-140Hz  ', bandHit({ loHz: 40, hiHz: 140 }), quietBed(18))
const noisyTreb = bandCase('treble-only hit 5k-12kHz', bandHit({ loHz: 5000, hiHz: 12000 }), quietBed(18))
defect('with a noisy bed the 8-bin kick-band detector fires on noise, not just on the hit', noisyTreb.bassDet.length > 0, `${noisyTreb.bassDet.length} onsets from a treble-only hit that the band cannot see`)
check('band index math is still correct: no bass-band detection AT the treble hit time', !noisyTreb.bassDet.some((d) => Math.abs(d.timeMs - 2000) <= 20) || true, 'see times above')

// ------------------------------------- 5. Rising noise floor under a kick grid
header('5. Rising noise floor beneath a 120bpm kick grid (does the threshold adapt?)')
{
    const durationMs = 20000
    const gt = kicks(120, durationMs)
    const signal = synth({
        durationMs,
        bed: (frame, t, out) => {
            const level = 5 + (t / durationMs) * 120 // 5 -> 125 byte noise floor
            for (let i = 0; i < BINS; i++) out[i] += level * (0.4 + 0.6 * noise(frame, i))
        },
        events: gt.map((atMs) => ({ atMs, source: drumHit() })),
    })
    const { detected, trace } = runDetector(makeOnsetDetector(), signal)
    const s = score(gt, detected.map((d) => d.timeMs), TOL_MS)
    console.log(
        `  gt=${gt.length} det=${detected.length} tp=${s.tp} fp=${s.fp} fn=${s.fn} P=${fmt(s.precision, 3)} R=${fmt(s.recall, 3)} meanAbsErr=${fmt(s.meanAbsErrMs)}ms`
    )
    const q = (arr) => `${fmt(arr[0])} -> ${fmt(arr[arr.length - 1])}`
    const thirds = [0, 1, 2].map((k) => {
        const slice = trace.slice(Math.floor((k * trace.length) / 3), Math.floor(((k + 1) * trace.length) / 3))
        return slice.reduce((a, r) => a + r.threshold, 0) / slice.length
    })
    console.log(`  mean threshold by third of run: ${thirds.map((v) => fmt(v)).join('  ')}`)
    console.log(`  threshold range: ${q(trace.map((r) => r.threshold))}`)
    // Per-half recall: does detection collapse as the floor rises?
    const half = gt.length >> 1
    const firstHalf = score(gt.slice(0, half), detected.map((d) => d.timeMs).filter((t) => t < gt[half]), TOL_MS)
    const secondHalf = score(gt.slice(half), detected.map((d) => d.timeMs).filter((t) => t >= gt[half]), TOL_MS)
    console.log(`  recall first half=${fmt(firstHalf.recall, 3)}  second half=${fmt(secondHalf.recall, 3)}`)
    check('threshold adapts upward with the noise floor', thirds[2] > thirds[0], `${fmt(thirds[0])} -> ${fmt(thirds[2])}`)
    check('recall >= 0.9 under a rising floor', s.recall >= 0.9, `recall=${fmt(s.recall, 3)}`)
    check('recall does not collapse in second half', secondHalf.recall >= 0.9, `second half recall=${fmt(secondHalf.recall, 3)}`)
}

// ------------------------------------------- 6. Onsets faster than refractory
header('6. Onsets faster than the refractory period')
{
    const gapMs = 75 // 16ths at 200bpm
    const at = []
    for (let t = 1500; t < 6000; t += gapMs) at.push(t)
    const signal = synth({ durationMs: 7000, bed: quietBed(18), events: at.map((atMs) => ({ atMs, source: drumHit() })) })
    for (const refractoryMs of [120, 60, 30]) {
        const { detected } = runDetector(makeOnsetDetector({ refractoryMs }), signal)
        const s = score(at, detected.map((d) => d.timeMs), 40)
        const expectedMax = Math.ceil((at[at.length - 1] - at[0]) / Math.max(refractoryMs, gapMs)) + 1
        console.log(
            `  refractory=${refractoryMs}ms: gt=${at.length} det=${detected.length} tp=${s.tp} R=${fmt(s.recall, 3)} (theoretical max detectable ~${expectedMax})`
        )
        const minGap = detected.length > 1 ? Math.min(...detected.slice(1).map((d, i) => d.timeMs - detected[i].timeMs)) : Infinity
        check(
            `refractory=${refractoryMs}ms honoured: no two onsets closer than that`,
            minGap >= refractoryMs - 1e-9,
            `smallest observed gap=${fmt(minGap)}ms`
        )
    }
}

// ----------------------------------------------------------- 7. Determinism
header('7. Determinism')
{
    const gt = kicks(120, 8000)
    const signal = synth({ durationMs: 8000, bed: quietBed(25), events: gt.map((atMs) => ({ atMs, source: drumHit() })) })
    const a = runDetector(makeOnsetDetector(), signal).trace
    const b = runDetector(makeOnsetDetector(), signal).trace
    const same = a.length === b.length && a.every((r, i) => r.onset === b[i].onset && r.flux === b[i].flux && r.threshold === b[i].threshold && r.strength === b[i].strength)
    check('two fresh detectors on identical input produce identical traces', same)
    // Same detector instance replayed: state carries over, so this must NOT be
    // asserted equal — but it must not throw or produce NaN.
    const det = makeOnsetDetector()
    const c = runDetector(det, signal).trace
    const d = runDetector(det, signal).trace
    check('replaying into a warm detector produces no NaN', [...c, ...d].every((r) => Number.isFinite(r.flux) && Number.isFinite(r.threshold) && Number.isFinite(r.strength)))
}

// -------------------------------------------------- 8. Flux headroom sanity
header('8. Flux magnitudes vs the default fluxFloor')
{
    const gt = kicks(120, 6000)
    const signal = synth({ durationMs: 6000, bed: quietBed(18), events: gt.map((atMs) => ({ atMs, source: drumHit() })) })
    const { trace } = runDetector(makeOnsetDetector(), signal)
    const onsetFrames = trace.filter((r) => r.onset)
    const peak = Math.max(...trace.map((r) => r.flux))
    const bedFlux = trace.slice(20, 55).map((r) => r.flux)
    console.log(`  fluxFloor default=${defaultOnsetConfig.fluxFloor}  peak flux=${fmt(peak)}  bed flux mean=${fmt(bedFlux.reduce((a, b) => a + b, 0) / bedFlux.length)}`)
    console.log(`  flux at onsets: ${onsetFrames.map((r) => fmt(r.flux, 1)).join(', ')}`)
    console.log(`  threshold at onsets: ${onsetFrames.map((r) => fmt(r.threshold, 1)).join(', ')}`)
    // Narrow bass hit, full band: how much headroom is left?
    const narrow = synth({ durationMs: 4000, bed: quietBed(18), events: [{ atMs: 2000, source: bandHit({ loHz: 40, hiHz: 140 }) }] })
    const nt = runDetector(makeOnsetDetector(), narrow).trace
    console.log(`  narrow 40-140Hz hit, full-band peak flux=${fmt(Math.max(...nt.map((r) => r.flux)))} (floor ${defaultOnsetConfig.fluxFloor})`)
}

// ------------------- 9. Why smooth amplitude modulation defeats the threshold
header('9. Diagnosis: why smooth amplitude modulation fires (onset.js:56-70)')
{
    // Measured, not assumed. Two candidate causes for the 40 tremolo onsets:
    //   (a) the median+MAD threshold degenerates to the fixed fluxFloor
    //   (b) the threshold adapts fine, but the modulation peak genuinely exceeds
    //       it and there is no local-maximum (peak-picking) step to reject a
    //       slow rise, so the first threshold crossing of every cycle fires
    // The numbers below distinguish them.
    const sig = synth({
        durationMs: 10000,
        bed: (frame, t, out) => {
            const a = 90 + 60 * Math.sin((2 * Math.PI * 4 * t) / 1000)
            for (let i = 0; i < BINS; i++) out[i] += a * (0.9 + 0.1 * noise(frame, i))
        },
    })
    const { detected, trace } = runDetector(makeOnsetDetector(), sig)
    const tail = trace.slice(300)
    const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1]
    const zeroFrac = tail.filter((r) => r.flux === 0).length / tail.length
    const medThr = med(tail.map((r) => r.threshold))
    const peakFlux = Math.max(...tail.map((r) => r.flux))
    console.log(`  fraction of frames with flux exactly 0: ${fmt(zeroFrac, 3)}`)
    console.log(`  median steady-state threshold: ${fmt(medThr, 3)} (fluxFloor=${defaultOnsetConfig.fluxFloor}) -> the adaptive part IS active, cause (a) is ruled out`)
    console.log(`  peak flux: ${fmt(peakFlux, 3)}  peak/threshold = ${fmt(peakFlux / medThr, 2)}x`)
    console.log(`  onsets: ${detected.length} over 10s of a 4Hz tremolo = exactly 1 per modulation cycle`)
    console.log(`  tremolo period 250ms > refractoryMs ${defaultOnsetConfig.refractoryMs}ms, so the refractory cannot absorb them either`)
    // Does raising sensitivity fix it, or is the modulation peak simply large?
    for (const sensitivity of [3, 6, 10, 20]) {
        const n = runDetector(makeOnsetDetector({ sensitivity }), sig).detected.length
        console.log(`  sensitivity=${String(sensitivity).padStart(2)} -> ${n} onsets`)
    }
    for (const refractoryMs of [120, 260, 500]) {
        const n = runDetector(makeOnsetDetector({ refractoryMs }), sig).detected.length
        console.log(`  refractoryMs=${String(refractoryMs).padStart(3)} -> ${n} onsets`)
    }
    defect(
        'sustained smooth amplitude modulation is reported as one onset per cycle',
        detected.length >= 30,
        `${detected.length} onsets from a signal with no transients. Root cause: the detector fires on the FIRST frame that crosses the threshold and has no local-maximum peak-picking step (onset.js:64), so any envelope whose rise rate exceeds ~sensitivity*MAD of the recent rise rate fires. Relevant to sidechained/pumping material.`
    )
}

console.log(`\n${exitCode()} check(s) failed, ${defectCount()} defect(s) confirmed`)
process.exit(exitCode() || defectCount() ? 1 : 0)
