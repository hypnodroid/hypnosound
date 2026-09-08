import { describe, it, expect } from 'vitest'
import { makeOnsetDetector, defaultOnsetConfig } from '../src/utils/onset.js'

const BINS = 512
const FRAME_MS = 1000 / 60

// Deterministic pseudo-noise so runs are reproducible
const noiseAt = (frame, bin, amplitude) => amplitude * (0.5 + 0.5 * Math.sin(frame * 12.9898 + bin * 78.233))

const makeSpectrum = (frame, { noise = 0, hit = 0, hitLowBin = 0, hitHighBin = BINS, ramp = 0 } = {}) => {
    const spectrum = new Uint8Array(BINS)
    for (let i = 0; i < BINS; i++) {
        let v = noiseAt(frame, i, noise) + ramp
        if (hit > 0 && i >= hitLowBin && i < hitHighBin) v += hit
        spectrum[i] = Math.max(0, Math.min(255, Math.round(v)))
    }
    return spectrum
}

const run = (detector, frames, shape, overrides = {}) => {
    const onsets = []
    let last = null
    for (let frame = 0; frame < frames; frame++) {
        last = detector(makeSpectrum(frame, shape(frame)), frame * FRAME_MS, overrides)
        if (last.onset) onsets.push({ frame, strength: last.strength })
    }
    return { onsets, last }
}

