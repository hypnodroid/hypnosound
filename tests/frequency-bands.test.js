import { describe, it, expect } from 'vitest'
import bass from '../src/audio/bass.js'
import mids from '../src/audio/mids.js'
import treble from '../src/audio/treble.js'
import { silence, uniform, bassHeavy, trebleHeavy, singleBin } from './helpers.js'

describe('bass', () => {
    it('returns 0 for silence', () => {
        expect(bass(silence())).toBe(0)
    })

    it('returns a value in [0, 1] for uniform signal', () => {
        const val = bass(uniform())
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
    })

    it('is high for bass-heavy spectrum', () => {
        const val = bass(bassHeavy())
        expect(val).toBeGreaterThan(0.5)
    })

    it('is low for treble-heavy spectrum', () => {
        const val = bass(trebleHeavy())
        expect(val).toBeLessThan(0.1)
    })

    it('DC component (bin 0) counts as bass', () => {
        const fft = singleBin(1024, 0, 255)
        expect(bass(fft)).toBe(1) // all energy in bin 0 = bass
    })

    it('bass + mids + treble sums to less than 1 (not all frequencies covered at this FFT size)', () => {
        const fft = uniform(1024, 128)
        const total = bass(fft) + mids(fft) + treble(fft)
        // At 1024 bins / 44.1kHz, max freq is ~44.1kHz but Nyquist is ~22kHz
        // The three bands (0-400, 400-4000, 4000-20000) don't cover the full bin range
        expect(total).toBeGreaterThan(0)
        expect(total).toBeLessThanOrEqual(1.01)
    })

    it('bass dominates when energy is only in low-frequency bins', () => {
        const b = bass(bassHeavy())
        const m = mids(bassHeavy())
        const t = treble(bassHeavy())
        expect(b).toBeGreaterThan(m)
        expect(b).toBeGreaterThan(t)
    })
})

describe('mids', () => {
    it('returns 0 for silence', () => {
        expect(mids(silence())).toBe(0)
    })

    it('returns a value in [0, 1] for uniform signal', () => {
        const val = mids(uniform())
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
    })

    it('is dominant when energy is concentrated in mid-frequency bins', () => {
        const fft = new Uint8Array(1024).fill(0)
        const midStart = Math.floor(1024 * (400 / 44100))
        const midEnd = Math.floor(1024 * (4000 / 44100))
        for (let i = midStart; i <= midEnd; i++) {
            fft[i] = 200
        }
        expect(mids(fft)).toBeGreaterThan(0.9)
    })

    it('is low for bass-heavy spectrum', () => {
        expect(mids(bassHeavy())).toBeLessThan(0.3)
    })
})

describe('treble', () => {
    it('returns 0 for silence', () => {
        expect(treble(silence())).toBe(0)
    })

    it('returns a value in [0, 1] for uniform signal', () => {
        const val = treble(uniform())
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
    })

    it('treble-heavy spectrum has more treble than bass-heavy spectrum', () => {
        expect(treble(trebleHeavy())).toBeGreaterThan(treble(bassHeavy()))
    })

    it('is low for bass-heavy spectrum', () => {
        expect(treble(bassHeavy())).toBeLessThan(0.1)
    })
})
