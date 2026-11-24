import { describe, it, expect } from 'vitest'
import { makeOnsetEnvelope, defaultEnvelopeConfig, envelopeFrom } from '../src/utils/onsetEnvelope.js'
import { makeOnsetDetector } from '../src/utils/onset.js'

const FRAME_MS = 1000 / 60

// Drive an envelope for `frames` frames at `frameMs`, firing when `trigger(frame)`
// returns a truthy level. Returns every sampled value.
const drive = (env, frames, trigger, frameMs = FRAME_MS, startMs = 0) => {
    const values = []
    for (let frame = 0; frame < frames; frame++) {
        const level = trigger(frame)
        values.push(env(!!level, level || 0, startMs + frame * frameMs))
    }
    return values
}

describe('makeOnsetEnvelope', () => {
    it('rests at the floor until the first trigger', () => {
        const env = makeOnsetEnvelope()
        expect(drive(env, 60, () => 0).every((v) => v === 0)).toBe(true)
    })

    it('rises to the peak within attackMs and decays afterwards', () => {
        const env = makeOnsetEnvelope({ attackMs: 50, decayMs: 100 })
        const values = drive(env, 60, (frame) => (frame === 10 ? 1 : 0))

        // Peak lands at the end of the attack: frame 10 + 50ms ≈ 3 frames
        const peakIndex = values.indexOf(Math.max(...values))
        expect(peakIndex).toBeGreaterThanOrEqual(12)
        expect(peakIndex).toBeLessThanOrEqual(14)
        expect(Math.max(...values)).toBeCloseTo(1, 2)

        // Monotonic up through the attack, monotonic down through the decay
        for (let i = 11; i <= peakIndex; i++) expect(values[i]).toBeGreaterThan(values[i - 1])
        for (let i = peakIndex + 2; i < values.length; i++) expect(values[i]).toBeLessThan(values[i - 1])
    })

    it('never exceeds 1 or drops below the floor', () => {
        const env = makeOnsetEnvelope({ floor: 0.2 })
        const values = drive(env, 300, (frame) => (frame % 17 === 0 ? 5 : 0)) // level deliberately out of range
        expect(Math.max(...values)).toBeLessThanOrEqual(1)
        expect(Math.min(...values)).toBeGreaterThanOrEqual(0.2)
    })

    it('scales the peak with hit strength', () => {
        const soft = Math.max(...drive(makeOnsetEnvelope(), 30, (f) => (f === 0 ? 0.25 : 0)))
        const hard = Math.max(...drive(makeOnsetEnvelope(), 30, (f) => (f === 0 ? 1.0 : 0)))
        expect(hard).toBeGreaterThan(soft * 3)
    })

    it('is frame-rate independent: the curve matches at 30, 60 and 144 fps', () => {
        // Sample the same wall-clock instants from envelopes ticked at different rates.
        const sampleAt = (frameMs) => {
            const env = makeOnsetEnvelope({ attackMs: 10, decayMs: 150 })
            const byTime = new Map()
            for (let frame = 0; frame < Math.ceil(1000 / frameMs); frame++) {
                const t = frame * frameMs
                byTime.set(Math.round(t), env(frame === 0, 1, t))
            }
            return byTime
        }
        const slow = sampleAt(1000 / 30)
        const fast = sampleAt(1000 / 144)

        // At each 30fps sample instant, the 144fps envelope must agree closely.
        for (const [t, v] of slow) {
            if (t === 0) continue
            // find the nearest 144fps sample
            let best = null
            for (const [t2, v2] of fast) {
                if (best === null || Math.abs(t2 - t) < Math.abs(best[0] - t)) best = [t2, v2]
            }
            expect(Math.abs(best[1] - v), `t=${t}`).toBeLessThan(0.05)
        }
    })

    it('a retrigger during the tail never steps the value downward', () => {
        // A soft hit landing on a loud tail must not yank the value DOWN — that
        // discontinuity is exactly the flicker this design exists to remove.
        // Compared against the same envelope with no retrigger at all: the soft
        // hit must not introduce any downward step that plain decay wouldn't.
        const cfg = { attackMs: 10, decayMs: 200 }
        const loudOnly = (frame) => (frame === 0 ? 1.0 : 0)
        const softOnTail = (frame) => (frame === 0 ? 1.0 : frame === 6 ? 0.15 : 0)

        const biggestDrop = (values) => Math.max(...values.slice(1).map((v, i) => values[i] - v))

        const baseline = biggestDrop(drive(makeOnsetEnvelope(cfg), 40, loudOnly))
        const retriggered = biggestDrop(drive(makeOnsetEnvelope(cfg), 40, softOnTail))

        // Allow a hair of float slop, but no genuine extra drop.
        expect(retriggered).toBeLessThanOrEqual(baseline + 1e-9)
    })

    it("retrigger: 'reset' does jump to the new level, unlike 'peak'", () => {
        const cfg = { attackMs: 0, decayMs: 200 }
        const hits = (frame) => (frame === 0 ? 1.0 : frame === 6 ? 0.15 : 0)
        const peak = drive(makeOnsetEnvelope({ ...cfg, retrigger: 'peak' }), 20, hits)
        const reset = drive(makeOnsetEnvelope({ ...cfg, retrigger: 'reset' }), 20, hits)
        expect(reset[6]).toBeCloseTo(0.15, 2)
        expect(peak[6]).toBeGreaterThan(reset[6])
    })

    it('linear curve reaches exactly zero; exp curve approaches it', () => {
        const linear = drive(makeOnsetEnvelope({ attackMs: 0, decayMs: 100, curve: 'linear' }), 30, (f) => (f === 0 ? 1 : 0))
        const exp = drive(makeOnsetEnvelope({ attackMs: 0, decayMs: 100, curve: 'exp' }), 30, (f) => (f === 0 ? 1 : 0))
        expect(linear.at(-1)).toBe(0)
        expect(exp.at(-1)).toBeGreaterThan(0)
        expect(exp.at(-1)).toBeLessThan(0.01)
    })

    it('recovers when the caller clock jumps backwards', () => {
        const env = makeOnsetEnvelope()
        env(true, 1, 10_000)
        // Clock jumps back; the envelope must not stay latched at its old value.
        const after = env(false, 0, 0)
        expect(after).toBe(0)
        expect(env(true, 1, 20)).toBeGreaterThanOrEqual(0)
    })

    it('exposes sensible defaults', () => {
        expect(defaultEnvelopeConfig.attackMs).toBeGreaterThan(0)
        expect(defaultEnvelopeConfig.decayMs).toBeGreaterThan(defaultEnvelopeConfig.attackMs)
    })
})

