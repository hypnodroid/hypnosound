export default function zeroCrossingRate(samples) {
    if (!samples || samples.length < 2) return 0

    let crossings = 0

    // If input appears to be unsigned (Uint8Array from Web Audio getByteTimeDomainData),
    // center around 128 (the midpoint)
    const isUnsigned = samples instanceof Uint8Array

    for (let i = 1; i < samples.length; i++) {
        const prev = isUnsigned ? samples[i - 1] - 128 : samples[i - 1]
        const curr = isUnsigned ? samples[i] - 128 : samples[i]

        if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
            crossings++
        }
    }

    // Normalize to 0-1: divide by max possible crossings (length - 1)
    return crossings / (samples.length - 1)
}
