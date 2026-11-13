// Демонстрация возможностей реконструкции Studio Full.
// Реплики нарочно без голоса: добавьте voice/<персонаж>/1.mp3 и выполните prep.
const PI = Math.PI;
export default {
  title: 'Зона: сигнал', lang: 'ru', fps: 24, subtitles: 'plain', transition: 'black', gap: .05, hold: .15,
  look: { exposure: .9, bloom: .22, bloomT: .88, sat: .78, contrast: 1.03, vig: .28, grain: .025, ca: .0015 },
  spatial: { interval: .25, near: 8, rolloff: .25, minGain: .25, pan: .85 },
  music: { file: 'investigations.mp3', volume: .08, credit: 'Kevin MacLeod — Investigations (CC BY 4.0)', creditOnScreen: false },
  speakers: { ded: { name: 'ДЕД', color: '#f4cc73' }, katya: { name: 'КАТЯ', color: '#ff89a6' } },
  cast: {
    ded: { skin: '#e4c3a6', shirt: '#ece7da', shirtKind: 'stripes', stripe: '#30599a', vest: '#292b2d', pants: '#292d2e', shoe: '#252525', sleeve: .9, hair: '#574335', hairStyle: 'ushanka', hat: '#574335', face: { glasses: true, beard: '#d9d7d1' } },
    katya: { skin: '#efd0b1', shirt: '#b74b51', shirtKind: 'plain', pants: '#333237', shoe: '#232323', sleeve: .8, hair: '#aa824a', hairStyle: 'short', face: { lashes: true } },
    zombie: { skin: '#89a77b', shirt: '#555b4d', pants: '#3f3e36', hairStyle: 'none', zombie: true, torn: 1.2,
      skinned: { src: 'zombie_male', height: 5.3, defaultAnimation: 'Idle' } },
  },
  scenes: [
    {
      set: 'zone_airfield', light: 'zoneNight', fills: [['#ffd9bb', 110, [0, 7, 12]]],
      cast: { ded: { at: 'hero', rot: 0, look: 'none' }, katya: { at: 'companion', rot: 0, look: 'none' }, zombie: { at: 'threat', rot: PI, look: 'none' } },
      beats: [
        { dur: 3.5, cam: { pos: [0, 7, 23], target: [0, 3.2, -6], fov: 48, to: { pos: [0, 6.6, 21] } },
          do: [ ['set', 'fire', { at: [-6, 0, -11], scale: .8, for: 3.5, smoke: true }, 0], ['zombie', 'walk', { to: [4, 0, -3], dur: 3, rot: 0 }, 0],
            ['sfx', 'step', { count: 3, every: .65, vol: .65, at: 'zombie' }, .6], ['ded', 'pose', 'point', .8], ['katya', 'expr', 'worried', .8] ] },
      ],
    },
    {
      set: 'zone_shelter', light: 'zoneInterior', fills: [['#e5f5dc', 100, [-1, 6, 9]]],
      cast: { ded: { at: 'hero', rot: 0, look: 'none' }, katya: { at: 'companion', rot: 0, look: 'none' } },
      beats: [
        { say: ['ded', 'Сигнал идёт из ангара. Держись рядом.'], cam: { pos: [-1.0, 5.2, 12.5], target: [-.2, 3.3, -2], fov: 45 },
          do: [ ['ded', 'pose', 'point', 0], ['sfx', 'click', { vol: .65, at: 'radio' }, .1], ['katya', 'expr', 'worried', 0] ] },
      ],
    },
    {
      set: 'zone_hangar', light: 'zoneInterior', fills: [['#d2e9ef', 115, [0, 7, 11]]],
      cast: { ded: { at: 'hero', rot: 0, look: 'none' }, katya: { at: 'companion', rot: 0, look: 'none' }, zombie: { at: 'threat', rot: 0, look: 'none' } },
      beats: [
        { dur: 4.4, cam: { pos: [0, 6.0, 20], target: [0, 3.3, -5], fov: 46 },
          do: [ ['zombie', 'walk', { to: [0, 0, -3], dur: 2.4, rot: 0 }, 0], ['zombie', 'mocap', 'Walk', 0], ['zombie', 'mocap', { clip: 'Punch', loop: false }, 2.5],
            ['sfx', 'thud', { vol: .8, at: 'zombie' }, 2.8], ['cam', 'shake', .15, 2.8, { dur: .5 }], ['set', 'sparks', { at: [-2, 1, -4], n: 10 }, 2.8],
            ['katya', 'pose', 'scared', 2.6], ['ded', 'pose', 'aim', 2.5] ] },
      ],
    },
  ],
};