describe('makeOnsetDetector', () => {
    it('never fires on silence', () => {
        const { onsets } = run(makeOnsetDetector(), 600, () => ({}))
        expect(onsets).toHaveLength(0)
    })

    it('never fires on a steady noise floor', () => {
        const { onsets } = run(makeOnsetDetector(), 600, () => ({ noise: 40 }))
        expect(onsets).toHaveLength(0)
    })

    it('detects every burst exactly once, on its first frame', () => {
        const HIT_EVERY = 30 // 500ms apart at 60fps
        const isHit = (frame) => frame >= 60 && frame % HIT_EVERY < 2
        const { onsets } = run(makeOnsetDetector(), 600, (frame) => ({ noise: 20, hit: isHit(frame) ? 120 : 0 }))
        expect(onsets).toHaveLength(Math.floor((600 - 60) / HIT_EVERY))
        for (const onset of onsets) expect(onset.frame % HIT_EVERY).toBe(0)
    })

    it('refractory period collapses a fast double hit to one onset', () => {
        const doubleHit = (frame) => ({ noise: 20, hit: frame === 100 || frame === 104 ? 120 : 0 }) // ~67ms apart
        expect(run(makeOnsetDetector(), 200, doubleHit).onsets).toHaveLength(1)
        expect(run(makeOnsetDetector({ refractoryMs: 30 }), 200, doubleHit).onsets).toHaveLength(2)
    })

    it('does not fire repeatedly during a slow swell', () => {
        const { onsets } = run(makeOnsetDetector(), 600, (frame) => ({ noise: 10, ramp: frame * 0.3 }))
        expect(onsets.length).toBeLessThanOrEqual(1)
    })

    it('reports higher strength for harder hits, latched between onsets', () => {
        const hits = { 100: 40, 200: 200 }
        const { onsets, last } = run(makeOnsetDetector(), 260, (frame) => ({ noise: 20, hit: hits[frame] ?? 0 }))
        expect(onsets).toHaveLength(2)
        expect(onsets[1].strength).toBeGreaterThan(onsets[0].strength)
        expect(last.strength).toBe(onsets[1].strength)
    })

    it('band limiting makes a treble-only hit invisible to a bass-band detector', () => {
        const trebleHit = (frame) => ({ noise: 20, hit: frame === 100 ? 150 : 0, hitLowBin: 400, hitHighBin: BINS })
        expect(run(makeOnsetDetector({ lowBin: 0, highBin: 40 }), 200, trebleHit).onsets).toHaveLength(0)
        expect(run(makeOnsetDetector(), 200, trebleHit).onsets).toHaveLength(1)
    })

    it('timeSinceMs is Infinity before the first onset, then counts up', () => {
        const detector = makeOnsetDetector()
        expect(detector(makeSpectrum(0, {}), 0).timeSinceMs).toBe(Infinity)
        const { last } = run(detector, 200, (frame) => ({ noise: 20, hit: frame === 100 ? 120 : 0 }))
        expect(last.timeSinceMs).toBeCloseTo((199 - 100) * FRAME_MS, 0)
    })

    it('per-call overrides adjust tunables live', () => {
        const detector = makeOnsetDetector()
        const { onsets } = run(detector, 200, (frame) => ({ noise: 20, hit: frame === 100 ? 120 : 0 }), { fluxFloor: 250 })
        expect(onsets).toHaveLength(0)
    })

    it('exports sensible defaults', () => {
        expect(defaultOnsetConfig.refractoryMs).toBeGreaterThan(0)
        expect(defaultOnsetConfig.sensitivity).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// Regression tests for defects found by synthetic-ground-truth validation.
// See scripts/test/onset-*.mjs for the harness that originally caught these.
// ---------------------------------------------------------------------------

const flat = (bins, v) => Uint8Array.from({ length: bins }, () => v)
const sparseHit = (frame) => (frame % 20 === 0 ? flat(64, 200) : flat(64, 0))

describe('config validation regressions', () => {
    it('still detects when windowFrames is below the default warmupFrames', () => {
        // Regression: history was capped at windowFrames while the ready gate
        // required warmupFrames, so windowFrames < 12 could never fire — zero
        // onsets forever, with no error. warmupFrames is now clamped.
        for (const windowFrames of [1, 2, 3, 4, 8, 11]) {
            const detect = makeOnsetDetector({ windowFrames })
            let onsets = 0
            for (let frame = 0; frame < 400; frame++) {
                if (detect(sparseHit(frame), frame * FRAME_MS).onset) onsets++
            }
            expect(onsets, `windowFrames: ${windowFrames}`).toBeGreaterThan(0)
        }
    })

    it('shrinks the flux history when windowFrames is lowered mid-stream', () => {
        // Regression: `if (history.length > windowFrames) shift()` could only
        // ever remove one entry per push, so the window never shrank and live
        // re-tuning downward silently no-opped. Now a `while` loop.
        const detect = makeOnsetDetector({ windowFrames: 64, fluxFloor: 0, sensitivity: 3, ratio: 1.5 })
        let t = 0
        for (let frame = 0; frame < 65; frame++) {
            detect(frame % 2 ? flat(64, 250) : flat(64, 0), t)
            t += FRAME_MS
        }
        // With a 1-frame window the median IS the current flux and MAD is 0,
        // so the threshold must collapse to exactly ratio * flux.
        // Stuck at 64 frames the threshold is 500; a genuine 3-frame window
        // gives 375. windowFrames is floored at 3, so 3 is the tightest window.
        const stuck = detect(flat(64, 250), t).threshold
        expect(stuck).toBeCloseTo(500, 3)

        const shrunk = makeOnsetDetector({ windowFrames: 64, fluxFloor: 0 })
        let t2 = 0
        for (let frame = 0; frame < 65; frame++) {
            shrunk(frame % 2 ? flat(64, 250) : flat(64, 0), t2)
            t2 += FRAME_MS
        }
        expect(shrunk(flat(64, 250), t2, { windowFrames: 3 }).threshold).toBeCloseTo(375, 3)
    })

    it('corrects an inverted or out-of-range band instead of dead-ending at zero flux', () => {
        // Regression: lo was never clamped against hi, so lowBin > highBin (or a
        // band past the end of the spectrum) pinned flux at 0 permanently with
        // no signal to the caller. The resolved band is now returned.
        for (const band of [
            { lowBin: 20, highBin: 5 },
            { lowBin: 5000, highBin: 5100 },
            { lowBin: 0, highBin: 0 },
        ]) {
            const detect = makeOnsetDetector(band)
            let maxFlux = 0
            let resolved = null
            for (let frame = 0; frame < 200; frame++) {
                resolved = detect(frame % 20 === 0 ? flat(1024, 220) : flat(1024, 0), frame * FRAME_MS)
                maxFlux = Math.max(maxFlux, resolved.flux)
            }
            expect(maxFlux, JSON.stringify(band)).toBeGreaterThan(0)
            expect(resolved.highBin).toBeGreaterThan(resolved.lowBin)
            expect(resolved.highBin).toBeLessThanOrEqual(1024)
        }
    })

    it('recovers immediately when the caller clock jumps backwards', () => {
        // Regression: a backwards jump left nowMs - lastOnsetAt negative, so the
        // refractory never cleared and the detector went deaf for the whole jump
        // (300 frames measured for 5s). timeSinceMs could also go negative.
        const detect = makeOnsetDetector({ warmupFrames: 4, refractoryMs: 120 })
        for (let frame = 0; frame < 100; frame++) detect(sparseHit(frame), frame * FRAME_MS)
        let refiredWithin = null
        for (let frame = 0; frame < 300; frame++) {
            const r = detect(sparseHit(frame), -5000 + frame * FRAME_MS)
            expect(r.timeSinceMs).toBeGreaterThanOrEqual(0)
            if (r.onset) {
                refiredWithin = frame
                break
            }
        }
        // Must refire by the next available hit, not after the clock catches up.
        expect(refiredWithin).not.toBeNull()
        expect(refiredWithin).toBeLessThanOrEqual(20)
    })

    it('re-warms rather than mixing scales when the spectrum length changes', () => {
        const detect = makeOnsetDetector({ warmupFrames: 12 })
        for (let frame = 0; frame < 60; frame++) detect(sparseHit(frame), frame * FRAME_MS)
        // A resolution change invalidates the reference spectrum and the history.
        const resized = detect(flat(256, 0), 60 * FRAME_MS)
        expect(resized.flux).toBe(0)
        expect(resized.onset).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// CHARACTERIZATION TESTS — these pin KNOWN-IMPERFECT behavior.
//
// They assert what the detector currently does, NOT what it should do. Each
// documents a measured design limitation. If you improve the algorithm these
// SHOULD fail — update them deliberately rather than working around them.
// ---------------------------------------------------------------------------

describe('known limitations (characterization, not desired behavior)', () => {
    it('KNOWN LIMITATION: fires once per cycle on sustained modulation with no transients', () => {
        // A 4Hz broadband tremolo contains no transients at all, yet yields one
        // onset per modulation cycle, because there is no local-maximum
        // peak-picking stage — the first frame crossing the threshold fires.
        // sensitivity does not help (3 and 6 both give the same count).
        const detect = makeOnsetDetector()
        let onsets = 0
        const frames = 600 // 10s at 60fps
        for (let frame = 0; frame < frames; frame++) {
            const level = 128 + 120 * Math.sin((2 * Math.PI * 4 * frame) / 60)
            if (detect(flat(512, Math.round(level)), frame * FRAME_MS).onset) onsets++
        }
        // A transient-free signal ideally yields ~0. It does not.
        expect(onsets).toBeGreaterThan(20)
    })

    it('KNOWN LIMITATION: a narrow band false-fires on stationary noise', () => {
        // Band-averaging over few bins leaves the median+MAD threshold unable to
        // reject frame-uncorrelated noise. Scale-invariant, so not a tuning
        // problem. Feeding smoothed frames (AnalyserNode default
        // smoothingTimeConstant 0.8) restores full accuracy at every width.
        // Must be frame-UNCORRELATED: the smooth sine in noiseAt() is too
        // correlated between frames to reproduce this, which is the same reason
        // AnalyserNode smoothing makes the problem disappear.
        const hash = (a, b) => {
            let x = (a * 374761393 + b * 668265263) >>> 0
            x = ((x ^ (x >>> 13)) * 1274126177) >>> 0
            return (x ^ (x >>> 16)) >>> 0
        }
        const detect = makeOnsetDetector({ lowBin: 2, highBin: 10 })
        let onsets = 0
        for (let frame = 0; frame < 1200; frame++) {
            const spectrum = Uint8Array.from({ length: 512 }, (_, i) => hash(frame, i) % 40)
            if (detect(spectrum, frame * FRAME_MS).onset) onsets++
        }
        // An 8-bin band on a steady bed ideally yields 0. It does not.
        expect(onsets).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// Hysteresis (Schmitt trigger). The refractory period is a purely TEMPORAL
// gate — material that parks the flux above the threshold re-fires every
// refractoryMs forever, a metronome locked to the timer rather than the music.
// Requiring a fall back below releaseRatio * threshold makes one crossing yield
// one onset however long it stays up.
// ---------------------------------------------------------------------------

describe('hysteresis', () => {
    it('an accelerating riser fires a couple of times, not once per refractory period', () => {
        // A riser/uplifter climbs for seconds with no discrete hit in it. Its
        // flux keeps RISING, so it outruns the trailing median and stays over
        // the threshold — the refractory period alone then machine-guns an
        // onset every 120ms for as long as the build lasts.
        const riser = (frame) => (frame < 60 ? 5 : Math.min(255, 5 + (frame - 60) ** 2 / 12))
        const count = (releaseRatio) => {
            const detect = makeOnsetDetector({ warmupFrames: 6, releaseRatio })
            let onsets = 0
            for (let frame = 0; frame < 240; frame++) {
                onsets += detect(flat(256, Math.round(riser(frame))), frame * FRAME_MS).onset ? 1 : 0
            }
            return onsets
        }
        // Measured: 5 onsets ungated, 2 with the release gate.
        expect(count(0)).toBeGreaterThanOrEqual(5)
        expect(count(defaultOnsetConfig.releaseRatio)).toBeLessThanOrEqual(2)
    })

    it('releaseRatio 0 disables hysteresis rather than latching the detector off', () => {
        // Regression: the re-arm test was `flux < releaseRatio * threshold`,
        // which at releaseRatio 0 is `flux < 0` — never true. Disabling
        // hysteresis silently made it permanent, deafening the detector after
        // its first onset.
        const detect = makeOnsetDetector({ releaseRatio: 0 })
        let onsets = 0
        for (let frame = 0; frame < 600; frame++) {
            const isHit = frame >= 60 && frame % 30 === 0
            const r = detect(makeSpectrum(frame, { noise: 20, hit: isHit ? 140 : 0 }), frame * FRAME_MS)
            expect(r.armed).toBe(true)
            if (r.onset) onsets++
        }
        expect(onsets).toBe(18)
    })

    it('re-arms once the flux falls back, so separated hits all still fire', () => {
        const detect = makeOnsetDetector()
        const hits = []
        for (let frame = 0; frame < 600; frame++) {
            const isHit = frame >= 60 && frame % 30 === 0
            const r = detect(makeSpectrum(frame, { noise: 20, hit: isHit ? 140 : 0 }), frame * FRAME_MS)
            if (r.onset) hits.push(frame)
        }
        expect(hits).toHaveLength(18)
        expect(hits.every((f) => f % 30 === 0)).toBe(true)
    })

    it('reports its armed state', () => {
        const detect = makeOnsetDetector()
        let sawDisarmed = false
        for (let frame = 0; frame < 200; frame++) {
            const r = detect(makeSpectrum(frame, { noise: 20, hit: frame === 100 ? 200 : 0 }), frame * FRAME_MS)
            if (r.onset) expect(r.armed).toBe(false)
            if (!r.armed) sawDisarmed = true
        }
        expect(sawDisarmed).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// The three signals that matter most for a visualizer, stated plainly.
// ---------------------------------------------------------------------------

describe('the signals that decide whether visuals look right', () => {
    it('a click track fires exactly once per click, on the click', () => {
        const detect = makeOnsetDetector()
        const fired = []
        for (let frame = 0; frame < 600; frame++) {
            const isClick = frame >= 60 && frame % 24 === 0 // 150 BPM
            if (detect(makeSpectrum(frame, { noise: 15, hit: isClick ? 160 : 0 }), frame * FRAME_MS).onset) fired.push(frame)
        }
        const expected = []
        for (let f = 72; f < 600; f += 24) expected.push(f) // first multiple of 24 at or after frame 60
        expect(fired).toEqual(expected)
    })

    it('a slow swell fires at most once, never repeatedly', () => {
        // A 10s crescendo has no transients. A mean-based threshold would be
        // dragged up and a naive one would fire the whole way up.
        const detect = makeOnsetDetector()
        let onsets = 0
        for (let frame = 0; frame < 600; frame++) {
            onsets += detect(makeSpectrum(frame, { noise: 10, ramp: frame * 0.35 }), frame * FRAME_MS).onset ? 1 : 0
        }
        expect(onsets).toBeLessThanOrEqual(1)
    })

    it('a noisy signal with no events does not fire every frame', () => {
        // Frame-uncorrelated broadband noise, full band, 20s.
        const hash = (a, b) => {
            let x = (a * 374761393 + b * 668265263) >>> 0
            x = ((x ^ (x >>> 13)) * 1274126177) >>> 0
            return (x ^ (x >>> 16)) >>> 0
        }
        const detect = makeOnsetDetector()
        let onsets = 0
        for (let frame = 0; frame < 1200; frame++) {
            const spectrum = Uint8Array.from({ length: 512 }, (_, i) => hash(frame, i) % 50)
            onsets += detect(spectrum, frame * FRAME_MS).onset ? 1 : 0
        }
        expect(onsets).toBe(0)
    })
})
