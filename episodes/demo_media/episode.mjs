// Пример: внешний локальный GLB как реквизит и процедурный телевизор со статикой.
export default {
  title: 'Телевизор и реквизит', fps: 24, subtitles: 'plain', transition: 'cut', gap: 0,
  look: { exposure: .8, bloom: .08, bloomT: .95, vig: .2, grain: .02 },
  cast: { watcher: { skin: '#e4c3a6', shirt: '#315a70', pants: '#30343a', hair: '#3a2d24', hairStyle: 'short' } },
  scenes: [{
    set: 'zone_shelter', light: 'zoneInterior', fills: [['#e2ead9', 100, [0, 7, 10]]],
    cast: { watcher: { at: [0, 0, 0], look: 'none' } },
    models: [{ id: 'mannequin', src: 'assets/models/blocky/character-a.glb', at: [4, 0, -5], scale: .58 }],
    tvs: [{ id: 'crt', at: [-4, 0, -4], scale: 2, light: 4 }],
    beats: [{ dur: 3, cam: { pos: [0, 5.4, 20], target: [0, 2.8, -3], fov: 47 }, do: [
      ['set', 'tv', { id: 'crt', mode: 'on' }, 0],
      ['sfx', 'click', { vol: .6 }, 0],
      ['watcher', 'pose', 'think', .2],
    ] }],
  }],
};
