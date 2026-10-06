// Generates lightweight ambient audio loops as Data URLs so user can test profile music instantly!

export interface PresetTrack {
  id: string;
  name: string;
  genre: string;
  description: string;
  generateUrl: () => string;
}

function createWavHeader(dataLength: number, sampleRate: number = 22050, numChannels: number = 1): Uint8Array {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);

  // "RIFF"
  header.set([82, 73, 70, 70], 0);
  view.setUint32(4, 36 + dataLength, true);
  // "WAVE"
  header.set([87, 65, 86, 69], 8);
  // "fmt "
  header.set([102, 109, 116, 32], 12);
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true); // Channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
  view.setUint16(32, numChannels * 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  // "data"
  header.set([100, 97, 116, 97], 36);
  view.setUint32(40, dataLength, true);

  return header;
}

// Generates warm ambient chords
function generateAmbientChordsWav(frequencies: number[], durationSec: number = 4): string {
  const sampleRate = 22050;
  const numSamples = sampleRate * durationSec;
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;

  const header = createWavHeader(dataSize, sampleRate);
  const pcmData = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope for smooth looping
    const envelope = Math.sin((Math.PI * i) / numSamples);

    let sample = 0;
    for (const freq of frequencies) {
      // Warm sine + subtle octave overtone
      sample += Math.sin(2 * Math.PI * freq * t) * 0.25;
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.08;
      // Gentle chorus detune
      sample += Math.sin(2 * Math.PI * (freq + 0.5) * t) * 0.15;
    }

    const val = Math.max(-1, Math.min(1, sample * envelope));
    pcmData[i] = val < 0 ? val * 0x8000 : val * 0x7fff;
  }

  const fullBytes = new Uint8Array(header.length + pcmData.byteLength);
  fullBytes.set(header, 0);
  fullBytes.set(new Uint8Array(pcmData.buffer), header.length);

  // Convert to binary string & base64
  let binary = '';
  const len = fullBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(fullBytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export const PRESET_TRACKS: PresetTrack[] = [
  {
    id: 'lofi-dream',
    name: 'Midnight Lofi Chill',
    genre: 'Lofi / Ambient',
    description: 'Warm, mellow relaxing Rhodes-style ambient chord progression',
    generateUrl: () => generateAmbientChordsWav([220.0, 261.63, 329.63, 392.0], 4) // A minor 7
  },
  {
    id: 'cyberpunk-pulse',
    name: 'Cyberpunk Neon Pulse',
    genre: 'Synthwave',
    description: 'Atmospheric deep dark synth drone with crystalline highs',
    generateUrl: () => generateAmbientChordsWav([146.83, 220.0, 293.66, 440.0], 3.5) // D minor
  },
  {
    id: 'astral-ambient',
    name: 'Astral Ethereal Space',
    genre: 'Space Ambient',
    description: 'Dreamy floating cosmic harmony with celestial overtones',
    generateUrl: () => generateAmbientChordsWav([261.63, 329.63, 392.0, 523.25], 4.5) // C Major
  }
];
