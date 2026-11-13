// Shared set metadata (used by compiler in Node AND by the browser runtime).
// anchors: named floor positions [x,y,z]; cams: named camera presets.
export const SETS = {
  toy_kitchen: {
    lights: ['toyDay', 'day'],
    anchors: { center: [0, 0, 1], kid: [-2.2, 0, 1.0], parent: [2.2, 0, 1.0], grandma: [1.0, 0, -.4], fridge: [-6.2, 0, -2.6], table: [0, 0, -.3], stove: [6.5, 0, -2.5] },
    cams: {
      wide: { pos: [0, 5.9, 18.5], target: [0, 3.6, -2.8], fov: 46 },
      table: { pos: [.4, 6.0, 10.5], target: [.6, 3.0, -2.8], fov: 43 },
      fridge: { pos: [-4.8, 5.4, 7.8], target: [-6.8, 3.3, -5.0], fov: 43 },
      window: { pos: [2.5, 5.8, 8.8], target: [3.5, 4.6, -6.3], fov: 43 },
    },
    props: ['fridge', 'fridgeDoor', 'table', 'tableFood', 'plateStack', 'cabinet'],
  },
  zone_airfield: {
    lights: ['zoneNight', 'apoc', 'apocDay', 'day'],
    anchors: { center: [0, 0, 2], hero: [2, 0, 4], companion: [-1.5, 0, 3], wreck: [-5, 0, -5], hangar: [0, 0, -25], barrels: [8, 0, -10], entrance: [0, 0, -20], threat: [5, 0, -7] },
    cams: {
      wide: { pos: [4, 7, 21], target: [-2, 3.2, -8], fov: 43, to: { pos: [3, 6.5, 18] } },
      wreck: { pos: [-1, 6, 9], target: [-5, 2.8, -8], fov: 42 },
      entrance: { pos: [0, 6, -11], target: [0, 4, -30], fov: 42 },
    },
    props: ['wreck', 'rotor', 'barrels'],
  },
  zone_hangar: {
    lights: ['zoneInterior', 'bunker'],
    anchors: { center: [0, 0, 1], hero: [-2, 0, 4], companion: [1.5, 0, 3], threat: [0, 0, -8], door: [0, 0, -18], barrels: [-9, 0, -12], aircraft: [6, 0, -10] },
    cams: {
      wide: { pos: [0, 6.5, 19], target: [0, 3.5, -8], fov: 43, to: { pos: [0, 6, 16] } },
      doorway: { pos: [-5, 5.2, 4], target: [0, 4, -20], fov: 44 },
      aircraft: { pos: [3, 6.5, 7], target: [6, 3.3, -10], fov: 44 },
    },
    props: ['door', 'barrels', 'aircraft', 'propeller'],
  },
  zone_shelter: {
    lights: ['zoneInterior', 'bunker'],
    anchors: { center: [0, 0, -1], hero: [-1, 0, 1], companion: [2, 0, 1], lockers: [-6, 0, -6], map: [6, 0, -6], radio: [-5, 0, -2] },
    cams: {
      wide: { pos: [0, 5.8, 14], target: [0, 3.5, -4], fov: 43 },
      map: { pos: [7.9, 4.5, -2.2], target: [7.9, 4.0, -9.7], fov: 40 },
      lockers: { pos: [-7, 5, 6], target: [-5, 3.4, -8], fov: 43 },
    },
    props: ['lockers', 'map', 'radio'],
  },
  living: {
    lights: ['day', 'night'],
    anchors: {
      sofa: [0, 0, -4.35],        // seated position (use with pose 'sit*')
      sofaFront: [0, 0, -2.9],    // standing in front of the sofa
      standR: [4.2, 0, -3.1],
      door: [13, 0, -0.5],        // behind the doorway in the right wall
      tableR: [3.5, 0, -0.4],
    },
    cams: {
      wide: { pos: [1.4, 5.2, 15.5], target: [1.1, 3.0, -3.2], fov: 45, to: { pos: [1.1, 5.0, 14.0] } },
      wideNight: { pos: [-1.2, 5.6, 14.5], target: [1.0, 2.8, -2.5], fov: 45, to: { pos: [-.6, 5.2, 12.6] } },
    },
    props: ['moneyTable'],
  },
  yard: {
    lights: ['day'],
    anchors: { cart: [-0.3, 0, -1.6], besideCart: [2.5, 0, -0.6], front: [2.6, 0, 0.9] },
    cams: {
      wide: { pos: [-6.5, 6.5, 13], target: [0.3, 2.6, -1.4], fov: 45, to: { pos: [-4.5, 6.0, 11.5] } },
      reveal: { pos: [3.6, 4.6, 13.5], target: [2.2, 3.5, -0.6], fov: 45, to: { pos: [3.3, 4.5, 12.4] } },
    },
    props: ['cart'],
  },
  flat: {
    lights: ['dusk', 'night', 'day'],
    anchors: { sofa: [0, 0, -4.35], sofaFront: [0, 0, -2.9], window: [-6.5, 0, -5.0], window2: [-4.2, 0, -4.7], door: [13.5, 0, -0.5], doorIn: [8.4, 0, -0.4], mid: [3.2, 0, -1.8], midL: [-2.6, 0, -1.8], midR: [5.6, 0, -1.2], tvFront: [-7.4, 0, -1.4] },
    cams: {
      wide: { pos: [-1.2, 5.6, 14.5], target: [1.0, 3.2, -2.5], fov: 45, to: { pos: [-.6, 5.3, 12.8] } },
      tv: { pos: [-3.4, 4.6, -1.4], target: [-10.8, 4.55, -1.4], fov: 44, to: { pos: [-4.6, 4.6, -1.4] } },
      window: { pos: [-2.4, 5.3, 4.0], target: [-6.0, 4.4, -6.0], fov: 42, to: { pos: [-2.9, 5.2, 3.0] } },
      door: { pos: [1.0, 5.0, 7.5], target: [10.5, 3.6, -0.5], fov: 40, to: { pos: [1.8, 5.0, 6.6] } },
      group: { pos: [0.5, 5.4, 10.5], target: [3.5, 3.6, -1.2], fov: 44, to: { pos: [0.8, 5.3, 9.6] } },
    },
    props: ['tvScreen', 'curtainClosed', 'boards', 'frontDoor', 'barricade'],
  },
  bunker: {
    lights: ['bunker'],
    anchors: { stairsTop: [12.2, 4.34, -1.3], stairsBot: [5.4, 0, -1.3], center: [0, 0, -1.4], left: [-3.2, 0, -1.2], right: [3.0, 0, -1.0], shelf0: [-6.2, 0, -3.5], shelf1: [-1.4, 0, -3.5], shelf2: [3.4, 0, -3.5] },
    cams: {
      wide: { pos: [0.5, 6.0, 14], target: [0.5, 4.0, -3], fov: 46, to: { pos: [0.5, 5.6, 12.4] } },
      stairs: { pos: [1.5, 5.2, 9.5], target: [9.0, 4.2, -1.3], fov: 42 },
      shelves: { pos: [-7.5, 4.6, 3.8], target: [-6.2, 3.6, -5.2], fov: 44, to: { pos: [3.8, 4.6, 3.8], target: [3.4, 3.6, -5.2] }, ease: 'inOut' },
    },
    props: [],
  },
  ruins: {
    lights: ['apoc', 'apocDay', 'ruinsNight'],
    anchors: { home: [-8, 0, 5], van1: [-3.8, 0, -7.6], van2: [-2.2, 0, -7.3], van3: [-0.6, 0, -7.6], storeDoor: [6, 0, -21.2], fatSpot: [6, 0, -21.6], pallet: [11.2, 0, -19.0], palletSide: [9.6, 0, -19.2], runnerSpot: [15.5, 0, -16.0], postStart: [-10, 0, 1.6], postEnd: [14, 0, 3.0], vovaStart: [-13, 0, 1.4], roadMid: [2, 0, -14] },
    cams: {
      est: { pos: [-9, 7.5, 14], target: [3, 2.5, -16], fov: 46, to: { pos: [-7.5, 7.0, 12] } },
      windowPOV: { pos: [-2, 15.5, 13], target: [0, 0, -0.5], fov: 44, to: { pos: [-1.5, 15, 12] } },
      vanHide: { pos: [-7.0, 5.0, 0.2], target: [-1.6, 3.8, -9], fov: 44, to: { pos: [-6.4, 4.9, -0.6] } },
      store: { pos: [2.5, 5.2, -8.5], target: [8.0, 2.6, -21.5], fov: 44, to: { pos: [3.0, 5.0, -9.5] } },
      road: { pos: [-5, 6.5, -1], target: [6, 2.5, -18], fov: 46 },
      chase: { pos: [3.5, 4.8, -3.5], target: [2, 3.0, -16], fov: 46 },
    },
    props: ['van', 'phoneVan', 'waterPack', 'storeSign', 'zhiga'],
  },
  car: {
    lights: ['carPark', 'carDrive', 'carNight'],
    anchors: { driver: [2.2, 0, 0], front: [-2.2, 0, 0], backL: [2.6, 0, -4.4], backR: [-2.6, 0, -4.4], backM: [0, 0, -4.4] },
    cams: {
      hood: { pos: [0, 5.6, 17.5], target: [0, 4.4, -2.0], fov: 44, to: { pos: [0, 5.5, 16.2] } },
      hoodWide: { pos: [-1.5, 6.4, 21], target: [0, 4.0, -2.5], fov: 46 },
      back: { pos: [0, 6.0, -1.5], target: [0, 4.6, -4.4], fov: 52 },
    },
    props: ['drive', 'wheel', 'fresh'],
  },
  street: {
    lights: ['day', 'golden'],
    anchors: {
      cart: [0, 0, -0.4], behindCart: [0, 0, -1.9], front: [2.5, 0, 0.9],
      east: [9, 0, 1.0], west: [-10, 0, 2.0], blogSpot: [-1.4, 0, 2.1],
      wash: [-3.6, 0, -1.9], exit: [3.4, 0, -8.5],
      dadCart: [-9, 0, -0.4], dadBehind: [-9, 0, -1.9], dadFront: [-6.5, 0, 1.6], dadExit: [-22, 0, 2.5],
    },
    cams: {
      wide: { pos: [-3.5, 5.2, 15.5], target: [2.2, 2.8, -0.8], fov: 45, to: { pos: [-2.5, 5.2, 13.5] } },
      serve: { pos: [-2.6, 4.6, 10.5], target: [1.2, 3.8, -0.4], fov: 42, to: { pos: [-2.2, 4.5, 9.6] } },
      side: { pos: [-5.8, 4.2, 3.2], target: [0, 3.9, -1.5], fov: 44 },
      blogWide: { pos: [-6, 5.2, 15], target: [-4.5, 3.2, 0.3], fov: 45, to: { pos: [-4.5, 5.2, 13.5], target: [-1.0, 3.2, 0.3] } },
      cheer: { pos: [3.5, 7.5, 17], target: [5, 2.8, -0.5], fov: 48, to: { pos: [4.5, 8.5, 19] } },
      ending: { pos: [-6.2, 5.4, 13.5], target: [-2.5, 3.2, -1.2], fov: 45, to: { pos: [-5.6, 5.4, 12.2] } },
      diag: { pos: [9.5, 6.4, 11], target: [-4.5, 3.0, -1.0], fov: 46, to: { pos: [8.5, 6.2, 10] } },
      diagRev: { pos: [-19, 6.4, 11], target: [-2.5, 3.0, -1.0], fov: 46, to: { pos: [-18, 6.2, 10] } },
      dadReveal: { pos: [5, 5.4, 13], target: [0.5, 3.0, -1.0], fov: 45, to: { pos: [-6.5, 5.4, 12.5], target: [-8.5, 3.0, -1.0] }, ease: 'inOut' },
      queuePan: { pos: [28, 6.5, 17], target: [25, 2.8, 0], fov: 45, to: { pos: [3.0, 5.6, 15], target: [4.0, 2.8, 0] }, ease: 'inOut' },
    },
    props: ['cart', 'washStation'],
  },
};
