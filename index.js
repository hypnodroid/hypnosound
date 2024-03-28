import {makeCalculateStats} from './src/utils/calculateStats.js'
import energy from './src/audio/energy.js'
class AudioProcessor {
    statCalculators = {}
    previousValues = {}
    constructor() {
        this.energy = energy
        this.statCalculators.energy = makeCalculateStats()
        this.previousValue.energy = 0
    }
    energy = (fft) => {
        const {value, stats} = energy(this.previousValue.energy, this.statCalculators.energy, fft)
        this.previousValue.energy = value
        return {value, stats}
    }
}
export default AudioProcessor
