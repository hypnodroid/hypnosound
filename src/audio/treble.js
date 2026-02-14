import bandEnergy from './bandEnergy.js'

export default function treble(fft, sampleRate = 44100) {
    return bandEnergy(fft, 4000, 20000, sampleRate)
}
