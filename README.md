# hypnosound
A little library for extracting audio features, and optionally applying statistics to them.

## Usage

You can either use the AudioProcessor, which maintains state and calculates the statistics for you, or use (most) of the functions directly in a functional way.

### AudioProcessor

```javascript
  import AudioProcessor from 'hypnosound';

  console.log({
    energy: a.energy(fft),
    spectralCentroid: a.spectralCentroid(fft),
    spectralCrest: a.spectralCrest(fft),
    spectralEntropy: a.spectralEntropy(fft),
    spectralFlux: a.spectralFlux(fft),
    spectralKurtosis: a.spectralKurtosis(fft),
    spectralRolloff: a.spectralRolloff(fft),
    spectralRoughness: a.spectralRoughness(fft),
    spectralSkew: a.spectralSkew(fft),
    spectralSpread: a.spectralSpread(fft),
  });
  ```

  Each audio feature comes with statistics, which are calculated automatically. You can access them like so:
  ```javascript
  const {value, stats} = a.energy(fft)
  console.log(`the current value for energy is ${value}`);
  console.log(`here are some stats: zScore: ${stats.zScore}, normalized: ${stats.normalized}, standardDeviation: ${stats.standardDeviation}, median: ${stats.median}, mean: ${stats.mean}, min: ${stats.min}, max: ${stats.max}`);
  ```

### Functional
```javascript
import {energy} from 'hypnosound'; // or any other audio feature EXCEPT spectralFlux
console.log(energy(fft));
```

You may want to calculate statistics for the audio features. This is done automatically
