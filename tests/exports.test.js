import { describe, it, expect } from 'vitest'
import AudioProcessor, * as hypnosound from '../index.js'
import { AudioFeatures } from '../src/audio/index.js'

describe('module exports', () => {
    it('default export is AudioProcessor class', () => {
        expect(typeof AudioProcessor).toBe('function')
        const instance = new AudioProcessor()
        expect(instance).toBeInstanceOf(AudioProcessor)
    })

    it('exports all audio features as named exports', () => {
        for (const feature of AudioFeatures) {
            expect(typeof hypnosound[feature]).toBe('function')
        }
    })

    it('exports makeCalculateStats', () => {
        expect(typeof hypnosound.makeCalculateStats).toBe('function')
    })

    it('exports StatTypes array', () => {
        expect(Array.isArray(hypnosound.StatTypes)).toBe(true)
        expect(hypnosound.StatTypes.length).toBe(10)
    })

    it('exports applyKaiserWindow', () => {
        expect(typeof hypnosound.applyKaiserWindow).toBe('function')
    })

    it('exports the onset envelope generator', () => {
        expect(typeof hypnosound.makeOnsetEnvelope).toBe('function')
        expect(typeof hypnosound.envelopeFrom).toBe('function')
        expect(typeof hypnosound.defaultEnvelopeConfig).toBe('object')
    })

    it('keeps the onset detector and envelope out of the AudioFeatures barrel', () => {
        // They are stateful event/animation objects, not per-frame scalar
        // features. paper-cranes spawns one worker per AudioFeatures entry.
        expect(hypnosound.AudioFeatures).not.toContain('onset')
        expect(hypnosound.AudioFeatures).not.toContain('onsetEnvelope')
    })

    it('exports makeOnsetDetector', () => {
        expect(typeof hypnosound.makeOnsetDetector).toBe('function')
    })

    it('exports AudioFeatures array', () => {
        expect(Array.isArray(hypnosound.AudioFeatures)).toBe(true)
        expect(hypnosound.AudioFeatures.length).toBe(16)
    })

    it('all AudioFeatures entries correspond to exported functions', () => {
        for (const name of hypnosound.AudioFeatures) {
            expect(typeof hypnosound[name]).toBe('function')
        }
    })
})
