# Studio Lite — движок для мультсериалов «один файл = одна серия»

Studio Lite собирает вертикальное видео (9:16, mp4) из **одного текстового сценария**. В сценарии описаны персонажи, локация, реплики, движения, камера и звуки. Движок сам:

- расставляет тайминги по озвучке;
- рисует 3D-сцену (three.js в headless-Chrome);
- накладывает субтитры с подсветкой слов;
- сводит голос, музыку и звуки;
- кодирует результат в mp4.

В комплекте лежит тестовая серия **`episodes/test_pult`** («Пульт», ~28 с). Открой её рядом с этим файлом: на ней показано почти всё, что здесь описано.

> **Lite-версия.** Это урезанная редакция движка. В ней есть процедурные блочные персонажи, 7 встроенных локаций, позы и эмоции, камеры, субтитры, голос, музыка, звуки, свет, «плёночный» look, кровь, огонь, рэгдолл и двери. **Нет** реалистичных скачанных моделей людей с мокапом, расширенной жестокости (органы и расчленёнка), пространственного 3D-звука и готовых больших карт.

---

## 1. Установка

Нужен **Node.js 18+** (https://nodejs.org). Для рендера на ПК нужно ~2 ГБ свободной памяти.

| Система | Команда |
|---|---|
| Windows | двойной клик по `setup.bat` (или `npm i` в папке) |
| Linux / macOS / WSL | `bash setup.sh` |

`npm i` скачивает three.js, puppeteer (вместе с ним скачается Chrome ~150 МБ), ffmpeg и cannon-es (физику).

Whisper ставить не обязательно (см. раздел 3). Если хочешь точную подсветку слов в субтитрах, выполни `bash setup.sh --whisper`: понадобится Python 3.

---

## 2. Быстрый старт: отрендерить тестовую серию

```bash
node studio.js build test_pult                         # собрать и показать таймлайн
node studio.js preview test_pult 2.5,10,16,24          # кадры -> work/test_pult/preview/sheet.jpg
node studio.js render test_pult --res 540x960 --fps 12 --interp 24
```
Готовое видео появится в `renders/test_pult.mp4`.

На Windows вместо `render` удобнее запускать `render.bat test_pult --res 540x960 --fps 12 --interp 24`: батник сам перезапустит рендер, если браузер упадёт. Для Linux то же самое делает `bash render.sh …`.

Рендер **докачиваемый**. Кадры пишутся кусками по 48 штук в `work/<серия>/chunks`. Если прервать рендер и запустить снова, он продолжит с места остановки. Если поменять сценарий, старые куски сотрутся сами.

---

## 3. Как сделать свою серию (пошагово)

1. Скопируй папку `episodes/test_pult` в `episodes/<имя>`, например `episodes/my1`.
2. Перепиши `episode.mjs`: персонажей, сцены и реплики (формат описан ниже).
3. Выведи текст для озвучки по персонажам:
   ```bash
   node studio.js voice-script my1
   ```
4. **Озвучь реплики.** Каждую реплику сохрани отдельным файлом:
   `episodes/my1/voice/<id_персонажа>/1.mp3, 2.mp3, 3.mp3 …`. Номер файла = номер реплики этого персонажа по порядку в сценарии. Подойдёт любой TTS или свой голос; форматы mp3, wav, m4a и ogg.
5. Разметь озвучку:
   ```bash
   node studio.js prep my1
   ```
   Команда склеит клипы и разложит слова по времени.
   - Без whisper слова распределятся по клипу равномерно (выведется `! whisper unavailable`). Это нормально: границы реплик всё равно точные.
   - Чтобы whisper не запускался совсем, задай `NOWHISPER=1` (Linux) или `set NOWHISPER=1` (Windows).
   - Если поменял текст или клипы, удали `episodes/my1/voice/words.json` и `episodes/my1/voice/<id>.mp3` (склейку) и запусти `prep` заново.
6. Собери серию: `node studio.js build my1`. В консоли будет таймлайн: какая реплика когда идёт и общая длительность.
7. Посмотри превью: `node studio.js preview my1 shots`. Команда снимает по кадру из каждого шота в `work/my1/preview/sheet.jpg`.
   - Можно указать конкретные секунды через запятую: `preview my1 3,7.5,12`.
   - Или только одну сцену: `preview my1 scene2`.
   - Исправь камеры и позиции и повторяй, пока все кадры не станут читаемыми.
8. Запусти рендер: `node studio.js render my1 --res 540x960 --fps 12 --interp 24`.

### Параметры рендера
| Флаг | Что делает |
|---|---|
| `--res 540x960` | разрешение 3D-кадра. 720x1280 красивее, но в ~1.8 раза медленнее |
| `--fps 12 --interp 24` | рендерит 12 к/с и дорисовывает промежуточные кадры до 24 (в 2 раза быстрее, чем честные 24) |
| `--fps 24` | честные 24 к/с без интерполяции |
| `--crf 18` | качество промежуточного видео (меньше — лучше) |
| `--shadowk 0.5 --bloomk 0.25 --noaa` | облегчённые тени, свечение и без сглаживания (для быстрых превью) |
| `--chunk 48` | размер куска при докачке |

Скорость: на 2-ядерном ПК без видеокарты ~1–1.5 с на кадр при 540x960. Минута видео при 12 к/с — это 720 кадров, то есть ~15 минут.

---

## 4. Формат сценария `episode.mjs`

```js
const PI = Math.PI;
export default {
  title: 'Название',
  lang: 'ru',                 // язык для whisper
  fps: 30,
  subtitles: 'plain',         // 'plain' = текст с обводкой (подсвечивается текущее слово)
  transition: 'black',        // переход между сценами: 'flash' | 'black' | 'whoosh' | 'cut'
  hold: .15, gap: .08,        // паузы после и перед репликами (сек)
  look: { exposure: .62, bloom: .18, sat: .95, vig: .35, grain: .04 },   // «плёнка», см. раздел 9

  speakers: {                 // кто говорит
    narr: { narrator: true },                       // закадровый голос (не крутит головы)
    masha: { name: 'МАША', color: '#f783ac' },      // цвет подсветки слов в субтитрах
    robot: { name: 'РОБОТ', color: '#9be', fx: 'radio', volume: 1.1 },   // fx голоса, см. ниже
  },
  music: { file: 'fluffing.mp3', volume: .12, credit: 'Автор — Трек (лицензия)', creditOnScreen: false },
  cast: { masha: { /* внешность, раздел 5 */ } },

  scenes: [{
    set: 'flat', light: 'dusk',                 // локация и свет (раздел 6)
    fills: [['#ffb070', 60, [2, 8, 3]]],        // доп. точечные лампы: [цвет, сила, [x,y,z]]
    cast: {                                      // кто в сцене и где стоит в начале
      masha: { at: 'sofa', rot: 0, pose: 'sit', expr: 'bored', hold: { R: 'phone' }, look: 'none' },
    },
    beats: [                                     // «биты» идут друг за другом
      { say: ['masha', 'Текст реплики'], cam: 'wide', do: [ /* действия */ ] },
      { dur: 2.0, cam: { pos: [0, 4, 8], target: [0, 3, 0], fov: 40 }, do: [ /* ... */ ] },   // бит без реплики
    ],
  }],
};
```

### Бит (beat)
- `say: [id, 'текст']` — реплика. Длительность бита = длина озвучки + `hold`.
- `dur: 2.0` — бит без реплики фиксированной длины.
- `pre: .3` — пауза перед репликой. `hold: 1.0` — пауза после неё (переопределяет общий `hold`).
- `cam` — камера бита (раздел 7).
- `do: [[цель, команда, аргумент, когда, опции], …]` — действия.

### «Когда» (4-й элемент действия)
| Значение | Смысл |
|---|---|
| `0`, `1.5` | секунды от начала бита |
| `'w:3'` | на 3-м слове реплики |
| `'w:пульт'` | на слове, которое начинается с «пульт» |
| `'end'` / `'speechEnd'` | конец бита / конец речи |
| `'w:3+0.2'`, `'end+0.9'` | то же, со сдвигом |

Координаты: **y — вверх**. Пол на y = 0. Взрослый персонаж ростом ~5.3 единицы, голова на высоте ~4.3. `rot` — поворот в радианах: `0` — лицом к +z (обычно к камере `wide`), `PI` — спиной.

---

## 5. Персонажи (`cast`)

Все персонажи процедурные и блочные, моделей не нужно. Цвета задаются в формате `'#rrggbb'`.

| Поле | Значения |
|---|---|
| `skin` | цвет кожи |
| `shirt`, `shirtKind` | цвет и тип верха: `plain` `hoodie` `plaid` `cardigan` `stripes` `uniform` `camo` `labcoat` `scrubs` `nurse` `gown` |
| `stripe` | цвет полосок (для `stripes`) |
| `print`, `printCol`, `printSize` | надпись или символ на груди |
| `sleeve` | длина рукава 0..1 |
| `vest`, `tie`, `badge`, `apronText` | жилет, галстук, бейдж, надпись на фартуке |
| `pants`, `pantsKind` | цвет и тип низа (`jeans` …) |
| `shoe` | цвет обуви |
| `hair`, `hairStyle` | цвет и причёска: `short` `spiky` `long` `ponytail` `bun` `bald` `cap` `ushanka` `helmet` `none` |
| `cap`, `hat`, `bow`, `headband` | цвет кепки, шапки, бантика, повязки |
| `backpack` | `{ color, text }` — рюкзак |
| `scale` | `[x, y, z]`, например ребёнок: `[.82, .78, .82]`, толстяк: `[1.4, 1.1, 1.4]` |
| `face` | `{ mustache, beard, glasses, lashes, lips, freckles, blush, browCol, browW }` |
| `zombie`, `torn` | зомби-вид и рваная одежда (0..2) |
| `model` | натянуть внешность на модель Kenney: `'blocky/character-a'` … `'blocky/character-r'` |

Массовка: `crowd: { count: 8, seed: 3 }` на уровне серии создаёт статистов `c0…c7` со случайной внешностью (`kind: 'zombie'` — зомби).

---

## 6. Локации и свет

| `set` | Что это | Свет (`light`) | Якоря (`at`) | Готовые камеры |
|---|---|---|---|---|
| `living` | гостиная | `day` `night` `dusk` | sofa, sofaFront, standR, door, tableR | wide, wideNight |
| `flat` | квартира с ТВ и окном | `dusk` `night` `day` | sofa, sofaFront, window, window2, door, doorIn, mid, midL, midR | wide, tv, window, door, group |
| `yard` | двор | `day` `golden` | cart, besideCart, front | wide, reveal |
| `street` | улица | `day` `golden` | cart, behindCart, front, east, west, wash, exit … | wide, serve, side, diag, ending … |
| `bunker` | подвал-бункер | `bunker` | stairsTop, stairsBot, center, left, right, shelf0..2 | wide, stairs, shelves |
| `ruins` | разрушенный город | `apoc` `apocDay` `ruinsNight` | home, van1..3, storeDoor, pallet … | est, vanHide, store, road, chase |
| `car` | салон машины | `carPark` `carDrive` `carNight` | driver, front, backL, backR, backM | hood, hoodWide, back |

Полный список якорей и камер с координатами лежит в `engine/setdata.mjs`. Там же можно добавлять свои.

Общие пресеты света: `day`, `golden`, `dusk`, `night`, `apoc`, `apocDay` (в `engine/sets.js`, объект `LIGHTS`).

**Своя локация.** Добавь функцию-строитель в объект `BUILD` в `engine/sets.js`: она получает `scene` и добавляет туда three.js-меши. Потом добавь запись в `SETS` в `engine/setdata.mjs` с полями `lights`, `anchors`, `cams`, `props`. Посмотри, как сделан `bunker`: это самый короткий пример.

---

## 7. Камеры (`cam`)

| Запись | Что делает |
|---|---|
| `'wide'` | готовая камера локации (см. таблицу выше) |
| `'close masha'`, `'medium masha'`, `'full masha'` | автоматический план персонажа |
| `'two papa masha'` | общий план двоих |
| `{ type: 'close', who: 'masha', angle: .3, dist, height, fov }` | авто-план с поправками (`angle` — сдвиг по кругу в радианах) |
| `{ pos: [x,y,z], target: [x,y,z], fov: 40 }` | явная камера: где стоит и куда смотрит |
| `{ pos, target, fov, to: { pos, target, fov } }` | камера плавно едет за время бита (наезд, панорама) |
| `{ type: 'orbit', center, r, height, a0, a1 }` | облёт вокруг точки |
| опции: `handheld: 1.2`, `ease: 'inOut'` | «ручная» тряска и сглаживание движения |

**Совет.** Авто-планы (`close`, `medium`) в тесных комнатах иногда попадают за спину или в другого персонажа. Надёжнее явная камера. Ставь её **со стороны лица** на расстоянии ~5–7 единиц, `target` — на высоту головы, `fov` 34–44. Проверяй каждый шот через `preview`.

---

## 8. Действия (`do`)

### Персонаж: `[id, команда, аргумент, когда]`
| Команда | Пример |
|---|---|
| `pose` | `['papa','pose','shrug',0]` — поза или анимация. Сидя: `'wave@sit'` |
| `expr` | `['papa','expr','shocked','w:2']` — эмоция лица |
| `walk` | `['papa','walk',{ to:'mid', speed:3.4, rot:-.3 }, 0]`. Можно `to:[x,0,z]`, `dur`, `run:true` |
| `turn` | `['papa','turn', PI/2, 0]` или `['papa','turn','masha',0]` |
| `look` | `['masha','look','papa',0]`. Варианты: `'cam'`, `'auto'` (на говорящего), `'none'` |
| `place` | мгновенно переставить: `['papa','place',{ at:[x,0,z], rot }, 0]` |
| `hold` | предмет в руку: `['papa','hold',{ R:'remote', L:null }, 0]` |
| `show` / `hide` | показать или спрятать персонажа |
| `ragdoll` / `getup` | упасть с физикой (`{ v:[x,y,z] }` — толчок) / встать |
| `wound`, `bandage`, `infect` | рана с кровью, бинт, «заражение» (вены и глаза) |
| `eyes` | светящиеся глаза: `{ color:'#7dff5a', size:.2, dur:.3 }` или `false` |

### Звук, экран, камера, мир
| Действие | Пример |
|---|---|
| звук | `['sfx','step',{ vol:.5, count:3, every:.35 }, 0]` — файл `assets/sfx/step.mp3` |
| затемнение | `['fx','fade','out','end+0.5',{ dur:.5 }]` и `['fx','fade','in',0,{ dur:.6 }]` |
| вспышка, глитч, красный удар, ночное видение | `['fx','flash',.1,0]`, `['fx','glitch',1,0,{ dur:.4 }]`, `['fx','red',.6,0,{ dur:.5 }]`, `['fx','nv',3,0]` |
| большой текст | `['fx','big','БАМ!',0]` |
| рывок или тряска камеры | `['cam','punch',.12,0]`, `['cam','shake',.3,0,{ dur:1 }]` |
| кровь | `['set','blood',{ kind:'pool'\|'splat'\|'drip'\|'trail', at:[x,.05,z], r:1 }, 0]` |
| огонь | `['set','fire',{ at:[x,0,z], scale:1 }, 0]` |
| брызги, искры | `['set','spray',{ at, n, dur, speed, dir, color }, 0]`, `['set','sparks',{ at }, 0]` |
| реквизит локации | `['set','show'\|'hide','propName',0]`, `['set','move',{ prop, to, rot, dur },0]`, `['set','shake',{ prop, dur, amt },0]` |

### Позы (`pose`)
`idle stand sit sitPhone sitShow handsHips point shrug taDa raiseR wave cheer clap crossArms think facepalm cry jawDrop give reach holdOut selfie remote show scared freeze run runScared sneak jogPlace carry pant tired crouch crouchLight sitFloor sitHurt kneelLook lieBack sleep wake fall hit dashHit hug pushDoor leanDoor climb crawl aim shoot throwIt flashAim flashSweep zombie zombieOne zombieUp zombieRoar hang dead`

Полный список (~140 штук) — в `engine/anim.js`, объект `CLIPS`.

### Эмоции (`expr`)
`neutral bored happy joy smug angry shocked surprised sad cry nervous star tired wow sleep terrified scared determined proud hungry dazed disgust suspicious pain hurt sick worried grim scream`

### Предметы в руку (`hold`)
`phone remote cup bottle book keys radio bag hammer pan crowbar flashlight torchS rifle plasma syringe pills gauze bill fan selfie`

### Голосовые эффекты (`speakers.<id>.fx`)
- `'tv'`, `'radio'` — звук из динамика.
- `'zombie:0.75'` — понижение тона (число — степень).
- Можно передать свою строку фильтров ffmpeg, которая заканчивается запятой.

---

## 9. Картинка («look»)

`look` задаётся на уровне серии или отдельно для сцены (`scenes[i].look`).

| Поле | Что делает | Типично |
|---|---|---|
| `exposure` | яркость | 0.5–1.4 |
| `bloom`, `bloomT` | свечение ярких мест и его порог | 0.15–0.6, 0.8–0.95 |
| `sat`, `contrast`, `lift` | насыщенность, контраст, подъём теней | |
| `vig`, `grain`, `ca` | виньетка, зерно, хроматическая аберрация | |
| `tint` | цветовой оттенок `[r,g,b]` | `[1, .97, .92]` — тёплый |
| `tone` | тон-маппинг `'agx'` или `'neutral'` | по умолчанию ACES |
| `flicker` | мерцание кадра (старая камера) | `true` |

Если кадр пересвечен, уменьши `exposure` и `bloom`. Если тёмный, увеличь `exposure` или добавь `fills` (лампы). Яркость ламп в `fills` — 30–90.

---

## 10. Свои звуки, музыка, текстуры

- **Звуки:** положи `имя.mp3` в `assets/sfx/` и вызывай `['sfx','имя',…]`. В комплекте есть: step, step2, door_open, door_close, creak, cloth, thud, punch, metal, glass, plank, pop, swoosh, whoosh, click, ding, error, question, tick, bell, coins, book, pour.
- **Музыка:** `assets/music/*.mp3`, подключается через `music: { file, volume }`. Можно несколько треков по времени: `music: [{ file, at, start, dur, volume, fadeIn, fadeOut }, …]`.
- **Текстуры PBR:** `assets/tex/<имя>_c.jpg`, `_n.jpg`, `_r.jpg` (цвет, нормали, шероховатость). Бесплатные CC0-текстуры есть на ambientcg.com. Подключаются в коде локаций через `pbr('имя', [повтор_x, повтор_y])`.
- **Шрифт субтитров:** Inter (`assets/fonts`).

---

## 11. Частые проблемы

| Проблема | Что делать |
|---|---|
| `no sfx имя` | нет файла `assets/sfx/имя.mp3` |
| `unknown set` | опечатка в `set` или локация не добавлена в `setdata.mjs` |
| `actor "x" not in scene N cast` | персонажа используют в действии, но не добавили в `cast` этой сцены |
| Камера смотрит в затылок | поставь явную камеру с другой стороны (раздел 7) или поверни персонажа (`turn`) |
| Персонаж смотрит вбок на крупном плане | `['id','look','none',0]` |
| Рендер падает или зависает | запусти через `render.bat` / `render.sh`: он продолжит с последнего куска. Закрой лишние программы — нужно ~2 ГБ RAM |
| Слишком долго | `--res 432x768`, `--fps 12 --interp 24`, `--shadowk 0.5` |
| Поменял озвучку, а тайминги старые | удали `voice/words.json` и склейки `voice/<id>.mp3`, потом снова `prep` |

---

## 12. Структура папок

```
studio.js            CLI: voice-script, prep, build, preview, frames, render, audio
engine/              движок (three.js, работает в headless-Chrome)
  runtime.js           собирает и рисует любой момент t (детерминированно)
  lib.js               фабрика персонажей, лица
  anim.js              позы (CLIPS) и эмоции (EXPR)
  props.js             предметы в руках и реквизит
  sets.js, setdata.mjs локации, свет, якоря, камеры
  overlay.js           субтитры и экранные надписи
  fx.js, gore.js, physics.js   плёнка, текстуры, кровь, огонь, рэгдолл, двери
assets/              fonts, sfx, music, tex, models (Kenney Blocky Characters)
episodes/<серия>/    episode.mjs + voice/
work/                промежуточные файлы (можно удалять)
renders/             готовые mp4
```

---

## 13. Лицензии ресурсов

- **Код движка:** использование разрешено для личных проектов. Распространять дальше без разрешения автора нельзя.
- **three.js, puppeteer, cannon-es** — MIT; **ffmpeg-static** — GPL (бинарник ffmpeg).
- **Шрифт Inter** — SIL Open Font License (`assets/fonts/Inter-LICENSE.txt`).
- **Звуки:** Kenney.nl (Impact Sounds, Interface Sounds, RPG Audio) — CC0.
- **Модели:** Kenney Blocky Characters — CC0. **Текстуры:** ambientCG — CC0.
- **Музыка:** Kevin MacLeod (incompetech.com) — «Fluffing a Duck», «Investigations» — **CC BY 4.0**. Если используешь эти треки в видео, укажи автора в описании.
- **Голоса тестовой серии** сгенерированы TTS и даны только как пример.
