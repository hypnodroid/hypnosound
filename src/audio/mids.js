import bandEnergy from './bandEnergy.js'

export default function mids(fft, sampleRate = 44100) {
    return bandEnergy(fft, 400, 4000, sampleRate)
}
