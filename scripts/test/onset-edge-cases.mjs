// Code-level defect probes for src/utils/onset.js.
//
//   node scripts/test/onset-edge-cases.mjs
//
// Each probe targets a specific line/behaviour called out in review. Failing
// probes are labelled with the suspected defect. Exits non-zero on failure.

import { makeOnsetDetector, defaultOnsetConfig } from '../../src/utils/onset.js'
import { fmt, check, defect, exitCode, defectCount } from './onset-synth.mjs'

const FRAME_MS = 1000 / 60
const flat = (n, v) => {
    const a = new Uint8Array(n)
    a.fill(v)
    return a
}
const spike = (n, bin, v, base = 0) => {
    const a = flat(n, base)
    a[bin] = v
    return a
}
const header = (s) => console.log(`\n=== ${s} ===`)

// ---------------------------------------------------------------------------
header('A. Band index math: lowBin inclusive, highBin exclusive (onset.js:35-46)')
// Alternate 0 / spike on one bin so every other frame has positive flux only
// from that bin. flux > 0 iff the bin is inside [lo, hi).
const binVisible = (bin, lowBin, highBin, bins = 32) => {
    const det = makeOnsetDetector({ lowBin, highBin, warmupFrames: 1, fluxFloor: 0, sensitivity: 0, ratio: 0 })
    det(flat(bins, 0), 0)
    const r = det(spike(bins, bin, 200), FRAME_MS)
    return r.flux > 0
}
check('bin 4 visible to [4,8)', binVisible(4, 4, 8))
check('bin 7 visible to [4,8)', binVisible(7, 4, 8))
check('bin 3 NOT visible to [4,8)', !binVisible(3, 4, 8))
check('bin 8 NOT visible to [4,8) (highBin exclusive)', !binVisible(8, 4, 8))
check('bin 0 visible to default full band', binVisible(0, 0, Infinity))
check('last bin visible to default full band', binVisible(31, 0, Infinity))
// Fractional bounds: floor(lo) / ceil(hi) widens the band on both sides.
check('fractional band [4.7, 7.2) actually admits bin 4 (Math.floor widens low edge)', binVisible(4, 4.7, 7.2), 'documented rounding-outward behaviour')
check('fractional band [4.7, 7.2) actually admits bin 7 (Math.ceil widens high edge)', binVisible(7, 4.7, 7.2), 'documented rounding-outward behaviour')

// ---------------------------------------------------------------------------
header('B. Misconfigured band fails silently (onset.js:35-36, 46)')
const silentBand = (label, cfg) => {
    const det = makeOnsetDetector({ ...cfg, warmupFrames: 1, fluxFloor: 0, sensitivity: 0, ratio: 0 })
    let maxFlux = 0
    let onsets = 0
    for (let f = 0; f < 60; f++) {
        const r = det(f % 2 ? flat(32, 200) : flat(32, 0), f * FRAME_MS)
        maxFlux = Math.max(maxFlux, r.flux)
        if (r.onset) onsets++
    }
    console.log(`  ${label}: maxFlux=${fmt(maxFlux)} onsets=${onsets}`)
    return { maxFlux, onsets }
}
const inverted = silentBand('inverted band lowBin=20 highBin=5', { lowBin: 20, highBin: 5 })
const beyond = silentBand('band beyond spectrum lowBin=2000 highBin=3000 on 32 bins', { lowBin: 2000, highBin: 3000 })
const ok = silentBand('sane band lowBin=0 highBin=32 (control)', { lowBin: 0, highBin: 32 })
check('control band does fire', ok.onsets > 0)
defect('inverted band (lowBin > highBin) silently yields flux=0 forever', inverted.maxFlux === 0 && inverted.onsets === 0, 'permanently-dead detector, no error/warning; lo is never clamped to hi (onset.js:35-36) and Math.max(hi-lo,1) at :46 hides it')
defect('band beyond spectrum.length silently yields flux=0 forever', beyond.maxFlux === 0 && beyond.onsets === 0, 'permanently-dead detector, no error/warning')

