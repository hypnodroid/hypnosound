import { describe, it, expect } from 'vitest'
import bandEnergy from '../src/audio/bandEnergy.js'
import { silence, uniform, singleBin } from './helpers.js'

describe('bandEnergy', () => {
    it('returns 0 for silence', () => {
        expect(bandEnergy(silence(), 0, 400)).toBe(0)
    })

    it('returns 1 when all energy is within the specified band', () => {
        // Single bin at index 0 (0 Hz), band covers 0-400 Hz
        const fft = singleBin(1024, 0, 255)
        expect(bandEnergy(fft, 0, 400)).toBe(1)
    })

    it('returns 0 when all energy is outside the specified band', () => {
        // Single bin at index 0 (0 Hz), band covers 4000-20000 Hz
        const fft = singleBin(1024, 0, 255)
        expect(bandEnergy(fft, 4000, 20000)).toBe(0)
    })

    it('custom frequency ranges work correctly', () => {
        // Put energy in a specific bin and define a band that includes it
        const fft = new Uint8Array(1024).fill(0)
        // At 44100 Hz sample rate and 1024 bins, frequency resolution = 44100/1024 ~ 43.07 Hz
        // Bin 10 = 10 * 43.07 = 430.7 Hz
        fft[10] = 255
        // Band 400-500 Hz should include bin 10
        const result = bandEnergy(fft, 400, 500)
        expect(result).toBe(1)

        // Band 0-400 Hz should NOT include bin 10 (430.7 Hz > 400 Hz)
        const resultOutside = bandEnergy(fft, 0, 400)
        expect(resultOutside).toBe(0)
    })

    it('different sample rates shift the frequency mapping', () => {
        const fft = new Uint8Array(1024).fill(0)
        // Bin 10 at 44100 Hz = 10 * (44100/1024) = ~430.7 Hz
        // Bin 10 at 22050 Hz = 10 * (22050/1024) = ~215.3 Hz
        fft[10] = 255

        // At 44100 Hz, bin 10 is at ~430.7 Hz, so band 0-400 should NOT include it
        expect(bandEnergy(fft, 0, 400, 44100)).toBe(0)

        // At 22050 Hz, bin 10 is at ~215.3 Hz, so band 0-400 SHOULD include it
        expect(bandEnergy(fft, 0, 400, 22050)).toBe(1)
    })

    it('returns value between 0 and 1 for uniform signal with partial band', () => {
        const fft = uniform(1024, 128)
        const result = bandEnergy(fft, 400, 4000)
        expect(result).toBeGreaterThan(0)
        expect(result).toBeLessThan(1)
    })

    it('full frequency range captures all energy', () => {
        const fft = uniform(1024, 200)
        // 0 Hz to Nyquist (sampleRate / 2 = 22050 Hz) should get nearly all energy
        // but bins above Nyquist still exist in the FFT, so 0 to sampleRate covers everything
        const result = bandEnergy(fft, 0, 44100)
        expect(result).toBe(1)
    })

    it('is exported from the top-level index', async () => {
        const hypnosound = await import('../index.js')
        expect(typeof hypnosound.bandEnergy).toBe('function')
    })

    it('is NOT in AudioFeatures array (it is a utility, not a standalone feature)', async () => {
        const { AudioFeatures } = await import('../src/audio/index.js')
        expect(AudioFeatures).not.toContain('bandEnergy')
    })
})
