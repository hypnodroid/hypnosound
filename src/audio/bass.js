import bandEnergy from './bandEnergy.js'

export default function bass(fft, sampleRate = 44100) {
    return bandEnergy(fft, 0, 400, sampleRate)
}
