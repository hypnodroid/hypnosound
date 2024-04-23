import { StatTypes, makeCalculateStats } from './src/utils/calculateStats.js'
import {applyKaiserWindow} from './src/utils/applyKaiserWindow.js'
import energy from './src/audio/energy.js'
import spectralCentroid from './src/audio/spectralCentroid.js'
import spectralCrest from './src/audio/spectralCrest.js'
import spectralEntropy from './src/audio/spectralEntropy.js'
import spectralFlux from './src/audio/spectralFlux.js'
import spectralKurtosis from './src/audio/spectralKurtosis.js'
import spectralRolloff from './src/audio/spectralRolloff.js'
import spectralRoughness from './src/audio/spectralRoughness.js'
import spectralSkew from './src/audio/spectralSkew.js'
import spectralSpread from './src/audio/spectralSpread.js'
import pitchClass from './src/audio/pitchClass.js'
import bass from './src/audio/bass.js'
import treble from './src/audio/treble.js'
import mids from './src/audio/mids.js'
class AudioProcessor {
    constructor() {
        // aah, state management
        this.statCalculators = {}
        this.previousValue = {}

        this.statCalculators.energy = makeCalculateStats()

        this.statCalculators.spectralCentroid = makeCalculateStats()

        this.statCalculators.spectralCrest = makeCalculateStats()

        this.statCalculators.spectralEntropy = makeCalculateStats()

        this.statCalculators.spectralFlux = makeCalculateStats()
        this.previousValue.spectralFlux = null

        this.statCalculators.spectralKurtosis = makeCalculateStats()

        this.statCalculators.spectralRolloff = makeCalculateStats()

        this.statCalculators.spectralSkew = makeCalculateStats()

        this.statCalculators.spectralRoughness = makeCalculateStats()

        this.statCalculators.spectralSpread = makeCalculateStats()

        this.statCalculators.pitchClass = makeCalculateStats()

        this.statCalculators.bass = makeCalculateStats()

        this.statCalculators.treble = makeCalculateStats()

        this.statCalculators.mids = makeCalculateStats()
    }


    energy = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = energy(windowedFft)
        const stats = this.statCalculators.energy(value)
        return { value, stats }
    }

    spectralCentroid = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralCentroid(applyKaiserWindow(windowedFft))
        const stats = this.statCalculators.spectralCentroid(value)
        return { value, stats }
    }

    spectralCrest = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralCrest(windowedFft)
        const stats = this.statCalculators.spectralCentroid(value)
        return { value, stats }
    }

    spectralEntropy = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralEntropy(windowedFft)
        const stats = this.statCalculators.spectralEntropy(value)
        return { value, stats }
    }

    spectralFlux = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralFlux(windowedFft, this.previousValue.spectralFlux)
        this.previousValue.spectralFlux = new Uint8Array(windowedFft)
        const stats = this.statCalculators.spectralFlux(value)
        return { value, stats }
    }
    spectralKurtosis = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralKurtosis(windowedFft)
        const stats = this.statCalculators.spectralKurtosis(value)
        return { value, stats }
    }

    spectralRolloff = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralRolloff(windowedFft)
        const stats = this.statCalculators.spectralRolloff(value)
        return { value, stats }
    }

    spectralRoughness = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralRoughness(windowedFft)
        const stats = this.statCalculators.spectralRoughness(value)
        return { value, stats }
    }

    spectralSkew = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralSkew(windowedFft)
        const stats = this.statCalculators.spectralSkew(value)
        return { value, stats }
    }

    spectralSpread = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = spectralSpread(windowedFft)
        const stats = this.statCalculators.spectralSpread(value)
        return { value, stats }
    }

    pitchClass = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = pitchClass(windowedFft)
        const stats = this.statCalculators.pitchClass(value)
        return { value, stats }
    }
    bass = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = bass(windowedFft)
        const stats = this.statCalculators.bass(value)
        return { value, stats }
    }
    treble = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = treble(windowedFft)
        const stats = this.statCalculators.treble(value)
        return { value, stats }
    }
    mids = (fft) => {
        const windowedFft = applyKaiserWindow(fft)
        const value = mids(windowedFft)
        const stats = this.statCalculators.mids(value)
        return { value, stats }
    }
}
export default AudioProcessor
export {
    energy,
    spectralCentroid,
    spectralCrest,
    spectralEntropy,
    spectralFlux,
    spectralKurtosis,
    spectralRolloff,
    spectralRoughness,
    spectralSkew,
    spectralSpread,
    pitchClass,
    makeCalculateStats,
    StatTypes,
    applyKaiserWindow,
}
