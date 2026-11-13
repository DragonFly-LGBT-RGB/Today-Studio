// Тест дополнительных эффектов. Мультяшная жестокость; не обязателен для основной серии.
export default {
  title: 'Проверка эффектов', fps: 24, subtitles: 'plain', transition: 'cut', gap: 0,
  look: { exposure: 1.1, bloom: .1, sat: .8 },
  cast: {
    block: { skin: '#9fb48e', zombie: true, torn: 1, shirt: '#56675a', pants: '#3f4650', hairStyle: 'none' },
    model: { skin: '#94a586', zombie: true, shirt: '#536459', pants: '#38443e', hairStyle: 'none', skinned: { src: 'zombie_male', height: 5.3 } },
  },
  scenes: [{ set: 'zone_hangar', light: 'zoneInterior', fills: [['#fff1dd', 120, [0, 7, 11]]],
    cast: { block: { at: [-3, 0, -1], look: 'none' }, model: { at: [3, 0, -1], look: 'none' } },
    beats: [{ dur: 4.5, cam: { pos: [0, 5, 21], target: [0, 3, -1], fov: 46 }, do: [
      ['block', 'gut', { dur: .7 }, .4], ['block', 'dismember', { part: 'armL', spray: false, pool: false }, 1.3],
      ['model', 'dismember', { part: 'armR', spray: false, pool: false }, 2.3],
    ] }],
  }],
};