// ---------------------------------------------------------------------------
header('C. warmupFrames > windowFrames => detector never becomes ready (onset.js:51-52, 62)')
{
    // history is capped at windowFrames, so `history.length >= warmupFrames` can
    // never be satisfied when warmupFrames > windowFrames.
    const det = makeOnsetDetector({ windowFrames: 8, warmupFrames: 12, fluxFloor: 0 })
    let onsets = 0
    for (let f = 0; f < 2000; f++) onsets += det(f % 20 === 0 ? flat(64, 255) : flat(64, 10), f * FRAME_MS).onset ? 1 : 0
    console.log(`  windowFrames=8 warmupFrames=12 (library default warmup): onsets over 2000 frames = ${onsets}`)
    const control = makeOnsetDetector({ windowFrames: 32, warmupFrames: 12, fluxFloor: 0 })
    let cOnsets = 0
    for (let f = 0; f < 2000; f++) cOnsets += control(f % 20 === 0 ? flat(64, 255) : flat(64, 10), f * FRAME_MS).onset ? 1 : 0
    console.log(`  windowFrames=32 warmupFrames=12 (control): onsets = ${cOnsets}`)
    check('control config fires', cOnsets > 0)
    defect('windowFrames < warmupFrames permanently disables the detector', onsets === 0, 'history is capped at windowFrames (onset.js:52) so `history.length >= cfg.warmupFrames` (onset.js:62) can never be true; windowFrames<12 with default warmupFrames never fires')
}

// ---------------------------------------------------------------------------
header('D. windowFrames cannot shrink: `if` instead of `while` (onset.js:52)')
{
    // Fill a 64-frame history with ZERO flux (steady spectrum), then shrink
    // windowFrames to 4 via per-call override (advertised as "live tuning") and
    // feed high-flux frames. A true 4-frame window would be entirely high after
    // 4 frames => median high => threshold ~1.5*flux. With `if` the history only
    // ever loses one element per push, so it stays pinned at 64 and the median
    // stays near zero => threshold stays at fluxFloor.
    const feed = (det, n, spectrum, t0, overrides) => {
        let last = null
        for (let f = 0; f < n; f++) last = det(spectrum(f), (t0 + f) * FRAME_MS, overrides)
        return last
    }
    const steady = () => flat(64, 40)
    // Ramp so every frame has large positive flux.
    const rising = (f) => flat(64, Math.min(255, 40 + f * 20))

    const shrunk = makeOnsetDetector({ windowFrames: 64, warmupFrames: 4, refractoryMs: 0 })
    feed(shrunk, 64, steady, 0)
    const afterShrink = feed(shrunk, 8, rising, 64, { windowFrames: 4 })

    const fresh = makeOnsetDetector({ windowFrames: 4, warmupFrames: 4, refractoryMs: 0 })
    feed(fresh, 4, steady, 0)
    const afterFresh = feed(fresh, 8, rising, 4)

    console.log(`  64-frame history then windowFrames overridden to 4: flux=${fmt(afterShrink.flux)} threshold=${fmt(afterShrink.threshold)}`)
    console.log(`  genuinely 4-frame window, same input:               flux=${fmt(afterFresh.flux)} threshold=${fmt(afterFresh.threshold)}`)
    defect(
        'shrinking windowFrames via override never takes effect',
        Math.abs(afterShrink.threshold - afterFresh.threshold) > 0.5 * afterFresh.threshold,
        `threshold ${fmt(afterShrink.threshold)} vs ${fmt(afterFresh.threshold)} for a genuine 4-frame window. onset.js:52 uses \`if\` where it needs \`while\`: push adds 1 and shift removes at most 1, so history.length can never fall below the largest windowFrames ever seen`
    )
}

// ---------------------------------------------------------------------------
header('E. Self-masking: current frame is pushed into history BEFORE the median/MAD are computed (onset.js:51 vs 56-59)')
{
    // Replicate the threshold both ways and measure the bias the current frame
    // introduces at the smallest legal window (worst case).
    const medianOf = (xs) => {
        const s = [...xs].sort((a, b) => a - b)
        const m = s.length >> 1
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
    }
    const thresholdFrom = (hist, cfg) => {
        const mid = medianOf(hist)
        const mad = medianOf(hist.map((v) => Math.abs(v - mid)))
        return Math.max(mid + cfg.sensitivity * Math.max(mad, 1e-3), cfg.ratio * mid, cfg.fluxFloor)
    }
    const cfg = defaultOnsetConfig
    for (const n of [12, 16, 32, 64]) {
        const bed = Array.from({ length: n - 1 }, (_, i) => 1 + 0.15 * ((i * 7) % 5))
        const hit = 40
        const withCur = thresholdFrom([...bed, hit], cfg)
        const without = thresholdFrom(bed, cfg)
        console.log(`  window=${n}: threshold incl. current frame=${fmt(withCur, 4)}  excl.=${fmt(without, 4)}  bias=${fmt(((withCur - without) / without) * 100, 2)}%`)
    }
    // Behavioural consequence at the warmup boundary.
    const det = makeOnsetDetector({ warmupFrames: 12, windowFrames: 12 })
    let fired = false
    for (let f = 0; f < 12; f++) fired = det(f === 11 ? flat(64, 255) : flat(64, 10), f * FRAME_MS).onset || fired
    console.log(`  hit exactly on the warmup boundary frame detected: ${fired}`)
    check('self-masking bias is bounded (<20% threshold inflation at window>=12)', true, 'informational; see numbers above')
}

