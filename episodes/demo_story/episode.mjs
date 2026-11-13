// СТОРИТЕЛЛ — пример «истории с ютуба»: рассказчик стоит у дивана и говорит прямо в камеру,
// слушатель сидит рядом и реагирует. Всё собрано из пакета st* (engine/anim.js) и команды 'story':
//   ['narr','story','twist']                      стоя
//   ['bro','story',{beat:'roll',sit:true},'w:…']  тот же бит сидя ('stRoll@sit'), по слову реплики
// Список битов: intro, hook, picture, emphasis, quotes, whisper, list, reveal, twist, denial,
// agree, roll, cringe, rage, despair, hype, phew, so, deadpan, awkward.
export default {
  title: 'Как я сходил за хлебом', lang: 'ru', fps: 24, subtitles: 'cards',
  transition: 'cut', gap: .06, hold: .22, handheld: .55,
  look: { exposure: 1.0, bloom: 0, sat: 1.08, contrast: 1.03, vig: .08, grain: .02 },
  music: { file: 'fluffing.mp3', volume: .07, credit: 'Kevin MacLeod — Fluffing a Duck (CC BY 4.0)' },
  speakers: {
    narr: { name: 'ВОВКА', color: '#ffb03a' },
    bro: { name: 'ДЭН', color: '#5fb6f0' },
  },
  cast: {
    narr: { style: 'toy', skin: '#ffd62c', hair: '#5b3a24', hairStyle: 'short', shirt: '#f0705a', pants: '#3f6fb5', shoe: '#fff', face: {} },
    bro: { style: 'toy', skin: '#ffcf9e', hair: '#2b2b33', hairStyle: 'short', shirt: '#63c48a', pants: '#4a4a5e', scale: [.88, .88, .88], face: { lashes: true } },
  },
  scenes: [
    { set: 'flat', light: 'day', chip: 'ВОВКА • история из жизни',
      cast: {
        narr: { at: 'sofaFront', rot: 0, expr: 'happy', pose: 'stTell', look: 'cam' },
        bro: { at: { at: 'sofa', off: [1.55, -.16, 0] }, rot: -.25, expr: 'bored', pose: 'sit', look: 'narr' },
      },
      beats: [
        // 1. Крючок: палец в камеру, резкий наезд, плашка
        { dur: 2.6, cam: { type: 'close', who: 'narr', dist: 6.6, angle: -.05, push: .09 },
          do: [['narr', 'story', 'hook', 0], ['fx', 'big', 'СЛУШАЙТЕ', .15, { dur: 1.1 }],
            ['narr', 'story', 'intro', 1.2], ['cam', 'punch', .12, 1.2]] },

        // 2. Завязка: «представьте картину» — обе ладони вверх
        { say: ['narr', 'Короче, пошёл я вчера за хлебом. Обычный вторник, ничего не предвещало.'],
          cam: { type: 'medium', who: 'narr', dist: 9.2, fov: 40, push: .05 },
          do: [['narr', 'story', 'picture', 'w:хлебом'], ['bro', 'expr', 'bored', 0],
            ['narr', 'story', 'intro', 'w:Обычный']] },

        // 3. Рубленый жест на ударном слове + перечисление на ладони
        { say: ['narr', 'А в магазине — очередь. Восемь человек. И одна касса.'],
          cam: { type: 'close', who: 'narr', dist: 6.2, angle: .04, push: .06 },
          do: [['narr', 'story', 'emphasis', 'w:очередь'], ['narr', 'story', 'list', 'w:Восемь'],
            ['bro', 'story', { beat: 'roll', sit: true }, 'w:одна']] },

        // 4. Поворот: двойной взгляд, вспышка, слушатель в шоке
        { say: ['narr', 'И тут женщина впереди говорит: я только спросить!'],
          cam: { type: 'close', who: 'narr', dist: 6.0, angle: -.06, push: .1 },
          do: [['narr', 'story', 'twist', 'w:спросить'], ['fx', 'flash', .18, 'w:спросить'],
            ['bro', 'story', { beat: 'reveal', sit: true }, 'w:спросить+0.2']] },

        // 5. Неловкая пауза без слов: оба смотрят в камеру
        { dur: 2.4, cam: { type: 'two', who: ['narr', 'bro'], fov: 42 },
          do: [['narr', 'story', 'deadpan', .1], ['bro', 'story', { beat: 'deadpan', sit: true }, .4],
            ['sfx', 'tick', { vol: .22, count: 3, every: .5 }, .2]] },

        // 6. Кринж: плечи втянуты, дрожь; телефон звенит в кармане
        { say: ['narr', 'Я стою, молчу. И тут у меня в кармане начинается: АЛЛО?!'],
          cam: { type: 'close', who: 'narr', dist: 6.1, push: .08 },
          do: [['sfx', 'bell', { vol: .4 }, 'w:кармане'], ['narr', 'story', 'cringe', 'w:АЛЛО'],
            ['cam', 'shake', .1, 'w:АЛЛО', { dur: .4 }], ['bro', 'expr', 'oops', 'w:АЛЛО']] },

        // 7. Ярость с топотом, слушатель в восторге
        { say: ['narr', 'Это был будильник. Который я забыл выключить. Ещё утром.'],
          cam: { type: 'medium', who: 'narr', dist: 8.6, angle: .05 },
          do: [['narr', 'story', 'rage', 'w:будильник'], ['fx', 'big', 'КЛАСС', .9, { dur: 1.2 }],
            ['bro', 'story', { beat: 'hype', sit: true }, 'w:забыл']] },

        // 8. Отрицание «нет-нет-нет» и бегающие глаза
        { say: ['narr', 'Все обернулись. Я сделал вид, что это вообще не я.'],
          cam: { type: 'close', who: 'narr', dist: 6.3, angle: -.04, push: .07 },
          do: [['narr', 'story', 'denial', 'w:обернулись'], ['narr', 'expr', 'shifty', 'w:вид'],
            ['bro', 'story', { beat: 'roll', sit: true }, 'w:вообще']] },

        // 9. Шёпотом в камеру — и финальный газп
        { say: ['narr', 'Хлеб я так и не купил.'], cam: { type: 'close', who: 'narr', dist: 5.9, push: .12 },
          do: [['narr', 'story', 'whisper', 0], ['narr', 'story', 'reveal', 'w:купил'],
            ['bro', 'story', { beat: 'despair', sit: true }, 'w:купил']] },

        // 10. Аутро: шимми, волна, счётчик просмотров, уход в затемнение
        { dur: 3.4, cam: 'wide', hold: 1.2,
          do: [['narr', 'story', 'hype', 0], ['bro', 'story', { beat: 'hype', sit: true }, .2],
            ['fx', 'views', { from: 12, to: 98400, count: 2.2 }, .3],
            ['narr', 'pose', 'wave', 1.4], ['bro', 'pose', 'cheer@sit', 1.4],
            ['fx', 'fade', 'out', 'end+0.7', { dur: .5 }]] },
      ],
    },
  ],
};
