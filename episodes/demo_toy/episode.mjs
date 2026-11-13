// Оригинальный пример с новыми процедурными персонажами и кухней.
// Здесь использованы три голосовых клипа из присланной исходной серии «Пульт».
// Ни изображения, ни звук из ролика-референса в проект не включены.
export default {
  title: 'Пульт на кухне', lang: 'ru', fps: 24, subtitles: 'plain',
  transition: 'cut', gap: .05, hold: .18, handheld: .35,
  look: { exposure: 1.0, bloom: 0, bloomT: .9, sat: 1.07, contrast: 1.02, vig: .06, grain: 0, ca: 0, tint: [1, 1, 1] },
  music: { file: 'fluffing.mp3', volume: .075, credit: 'Kevin MacLeod — Fluffing a Duck (CC BY 4.0)', creditOnScreen: false },
  speakers: { masha: { name: 'МАША', color: '#ef6c93' }, papa: { name: 'ПАПА', color: '#64a9e8' } },
  cast: {
    masha: { style: 'toy', skin: '#ffd62c', hair: '#714529', hairStyle: 'ponytail', shirt: '#569ef4', pants: '#79c94f', scale: [.82,.82,.82], face: { lashes: true } },
    papa: { style: 'toy', skin: '#ffd62c', hair: '#553524', hairStyle: 'short', shirt: '#ed9949', pants: '#3869a9', face: {} },
    grandma: { style: 'toy', skin: '#ffdb61', hair: '#e9e7e3', hairStyle: 'bun', shirt: '#bc99da', pants: '#a47bc1', apron: true, face: { glasses: true } },
  },
  scenes: [
    { set: 'toy_kitchen', light: 'toyDay',
      cast: {
        masha: { at: [-2.0,0,1.8], rot: 0, expr: 'delighted', pose: 'taste', hold: { R: 'toyCookie' }, look: 'none' },
        papa: { at: [1.3,0,1.4], rot: 0, expr: 'neutral', pose: 'stand', hold: { R: 'toyRemote' }, look: 'none' },
        grandma: { at: [4.9,0,-.7], rot: 0, expr: 'happy', pose: 'stand', apron: true, look: 'none' },
      },
      beats: [
        { dur: 1.8, cam: { pos: [-3.3,5.5,18], target: [-3.3,3.45,-3], fov: 45 },
          do: [ ['set','val',{prop:'fridgeDoor',key:'open',to:1,dur:.7},.15], ['sfx','door_open',{vol:.38},.15], ['masha','pose','toyTalk',.75] ] },
        { say: ['masha','Пап… а что это у тебя в руке?'], cam: { type: 'close', who: 'masha', dist: 6.2, angle: -.08, push: .05 },
          do: [ ['masha','hold',{R:null},0], ['masha','expr','suspicious',0], ['masha','pose','toyReach',.3], ['sfx','question',{vol:.25},.7] ] },
        { dur: 1.3, cam: { type:'medium', who:'papa', dist: 9.4, fov: 42, angle: .04, push:.05 },
          do: [ ['papa','pose','show',0], ['papa','expr','shocked',.15], ['cam','punch',.08,.15], ['sfx','ding',{vol:.33},.15] ] },
        { say: ['papa','Это не я. Он сам туда запрыгнул.'], cam: { type:'close', who:'papa', dist:6.5, angle:.04, push:.05 },
          do: [ ['papa','expr','nervous',0], ['papa','pose','shrug',0] ] },
        { dur: 1.65, cam: { type:'close', who:'grandma', dist:6.4, angle:-.05, push:.08 },
          do: [ ['grandma','pose','guard',0], ['grandma','expr','stern',0], ['grandma','expr','delighted',.9], ['sfx','pop',{vol:.20},.9] ] },
        { dur: 2.6, cam: { pos:[2.45,5.0,8.8], target:[2.45,4.55,-2.75], fov:39 },
          do: [ ['set','val',{prop:'plateStack',key:'height',to:12,dur:2.1},.1], ['sfx','glass',{vol:.25,count:3,every:.55},.45], ['grandma','expr','dizzy',.7], ['grandma','pose','dizzy',.7] ] },
        { say: ['masha','Ну ты даёшь! Садись, уже начинается.'], cam: { type:'close', who:'masha', dist:6.5, angle:0, push:.06 },
          do: [ ['papa','hold',{R:null},0], ['masha','hold',{L:'toyRemote'},0], ['masha','expr','delighted',0], ['masha','pose','toyTalk',0], ['set','val',{prop:'fridgeDoor',key:'open',to:0,dur:.5},.4] ] },
        { dur: 1.8, cam: { pos:[1.5,5.7,22], target:[1.5,3.6,-1.8], fov:48 },
          do: [ ['papa','expr','happy',0], ['papa','pose','wave',0], ['grandma','expr','joy',0], ['grandma','pose','excited',0], ['masha','pose','excited',0] ] },
      ],
    },
  ],
};
