export default function spectralEntropy(prevValue,statCalculator, fft) {
    let computed = calculateSpectralEntropy(fft) // Process FFT data
    const value = computed
    const stats = statCalculator(value)
    return { value, stats }
}

function toPowerSpectrum(fftData) {
    return fftData.map((amplitude) => Math.pow(amplitude, 2))
}

function calculateSpectralEntropy(fftData) {
    const powerSpectrum = toPowerSpectrum(fftData)
    // Normalize the power spectrum to create a probability distribution
    const totalPower = powerSpectrum.reduce((sum, val) => sum + val, 0)
    if(totalPower === 0) return 0
    const probabilityDistribution = new Float32Array(powerSpectrum.length)
    for (let i = 0; i < powerSpectrum.length; i++) {
        probabilityDistribution[i] = powerSpectrum[i] / totalPower
    }

    const entropy = probabilityDistribution.reduce((sum, prob) => {
        if (prob > 0) {
            const logProb = Math.log(prob);
            return sum - prob * logProb;
        } else {
            return sum;
        }
    }, 0);
    return entropy / Math.log(probabilityDistribution.length)
}
