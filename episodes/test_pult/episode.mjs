// ТЕСТОВАЯ СЕРИЯ «Пульт» — пример сценария для движка Studio Lite.
// Маша ищет пульт, папа устраивает целое расследование… а пульт всё это время у него в руке.
// Откройте этот файл рядом с README.md: здесь показано почти всё, что умеет движок.
const PI = Math.PI;

export default {
  title: 'Пульт (тест)',
  look: { exposure: .62, bloom: .18, bloomT: .92, sat: .95, vig: .35, grain: .04 },   // «плёнка»: экспозиция, свечение, насыщенность, виньетка, зерно
  lang: 'ru',
  fps: 30,
  subtitles: 'plain',          // субтитры: только текст с обводкой
  transition: 'black',         // переход между сценами: 'flash' | 'black' | 'whoosh' | 'cut'
  hold: .15,                   // пауза после каждой реплики (сек)
  gap: .08,                    // пауза перед следующей репликой (сек)

  // кто говорит: имя, цвет и голос (голос — папка episodes/<серия>/voice/<id>/)
  speakers: {
    masha: { name: 'МАША', color: '#f783ac' },
    papa: { name: 'ПАПА', color: '#4dabf7' },
  },

  music: { file: 'fluffing.mp3', volume: .12, credit: 'Kevin MacLeod — «Fluffing a Duck» (CC BY 4.0)', creditOnScreen: false },

  // внешний вид персонажей (всё процедурное, моделей не нужно)
  cast: {
    masha: { skin: '#f7dcc0', shirt: '#e64980', shirtKind: 'plain', print: '★', pants: '#364fc7', shoe: '#ffffff', sleeve: .5,
      hair: '#7a4a24', hairStyle: 'ponytail', bow: '#ffd43b', scale: [.82, .78, .82], face: { lashes: true, freckles: true } },
    papa: { skin: '#efc9a0', shirt: '#2f9e44', shirtKind: 'plaid', pants: '#343a40', pantsKind: 'jeans', shoe: '#222', sleeve: .9,
      hair: '#3b2a1a', hairStyle: 'short', face: { mustache: '#3b2a1a', glasses: true } },
  },

  scenes: [
    {
      set: 'flat', light: 'dusk',
      cast: {
        masha: { at: 'sofa', pose: 'sit', expr: 'bored', look: 'none' },
        papa: { at: 'doorIn', rot: -PI / 2, pose: 'idle', expr: 'neutral', hold: { R: 'remote' }, look: 'none' },
      },
      beats: [
        // 1. общий план, Маша зовёт папу
        { say: ['masha', 'Па-ап! Где пульт? Мультики через минуту начинаются!'], cam: 'wide',
          do: [['masha', 'expr', 'angry', 'w:пульт'], ['masha', 'pose', 'raiseR@sit', 'w:пульт'], ['masha', 'pose', 'sit', 'end']] },

        // 2. папа входит (walk) и успокаивает — пульт у него в руке, но он не замечает
        { say: ['papa', 'Спокойно. Пульт не мог далеко уйти. Сейчас найдём.'], cam: { pos: [0.8, 4.4, 4.8], target: [3.6, 3.9, -1.6], fov: 40 },
          do: [['papa', 'walk', { to: 'mid', speed: 3.4, rot: -.35 }, 0], ['sfx', 'step', { vol: .5, count: 3, every: .35 }, 0],
            ['papa', 'expr', 'smug', 'w:Спокойно'], ['papa', 'pose', 'handsHips', 'w:Сейчас']] },

        // 3. без реплики: папа присаживается и ищет у дивана (камера с явными координатами + наезд)
        { dur: 2.2, cam: { pos: [-3.5, 4.4, 5.5], target: [2.6, 1.9, -2.8], fov: 44, to: { pos: [-2.8, 4.0, 4.6] } },
          do: [['papa', 'walk', { to: [2.8, 0, -2.6], dur: .6, rot: -(PI - .6) }, 0], ['papa', 'pose', 'crouch', .5], ['papa', 'expr', 'think', .5],
            ['sfx', 'cloth', { vol: .6 }, .6], ['sfx', 'thud', { vol: .3 }, 1.3], ['masha', 'look', 'papa', 0]] },

        // 4. крупный план папы
        { say: ['papa', 'Под диваном нет. Под подушкой тоже нет. Загадка!'], cam: { pos: [4.6, 4.2, 3.1], target: [2.8, 3.7, -2.6], fov: 40 },
          do: [['papa', 'turn', .3, 0], ['papa', 'look', 'none', 0], ['papa', 'pose', 'think', 'w:Загадка'], ['papa', 'expr', 'suspicious', 'w:Загадка'], ['sfx', 'question', { vol: .4 }, 'w:Загадка']] },

        // 5. Маша замечает
        { say: ['masha', 'Пап… а что это у тебя в руке?'], cam: { pos: [-2.4, 3.9, 1.6], target: [0, 3.4, -4.35], fov: 38 },
          do: [['masha', 'look', 'none', 0], ['masha', 'expr', 'suspicious', 0], ['masha', 'pose', 'point@sit', 'w:руке']] },

        // 6. «камера-удар» на пульт: папа смотрит на свою руку
        { dur: 1.6, cam: { type: 'close', who: 'papa', angle: .2 },
          do: [['papa', 'pose', 'remote', 0], ['papa', 'expr', 'shocked', .35], ['cam', 'punch', .12, .35], ['sfx', 'ding', { vol: .5 }, .35]] },

        // 7. оправдание
        { say: ['papa', 'Это не я. Он сам туда запрыгнул.'], cam: { pos: [-1.0, 4.4, 7.0], target: [1.0, 3.2, -3.4], fov: 40 },
          do: [['papa', 'pose', 'shrug', 0], ['papa', 'expr', 'nervous', 0], ['masha', 'expr', 'smug', 'w:сам']] },

        // 8. финал: садятся вместе, общий план, затемнение
        { say: ['masha', 'Ну ты даёшь! Садись, уже начинается.'], cam: 'wide', hold: 1.4,
          do: [['masha', 'expr', 'happy', 0], ['masha', 'pose', 'wave@sit', 0], ['masha', 'pose', 'sit', 'w:Садись'],
            ['papa', 'walk', { to: [1.8, 0, -4.35], dur: 1.0, rot: 0 }, 'w:Садись'], ['papa', 'pose', 'sit', 'end'], ['papa', 'expr', 'happy', 'end'],
            ['papa', 'look', 'none', 0], ['masha', 'look', 'none', 0],
            ['fx', 'fade', 'out', 'end+0.9', { dur: .5 }]] },
      ],
    },
  ],
};
