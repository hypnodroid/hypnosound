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
}
export default AudioProcessor
