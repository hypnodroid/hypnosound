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
