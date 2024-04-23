export default function treble(fft) {
  const sampleRate = 44100;
  const totalSamples = fft.length;
  return calculateTreblePower(fft, sampleRate, totalSamples);
}

function calculateTreblePower(fft, sampleRate, totalSamples) {
  const lowerBound = 4000; // 4000 Hz
  const upperBound = 20000; // 20000 Hz, adjust based on your audio context
  let trebleEnergy = 0;
  let maxEnergy = 0;

  // Calculate frequency resolution
  const frequencyResolution = sampleRate / totalSamples;

  for (let i = 0; i < fft.length; i++) {
      let frequency = i * frequencyResolution;
      let magnitude = Math.abs(fft[i]) / totalSamples;
      let power = magnitude * magnitude;

      // Accumulate max energy for normalization
      maxEnergy += power;

      // Isolate and accumulate treble frequencies
      if (frequency >= lowerBound && frequency <= upperBound) {
          trebleEnergy += power;
      }
  }

  // Normalize treble energy from 0 to 1
  let normalizedTreblePower = trebleEnergy / maxEnergy;
  return isNaN(normalizedTreblePower) ? 0: normalizedTreblePower; // Scale by 10 if needed, similar to your original function
}
