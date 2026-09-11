import { describe, it, expect } from 'vitest'
import spectralFlatness from '../src/audio/spectralFlatness.js'
import { silence, uniform, singleBin, randomSpectrum } from './helpers.js'

describe('spectralFlatness', () => {
    it('returns 0 for silence (all zeros)', () => {
        expect(spectralFlatness(silence())).toBe(0)
    })

    it('returns close to 1 for uniform/white noise signal (all bins equal)', () => {
        const val = spectralFlatness(uniform(1024, 128))
        expect(val).toBeCloseTo(1, 1)
    })

    it('returns close to 0 for a single-bin spike (pure tone)', () => {
        const val = spectralFlatness(singleBin(1024, 50, 255))
        expect(val).toBeCloseTo(0, 1)
    })

    it('returns a value between 0 and 1 for random spectrum', () => {
        const val = spectralFlatness(randomSpectrum())
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThan(1)
    })

    it('works with different FFT sizes', () => {
        for (const size of [256, 512, 2048, 4096]) {
            const uniformVal = spectralFlatness(uniform(size, 128))
            expect(uniformVal).toBeCloseTo(1, 1)

            const spikeVal = spectralFlatness(singleBin(size, 10, 255))
            expect(spikeVal).toBeLessThan(0.1)
        }
    })

    it('returns 0 for empty array', () => {
        expect(spectralFlatness(new Uint8Array(0))).toBe(0)
    })

    it('uniform spectrum is flatter than single-bin spectrum', () => {
        const flat = spectralFlatness(uniform(1024, 128))
        const tonal = spectralFlatness(singleBin(1024, 50, 255))
        expect(flat).toBeGreaterThan(tonal)
    })
})