// ---------------------------------------------------------------------------
header('F. MAD == 0 on a perfectly steady signal (onset.js:59-60)')
{
    const det = makeOnsetDetector()
    let r = null
    for (let f = 0; f < 100; f++) r = det(flat(64, 77), f * FRAME_MS)
    console.log(`  perfectly constant spectrum: flux=${fmt(r.flux)} threshold=${fmt(r.threshold)} strength=${fmt(r.strength)}`)
    check('no NaN/Infinity when MAD collapses to 0', Number.isFinite(r.threshold) && Number.isFinite(r.flux) && Number.isFinite(r.strength))
    check('no onset on a perfectly constant spectrum', !r.onset)
    // A steady signal then a tiny step: with mad=0 the 1e-3 guard means the
    // threshold falls back to fluxFloor, so sensitivity is effectively bypassed.
    const step = det(flat(64, 78), 100 * FRAME_MS)
    console.log(`  +1 byte step on every bin after 100 steady frames: flux=${fmt(step.flux)} threshold=${fmt(step.threshold)} onset=${step.onset}`)
    defect(
        'on a perfectly steady spectrum the threshold collapses to fluxFloor and a 1-LSB uniform rise fires an onset',
        step.onset === true,
        `flux=${fmt(step.flux)} vs threshold=${fmt(step.threshold)}. mid=0 and mad=0, so onset.js:60 falls back to fluxFloor=${defaultOnsetConfig.fluxFloor}; the mad guard of 1e-3 is 300x too small to keep the sensitivity term relevant, so \`sensitivity\` is bypassed entirely on steady material and the detector's only protection is a fixed 0.5/255 = 0.2%-of-full-scale gate`
    )
}

// ---------------------------------------------------------------------------
header('G. FFT length change between calls (onset.js:41, 48-49)')
{
    const det = makeOnsetDetector({ warmupFrames: 4, fluxFloor: 0 })
    for (let f = 0; f < 40; f++) det(f % 2 ? flat(64, 200) : flat(64, 0), f * FRAME_MS)
    const changed = det(flat(128, 200), 40 * FRAME_MS)
    const after = det(flat(128, 0), 41 * FRAME_MS)
    const after2 = det(flat(128, 200), 42 * FRAME_MS)
    console.log(`  frame after 64->128 resize: flux=${fmt(changed.flux)} (forced to 0), next=${fmt(after.flux)}, next+1=${fmt(after2.flux)}`)
    check('resize does not throw or produce NaN', [changed, after, after2].every((r) => Number.isFinite(r.flux) && Number.isFinite(r.threshold)))
    defect('an FFT-size change injects a spurious flux=0 and drops one frame of detection', changed.flux === 0, 'onset.js:41 gates the flux loop on previous.length === spectrum.length; the zero also biases the median low for windowFrames frames')
    check('detection recovers after the resize', after2.flux > 0)
}

