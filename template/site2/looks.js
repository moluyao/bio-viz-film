// Looks = how a film is shown (lighting, background, palette, glow). Science stays identical across looks;
// colours are teaching / pseudo-colours, which every layout's footnote states.
//   ?look=academic | vivid | neon | paper      ?palette=textbook | candy | neon | ice | sunset
//   ?fx=channels   at every step change, wipe to the next pseudo-colour channel (like switching fluorescence channels)
export const PALETTES = {
  textbook: null, // = the scene's own PALETTE
  candy: { pm: '#ffd6e8', envelope: '#8f7bff', envelopeIn: '#6b55f0', chromatin: '#b38bff', nucleolus: '#6a3df0', er: '#2fe0b0', ribosome: '#ff4f8b', golgi: '#ffb02e',
    vesicle: '#ffc4a8', granuleM: '#c98bff', vacuole: '#f2e1ff', mitoOut: '#ff6b5e', mitoIn: '#e0443c', mt: '#38d6ff', cyto: '#9aa7ff', cargo: '#7ff5e0', lyso: '#ff8ad8', perox: '#c6f05a', tj: '#ffffff' },
  neon: { pm: '#3b4bff', envelope: '#7a5cff', envelopeIn: '#5a3cff', chromatin: '#d24bff', nucleolus: '#ff2fd0', er: '#00ffc8', ribosome: '#ff2f7a', golgi: '#ff9a00',
    vesicle: '#ffe600', granuleM: '#b04bff', vacuole: '#e7b8ff', mitoOut: '#ff3d3d', mitoIn: '#ff7a3d', mt: '#00d5ff', cyto: '#5964c8', cargo: '#5dfff0', lyso: '#ff58c8', perox: '#b6ff3d', tj: '#ffffff' },
  ice: { pm: '#9fd8ff', envelope: '#2f7dff', envelopeIn: '#1f5fe0', chromatin: '#4f8dff', nucleolus: '#1a3fb8', er: '#00c8f0', ribosome: '#ff5c9c', golgi: '#36b6ff',
    vesicle: '#b8f0ff', granuleM: '#4aa8ff', vacuole: '#a8e4ff', mitoOut: '#1f9cff', mitoIn: '#1470d0', mt: '#7fe8ff', cyto: '#6f96c8', cargo: '#7ff5e8', lyso: '#7aa0ff', perox: '#b8ffe8', tj: '#ffffff' },
  sunset: { pm: '#ffe2c8', envelope: '#c75cff', envelopeIn: '#a03ce0', chromatin: '#ff6fb0', nucleolus: '#d02c7a', er: '#e8508c', ribosome: '#7a3cff', golgi: '#ff7a3c',
    vesicle: '#ffc0d0', granuleM: '#b45cff', vacuole: '#ead2ff', mitoOut: '#ff4a6a', mitoIn: '#d8304f', mt: '#ffc06a', cyto: '#d8a0a8', cargo: '#ffe9a0', lyso: '#c04aa0', perox: '#ffd86a', tj: '#ffffff' },
};
export const LOOKS = {
  academic: { bg: ['#16213d', '#0a1022', '#05070f'], fog: 0x0a1022, exposure: 1.05, hemi: [0xa9bcff, 0x1a1c28, 0.7], key: 2.6, rim: 1.6, bloom: [0.32, 0.35, 0.95], palette: 'textbook', glow: 0 },
  vivid: { bg: ['#f3ecff', '#ddd6f6', '#c4bdeb'], fog: 0xe6e0f8, exposure: 0.9, hemi: [0xffffff, 0xd9d4ff, 1.3], key: 2.1, rim: 1.1, bloom: [0.38, 0.45, 0.93], palette: 'candy', glow: 0.06, tracer: '#ff7a00' },
  neon: { bg: ['#0b0620', '#05030f', '#000000'], fog: 0x05030f, exposure: 1.0, hemi: [0x6f5cff, 0x05030f, 0.5], key: 1.6, rim: 2.4, bloom: [0.9, 0.55, 0.55], palette: 'neon', glow: 0.35 },
  paper: { bg: ['#f4efe4', '#efe8da', '#e6dcc8'], fog: 0xefe8da, exposure: 1.1, hemi: [0xffffff, 0xcfc4ad, 1.4], key: 2.0, rim: 0.8, bloom: [0.2, 0.3, 0.97], palette: 'textbook', glow: 0 },
};
export const CHANNEL_CYCLE = ['candy', 'sunset', 'neon', 'candy'];  // ice removed: low contrast on light backgrounds
