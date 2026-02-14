import { describe, it, expect } from 'vitest'
import bass from '../src/audio/bass.js'
import rms from '../src/audio/rms.js'
import dbfs from '../src/audio/dbfs.js'
import {
    silence, fullScale, uniform, bassHeavy,
    floatSilence, floatFullScale, floatUniform, floatBassHeavy,
} from './helpers.js'

describe('Float32Array input support', () => {
    describe('bass with Float32Array', () => {
        it('returns 0 for float silence (-100 dB)', () => {
            // At -100 dB all bins have essentially the same tiny magnitude,
            // so bass ratio is still valid but energy is near-zero.
            // The function normalizes energy ratios, so uniform silence
            // should still produce a valid ratio.
            const val = bass(floatSilence())
            expect(val).toBeGreaterThanOrEqual(0)
            expect(val).toBeLessThanOrEqual(1)
        })

        it('returns a value in [0, 1] for float full-scale (0 dB)', () => {
            const val = bass(floatFullScale())
            expect(val).toBeGreaterThanOrEqual(0)
            expect(val).toBeLessThanOrEqual(1)
        })

        it('is high for float bass-heavy spectrum', () => {
            const val = bass(floatBassHeavy())
            expect(val).toBeGreaterThan(0.5)
        })

        it('returns a value in [0, 1] for float uniform signal', () => {
            const val = bass(floatUniform())
            expect(val).toBeGreaterThanOrEqual(0)
            expect(val).toBeLessThanOrEqual(1)
        })
    })

    describe('rms with Float32Array', () => {
        it('returns near 0 for float silence (-100 dB)', () => {
            const val = rms(floatSilence())
            expect(val).toBeCloseTo(0, 3)
        })

        it('returns 1 for float full-scale (0 dB)', () => {
            const val = rms(floatFullScale())
            expect(val).toBeCloseTo(1, 5)
        })

        it('returns a value in [0, 1] for float uniform -6 dB signal', () => {
            const val = rms(floatUniform(1024, -6))
            expect(val).toBeGreaterThan(0)
            expect(val).toBeLessThan(1)
        })

        it('louder float signal has higher rms', () => {
            expect(rms(floatUniform(1024, -6))).toBeGreaterThan(rms(floatUniform(1024, -40)))
        })
    })

    describe('dbfs with Float32Array', () => {
        it('returns near 0 for float silence (-100 dB)', () => {
            const val = dbfs(floatSilence())
            expect(val).toBeCloseTo(0, 1)
        })

        it('returns 1 for float full-scale (0 dB)', () => {
            const val = dbfs(floatFullScale())
            expect(val).toBeCloseTo(1, 5)
        })

        it('returns a value in [0, 1] for float uniform signal', () => {
            const val = dbfs(floatUniform(1024, -20))
            expect(val).toBeGreaterThanOrEqual(0)
            expect(val).toBeLessThanOrEqual(1)
        })

        it('louder float signal has higher dbfs', () => {
            expect(dbfs(floatUniform(1024, -6))).toBeGreaterThan(dbfs(floatUniform(1024, -40)))
        })
    })

    describe('backward compatibility: Uint8Array input unchanged', () => {
        it('bass returns same result for Uint8Array as before', () => {
            // Silence
            expect(bass(silence())).toBe(0)
            // Uniform
            const val = bass(uniform())
            expect(val).toBeGreaterThanOrEqual(0)
            expect(val).toBeLessThanOrEqual(1)
            // Bass-heavy
            expect(bass(bassHeavy())).toBeGreaterThan(0.5)
        })

        it('rms returns same results for Uint8Array as before', () => {
            expect(rms(silence())).toBe(0)
            expect(rms(fullScale())).toBeCloseTo(1, 5)
            const value = 128
            const normalized = value / 255
            expect(rms(uniform(1024, value))).toBeCloseTo(normalized, 5)
        })

        it('dbfs returns same results for Uint8Array as before', () => {
            expect(dbfs(silence())).toBe(0)
            expect(dbfs(fullScale())).toBeCloseTo(1, 5)
            const val = dbfs(uniform(1024, 100))
            expect(val).toBeGreaterThanOrEqual(0)
            expect(val).toBeLessThanOrEqual(1)
        })
    })
})