// ---------------------------------------------------------------------------
// The point of the whole design: an envelope driven by events is smooth even
// when the underlying audio feature is too noisy to animate from directly.
// ---------------------------------------------------------------------------

describe('envelope vs. smoothed level (the shudder argument)', () => {
    const BINS = 256
    const hash = (a, b) => {
        let x = (a * 374761393 + b * 668265263) >>> 0
        x = ((x ^ (x >>> 13)) * 1274126177) >>> 0
        return (x ^ (x >>> 16)) >>> 0
    }

    // A click track buried in heavy frame-uncorrelated noise.
    const clickTrack = (frame) => {
        const hit = frame >= 60 && frame % 30 === 0
        return Uint8Array.from({ length: BINS }, (_, i) => Math.min(255, (hash(frame, i) % 60) + (hit ? 180 : 0)))
    }

    // Shudder is DIRECTION CHANGE, not travel. An envelope legitimately travels
    // up and down once per beat, so total variation says nothing useful; what
    // makes a visual look like it is vibrating is the signal reversing course
    // frame after frame. Count sign changes of the first difference.
    const reversals = (values) => {
        let count = 0
        for (let i = 2; i < values.length; i++) {
            if ((values[i - 1] - values[i - 2]) * (values[i] - values[i - 1]) < 0) count++
        }
        return count
    }

    it('the envelope is far smoother than the raw flux it is derived from', () => {
        const detect = makeOnsetDetector()
        const env = makeOnsetEnvelope({ decayMs: 200 })
        const fluxes = []
        const envelopes = []
        let onsets = 0

        for (let frame = 0; frame < 600; frame++) {
            const now = frame * FRAME_MS
            const result = detect(clickTrack(frame), now)
            if (result.onset) onsets++
            fluxes.push(result.flux)
            envelopes.push(envelopeFrom(env, result, now))
        }

        // 18 beats: frames 60, 90, ... 570. Every one found, none invented.
        expect(onsets).toBe(18)

        // Measured: flux reverses on 424 of 598 frames (71% — it vibrates);
        // the envelope reverses 18 times, exactly one peak per beat.
        expect(reversals(fluxes)).toBeGreaterThan(300)
        expect(reversals(envelopes)).toBeLessThanOrEqual(onsets)
    })

    it('the envelope still peaks on the beat — smoothness did not cost timing', () => {
        const detect = makeOnsetDetector()
        const env = makeOnsetEnvelope({ attackMs: 12, decayMs: 150 })
        const envelopes = []
        for (let frame = 0; frame < 300; frame++) {
            const now = frame * FRAME_MS
            envelopes.push(envelopeFrom(env, detect(clickTrack(frame), now), now))
        }
        // Beats land on multiples of 30 from frame 60. Every local peak of the
        // envelope must sit within two frames of a beat.
        for (let frame = 2; frame < envelopes.length - 2; frame++) {
            const isLocalPeak = envelopes[frame] > envelopes[frame - 1] && envelopes[frame] >= envelopes[frame + 1] && envelopes[frame] > 0.3
            if (!isLocalPeak) continue
            const distance = Math.min(frame % 30, 30 - (frame % 30))
            expect(distance, `peak at frame ${frame}`).toBeLessThanOrEqual(2)
        }
    })
})