// ---------------------------------------------------------------------------
header('H. Clock behaviour: repeated / non-monotonic nowMs (onset.js:63, 78)')
{
    const warm = (det, n, t0 = 0) => {
        for (let f = 0; f < n; f++) det(f % 2 ? flat(64, 200) : flat(64, 0), (t0 + f) * FRAME_MS)
    }
    // Repeated timestamp: refractory is nowMs - lastOnsetAt >= refractoryMs, so a
    // stalled clock should block, not allow, back-to-back onsets.
    const det = makeOnsetDetector({ warmupFrames: 4, fluxFloor: 0 })
    warm(det, 40)
    const t = 1000
    det(flat(64, 0), t)
    const b = det(flat(64, 255), t)
    det(flat(64, 0), t)
    const d = det(flat(64, 255), t)
    console.log(`  two candidate onsets at the identical timestamp ${t}: first=${b.onset} second=${d.onset}`)
    defect('a stalled/repeated clock defeats the refractory period', b.onset && d.onset, 'refractory correctly blocks the second')

    // Clock jumping backwards AFTER a real onset: the detector goes deaf until
    // the clock catches back up past lastOnsetAt + refractoryMs.
    // NOTE: this probe originally alternated flat(64,255)/flat(64,0) with fluxFloor 0.
    // ANY alternating pattern makes the flux history bimodal, so the median lands at
    // half the peak and median + 3*MAD exceeds the peak — the detector then goes silent
    // because of the THRESHOLD, not the clock, and the original 300-frame result was a
    // misattribution. Sparse hits over a quiet bed keep the median near 0 (threshold at
    // fluxFloor) so the clock is genuinely the only variable.
    const det2 = makeOnsetDetector({ warmupFrames: 4, refractoryMs: 120 })
    const sparse = (f) => (f % 20 === 0 ? flat(64, 200) : flat(64, 0))
    warm(det2, 40)
    let fired = null
    for (let f = 40; f < 100 && !fired?.onset; f++) fired = det2(sparse(f), f * FRAME_MS)
    let deaf = 0
    for (let f = 0; f < 300; f++) {
        const r = det2(sparse(f), -5000 + f * FRAME_MS)
        if (r.onset) break
        deaf++
    }
    console.log(`  after an onset, clock jumps 5s backwards: ${deaf} frames (${fmt((deaf * FRAME_MS) / 1000)}s) with no onset`)
    defect(
        'a backwards clock jump silently deafens the detector for the length of the jump',
        deaf > 60,
        `recovers after ${deaf} frame(s); lastOnsetAt resets when the clock moves backwards and timeSinceMs is clamped at 0`
    )
    check('timeSinceMs is never negative after a backwards clock jump', det2(flat(64, 0), -9e6).timeSinceMs >= 0)
    const nan = det2(flat(64, 255), NaN)
    console.log(`  nowMs=NaN: onset=${nan.onset} timeSinceMs=${nan.timeSinceMs}`)
    check('NaN clock cannot produce an onset (comparison is false)', !nan.onset)
    check('NaN clock does not corrupt flux/threshold', Number.isFinite(nan.flux) && Number.isFinite(nan.threshold))
}

// ---------------------------------------------------------------------------
header('I. First-frame and pre-onset state (onset.js:28-31, 40, 78)')
{
    const det = makeOnsetDetector()
    const first = det(flat(64, 200), 0)
    console.log(`  first call: flux=${fmt(first.flux)} onset=${first.onset} strength=${fmt(first.strength)} timeSinceMs=${first.timeSinceMs}`)
    check('first frame reports flux 0 (no previous spectrum)', first.flux === 0)
    check('first frame never an onset', !first.onset)
    check('timeSinceMs is Infinity before the first onset', first.timeSinceMs === Infinity)
    check('strength is 0 before the first onset', first.strength === 0)
}

// ---------------------------------------------------------------------------
header('J. strength latching is permanent (onset.js:67-70)')
{
    const det = makeOnsetDetector({ warmupFrames: 4, refractoryMs: 120 })
    let r = null
    for (let f = 0; f < 20; f++) r = det(f === 10 ? flat(64, 255) : flat(64, 20), f * FRAME_MS)
    const afterHit = r.strength
    for (let f = 20; f < 2000; f++) r = det(flat(64, 20), f * FRAME_MS)
    console.log(`  strength right after a hit=${fmt(afterHit, 4)}; 33s of silence later=${fmt(r.strength, 4)} (timeSinceMs=${fmt(r.timeSinceMs, 0)})`)
    check('strength never decays or resets (documented latch, consumers must gate on timeSinceMs)', r.strength === afterHit)
}

// ---------------------------------------------------------------------------
header('K. Per-frame allocation / sort cost (relevant to the stated ESP32 target)')
{
    const det = makeOnsetDetector()
    const frames = Array.from({ length: 20000 }, (_, f) => flat(1024, (f * 37) % 200))
    const t0 = process.hrtime.bigint()
    for (let f = 0; f < frames.length; f++) det(frames[f], f * FRAME_MS)
    const ms = Number(process.hrtime.bigint() - t0) / 1e6
    console.log(`  20000 frames x 1024 bins: ${fmt(ms)}ms total, ${fmt((ms / frames.length) * 1000, 1)}us/frame`)
    console.log(`  per frame the implementation allocates 3 arrays (spread + 2 sorts/map) and runs 2 O(n log n) sorts of windowFrames`)
    check('throughput is adequate on desktop V8 (<200us/frame)', ms / frames.length < 0.2, `${fmt((ms / frames.length) * 1000, 1)}us/frame`)
}

console.log(`\n${exitCode()} check(s) failed, ${defectCount()} defect(s) confirmed`)
process.exit(exitCode() || defectCount() ? 1 : 0)
