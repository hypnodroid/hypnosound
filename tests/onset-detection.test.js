import { describe, it, expect } from 'vitest'
import onsetDetection, { makeOnsetDetector } from '../src/audio/onsetDetection.js'
import { silence, fullScale, uniform } from './helpers.js'

describe('makeOnsetDetector', () => {
    it('returns an object with onset, flux, threshold, mean', () => {
        const detect = makeOnsetDetector()
        const result = detect(silence())
        expect(result).toHaveProperty('onset')
        expect(result).toHaveProperty('flux')
        expect(result).toHaveProperty('threshold')
        expect(result).toHaveProperty('mean')
    })

    it('no onset on first frame', () => {
        const detect = makeOnsetDetector()
        const result = detect(fullScale())
        expect(result.onset).toBe(false)
    })

    it('detects onset when signal suddenly increases', () => {
        const detect = makeOnsetDetector({ historySize: 10, multiplier: 1.5, cooldownFrames: 2 })

        // Feed several frames of silence to build up history
        for (let i = 0; i < 5; i++) {
            detect(silence())
        }

        // Sudden loud signal should trigger onset
        const result = detect(fullScale())
        expect(result.onset).toBe(true)
        expect(result.flux).toBeGreaterThan(0)
    })

    it('cooldown prevents rapid re-triggering', () => {
        const cooldownFrames = 5
        const detect = makeOnsetDetector({ historySize: 10, multiplier: 1.2, cooldownFrames })

        // Build history with silence
        for (let i = 0; i < 5; i++) {
            detect(silence())
        }

        // Trigger onset
        const onsetResult = detect(fullScale())
        expect(onsetResult.onset).toBe(true)

        // During cooldown, even loud frames should not trigger onset
        // Feed silence then fullScale to create a new spike, but within cooldown window
        detect(silence())
        for (let i = 0; i < cooldownFrames - 1; i++) {
            const result = detect(fullScale())
            expect(result.onset).toBe(false)
        }
    })
})

describe('onsetDetection (simple function)', () => {
    it('returns 0 with no previous FFT', () => {
        const result = onsetDetection(fullScale())
        expect(result).toBe(0)
    })

    it('returns 0 when previous FFT is undefined', () => {
        const result = onsetDetection(fullScale(), undefined)
        expect(result).toBe(0)
    })

    it('returns a value in 0-1 for Uint8Array input', () => {
        const result = onsetDetection(fullScale(), silence())
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(1)
    })

    it('returns 0 when signal does not increase', () => {
        const result = onsetDetection(silence(), fullScale())
        expect(result).toBe(0)
    })

    it('returns higher value for larger increase', () => {
        const small = onsetDetection(uniform(1024, 50), silence())
        const large = onsetDetection(uniform(1024, 200), silence())
        expect(large).toBeGreaterThan(small)
    })

    it('returns 1 for maximum possible onset (silence to full scale)', () => {
        const result = onsetDetection(fullScale(), silence())
        expect(result).toBeCloseTo(1, 1)
    })
})
