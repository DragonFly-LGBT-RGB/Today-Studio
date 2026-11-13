// Pose clips + facial expression presets.
// A clip is f(t, T) -> partial pose. t = seconds since the pose started, T = absolute time.
// Pose fields: aL,aR,lL,lR = [rx,ry,rz] limb rotations; hd = [pitch,yaw,roll]; y = root lift; lean = root pitch; talk = allow talk gestures.
const S = Math.sin, PI = Math.PI;
const sit = { lL: [-PI / 2, 0, .04], lR: [-PI / 2, 0, -.04], y: .45 };
const ck = (t, a, d) => Math.max(0, Math.min(1, (t - a) / Math.max(.001, d))); // ramp 0->1 from a to a+d
const eo = k => 1 - Math.pow(1 - k, 3);                                        // ease-out cubic

export const CLIPS = {
  // Cartoony, deliberately exaggerated gestures for the optional toy style.
  toyTalk: (t, T) => ({ aL: [-.5 + S(T * 3) * .16, 0, .26], aR: [-.8 + S(T * 3.5) * .20, 0, -.32], hd: [S(T * 2.5) * .06, 0, S(T * 1.6) * .10], talk: true }),
  toyReach: (t, T) => ({ aL: [-.3, 0, .12], aR: [-1.8 + S(T * 3) * .07, 0, -.15], lean: .12, hd: [.08, 0, -.08], talk: false }),
  taste: (t, T) => ({ aL: [-.2, 0, .1], aR: [-2.35 + S(T * 3) * .12, 0, .38], hd: [-.08, 0, .1], talk: false }),
  guard: (t, T) => ({ aL: [-1.35, 0, -.45], aR: [-1.35, 0, .45], hd: [.06, 0, -.1], talk: false }),
  excited: (t, T) => ({ aL: [-.3, 0, 2.35 + S(T * 7) * .13], aR: [-.3, 0, -2.35 - S(T * 7) * .13], y: Math.abs(S(T * 5)) * .23, hd: [0, 0, S(T * 4) * .1], talk: false }),
  dizzy: (t, T) => ({ aL: [-.3, 0, .55], aR: [-.3, 0, -.55], lean: S(T * 3) * .12, hd: [.05, S(T * 2) * .1, S(T * 3) * .25], talk: false }),
  idle: (t, T) => ({ aL: [S(T * 1.3) * .03, 0, .07], aR: [S(T * 1.3 + 1) * .03, 0, -.07], talk: true }),
  sit: (t, T) => ({ ...sit, aL: [-.35, 0, .12], aR: [-.35, 0, -.12], talk: true }),
  sitPhone: (t, T) => ({ ...sit, aL: [-.5, 0, .2], aR: [-1.25 + S(T * 2) * .03, 0, .15], hd: [.28, 0, 0] }),
  sitCount: (t, T) => ({ ...sit, aL: [-1.05, 0, -.2], aR: [-1.15 + Math.abs(S(T * 7)) * .2, 0, .25], hd: [.32, 0, 0] }),
  sitShow: (t, T) => ({ ...sit, aL: [-.4, 0, .15], aR: [-1.5, 0, .1], talk: false }),
  stand: () => ({ aL: [0, 0, .05], aR: [0, 0, -.05], talk: true }),
  handsHips: (t, T) => ({ aL: [.15, 0, .55], aR: [.15, 0, -.55], talk: false }),
  point: (t, T) => ({ aL: [0, 0, .08], aR: [-1.55 + S(T * 6) * .05, 0, -.05], hd: [-.05, 0, 0] }),
  shrug: (t, T) => ({ aL: [-.35, 0, .7], aR: [-.35, 0, -.7], hd: [0, 0, .12] }),
  taDa: (t, T) => ({ aL: [-.2, 0, 2.3], aR: [-.2, 0, -2.3], y: Math.max(0, S(Math.min(t, .4) / .4 * PI)) * .35 }),
  raiseR: (t, T) => ({ aL: [0, 0, .08], aR: [-.15, 0, -2.85 + S(T * 9) * .08] }),
  wave: (t, T) => ({ aL: [0, 0, .08], aR: [-.1, 0, -2.6 + S(T * 10) * .3] }),
  cheer: (t, T) => ({ aL: [-.1, 0, 2.6 + S(T * 9) * .15], aR: [-.1, 0, -2.6 - S(T * 9) * .15], y: Math.abs(S(T * 6)) * .35 }),
  clap: (t, T) => { const k = Math.abs(S(T * 10)); return { aL: [-1.25, 0, -.15 - k * .25], aR: [-1.25, 0, .15 + k * .25], y: Math.abs(S(T * 5)) * .1 }; },
  hammer: (t, T) => { const k = Math.pow(Math.abs(S(T * 7)), .6); return { aL: [-.9, 0, -.25], aR: [-.8 - k * 1.5, 0, .05], hd: [.3, 0, 0], lean: .12 }; },
  admire: (t, T) => ({ aL: [.15, 0, .55], aR: [.15, 0, -.55], hd: [-.08, 0, .12 + S(T * 2) * .04] }),
  serveFast: (t, T) => { const k = S(T * 9); return { aL: [-1.0 - Math.max(0, -k) * .6, 0, -.1], aR: [-1.0 - Math.max(0, k) * .6, 0, .1], lean: .08 }; },
  crossArms: () => ({ aL: [-1.25, -.2, -.85], aR: [-1.15, .2, .85], talk: false }),
  humble: (t, T) => ({ aL: [-.45, 0, -.3], aR: [-.45, 0, .3], hd: [.3, 0, 0], lean: .06 }),
  sip: (t, T) => ({ aL: [0, 0, .08], aR: [-2.05, 0, .38], hd: [-.18, 0, 0] }),
  give: (t, T) => ({ aL: [0, 0, .06], aR: [-1.4, 0, .05], lean: .05 }),
  reach: (t, T) => ({ aL: [0, 0, .06], aR: [-1.35, 0, .1], lean: .1 }),
  holdOut: (t, T) => ({ aL: [-1.3, 0, -.05], aR: [-1.3, 0, .05], talk: false }),
  wash: (t, T) => ({ aL: [-.95 + S(T * 8) * .15, 0, -.2], aR: [-.95 + S(T * 8 + 2) * .15, 0, .2], hd: [.35, 0, 0], lean: .12 }),
  selfie: (t, T) => ({ aL: [.1, 0, .25], aR: [-2.25, 0, -.35], hd: [-.1, 0, 0] }),
  selfieLike: (t, T) => ({ aL: [-1.3, 0, -.1], aR: [-2.25, 0, -.35], hd: [-.1, 0, .1], y: Math.abs(S(T * 5)) * .1 }),
  jawDrop: (t, T) => ({ aL: [-.25, 0, .35], aR: [-.25, 0, -.35], lean: -.1, hd: [-.1, 0, 0] }),
  pour: (t, T) => ({ aL: [-.5, 0, -.15], aR: [-1.3, 0, .35], hd: [.3, 0, 0], lean: .05 }),
  threeMore: (t, T) => ({ aL: [0, 0, .08], aR: [-.1, 0, -2.75], y: Math.abs(S(T * 6)) * .2 }),
  pushShades: (t, T) => ({ aL: [0, 0, .08], aR: [-2.75, 0, .5] }),
  cry: (t, T) => ({ aL: [-2.3, 0, -.45], aR: [-2.3, 0, .45], hd: [.25, 0, S(T * 9) * .05], y: Math.abs(S(T * 8)) * .04 }),
  facepalm: () => ({ aL: [0, 0, .06], aR: [-2.5, 0, .55], hd: [.25, 0, 0] }),
  think: (t, T) => ({ aL: [-1.0, 0, -.5], aR: [-2.2, 0, .5], hd: [0, 0, .12] }),
  // ---- storytime: a narrator telling a story straight into the camera ----
  // Any of these also works seated as 'stTell@sit' etc. (see clipPose).
  // Baseline "so, here's what happened" loop; the leading hand swaps every ~2.7 s.
  stTell: (t, T) => {
    const w = S(T * 1.15) * .5 + .5, k = .5 + .5 * S(T * 2.3), up = -.85 - k * .5;
    return { aL: [up * (.45 + .55 * w), 0, .26 + k * .16 * w], aR: [up * (1 - .55 * w), 0, -.26 - k * .16 * (1 - w)],
      hd: [.03 + k * .05, (w - .5) * .22, S(T * 1.7) * .07], lean: .02 + k * .04, talk: true };
  },
  // Emphasis chop: the palm snaps down on each stressed word. Fire it from a 'w:' beat reference.
  stChop: (t, T) => { const k = Math.pow(Math.max(0, S(T * 5.1)), 4); return { aL: [-.4, 0, .22], aR: [-1.7 + k * .62, -.18, -.28 - k * .22], hd: [.04 + k * .09, -.08, .03], lean: .03 + k * .06, talk: true }; },
  // "Picture this": both palms up, framing an imaginary scene in the air.
  stFrame: (t, T) => { const k = S(T * 1.5) * .5 + .5; return { aL: [-1.3 - k * .12, .3, .68], aR: [-1.3 - k * .12, -.3, -.68], hd: [-.07, 0, .04 * k], lean: -.03, talk: true }; },
  // Air quotes: the hands curl twice per beat.
  stQuotes: (t, T) => { const k = Math.abs(S(T * 5.5)); return { aL: [-1.55 - k * .14, .1, .46], aR: [-1.55 - k * .14, -.1, -.46], hd: [-.05, 0, .05], y: k * .03, talk: false }; },
  // "And then…" — leans in, drops the voice, one hand cups the side of the mouth.
  stWhisper: (t, T) => { const k = eo(ck(t, 0, .35)); return { aL: [-.15, 0, .2], aR: [-2.0 * k, .18 * k, .34 * k], hd: [.07 * k, .14 * k, -.1 * k], lean: .17 * k, talk: true }; },
  // Double take: the head whips away, then snaps back and the whole body recoils.
  stDoubleTake: (t, T) => {
    const k = eo(ck(t, 0, .17)) - eo(ck(t, .3, .16)), r = t > .3 ? Math.exp(-(t - .3) * 7) : 0;
    return { aL: [-.3 - k * .45, 0, .28 + k * .22], aR: [-.3 - k * .45, 0, -.28 - k * .22],
      hd: [.06 + r * .12, k * .95 - r * .06, -k * .18], lean: -.05 * k - r * .12, y: -.06 * k - r * .05, talk: false };
  },
  // Slow "no, no, no": head shake with both palms pushed out.
  stNoNo: (t, T) => ({ aL: [-1.05, 0, .48], aR: [-1.05, 0, -.48], hd: [.03, S(T * 4.2) * .33, S(T * 2.1) * .04], talk: true }),
  // Slow knowing nod, hands folded low.
  stNod: (t, T) => ({ aL: [-.7, .1, .3], aR: [-.7, -.1, -.3], hd: [.15 + S(T * 3.1) * .18, 0, S(T * 1.55) * .03], talk: true }),
  // Contemptuous eye roll; pair with the animated 'roll' expression.
  stRoll: (t, T) => { const k = eo(ck(t, 0, .4)); return { aL: [-.15, 0, .3], aR: [-.15, 0, -.3], hd: [-.07 * k, .12 * k, .11 * k], lean: -.03 * k, talk: false }; },
  // Cringe: shoulders hug in and the body shivers, then slowly settles.
  stCringe: (t, T) => { const d = Math.exp(-Math.max(0, t - .9) * 1.9), k = S(T * 21) * d; return { aL: [-1.25 - d * .1, .22, -.62], aR: [-1.2 - d * .1, -.22, .62], hd: [.13 + k * .05, k * .07, k * .05], lean: -.05 * d, y: k * .04, talk: false }; },
  // Rage: flailing arms and a stomp on every other beat.
  stRage: (t, T) => { const k = S(T * 10.5); return { aL: [-1.5 + k * .85, 0, .45 + k * .45], aR: [-1.5 - k * .85, 0, -.45 - k * .45], lL: [-Math.max(0, k) * .5, 0, .06], lR: [-Math.max(0, -k) * .5, 0, -.06], y: Math.abs(k) * .09, hd: [.1 + S(T * 13) * .07, S(T * 3.1) * .12, S(T * 9) * .07], lean: .05, talk: false }; },
  // Despair: head buried in both hands, rocking.
  stDespair: (t, T) => ({ aL: [-2.15, .3, -.48], aR: [-2.15, -.3, .48], hd: [.34 + S(T * 1.5) * .04, 0, S(T * 1.1) * .03], lean: .1, talk: false }),
  // Hype shimmy for good news.
  stShimmy: (t, T) => { const k = S(T * 9); return { aL: [-.2, 0, .5 + k * .28], aR: [-.2, 0, -.5 - k * .28], y: Math.abs(S(T * 4.5)) * .12, hd: [0, k * .13, k * .09], lean: -.02, talk: true }; },
  // Gasp: hands fly to the cheeks and the torso recoils, then the shock slowly ebbs.
  stGasp: (t, T) => {
    const k = eo(ck(t, 0, .16)) * (1 - .4 * eo(ck(t, 1.1, .9))), r = t > .16 ? Math.exp(-(t - .16) * 4) : 0;
    return { aL: [-1.95 * k, 0, -.48 * k], aR: [-1.95 * k, 0, .48 * k], hd: [-.13 * k - r * .06, 0, 0], lean: -.1 * k - r * .08, y: -.05 * k, talk: false };
  },
  // Wipes the brow — "phew".
  stWipe: (t, T) => { const k = eo(ck(t, 0, .22)), sw = S(ck(t, .18, .5) * PI); return { aL: [-.2, 0, .15], aR: [-2.35 * k, .2 * k, (.48 - sw * .5) * k], hd: [(-.13 + sw * .26) * k, 0, .06 * k], lean: -.05 * k, talk: false }; },
  // Leans back with a hand behind the head: "so what do you think happened next?"
  stLeanBack: (t, T) => ({ aL: [-.18, 0, .16], aR: [-2.4, -.55, -.9], hd: [-.16 + S(T * 1.3) * .04, .12, .06], lean: -.13, talk: true }),
  // Points at the viewer with a small lunge.
  stPointCam: (t, T) => { const k = eo(ck(t, 0, .2)); return { aL: [-.08, 0, .12], aR: [-1.62 * k, -.14 * k, -.06 * k], hd: [-.05 * k, 0, 0], lean: .13 * k, y: -.04 * k, talk: false }; },
  // Counts the points of the story on an open palm.
  stCount: (t, T) => { const k = Math.max(0, S(T * 5.4)); return { aL: [-1.15, .22, -.3], aR: [-1.5 + k * .28, 0, .24], hd: [.27, -.09, .03], lean: .05, talk: true }; },
  // Deadpan stare straight down the lens, arms limp. Pair with look 'cam'.
  stStare: (t, T) => ({ aL: [-.04, 0, .06], aR: [-.04, 0, -.06], hd: [0, 0, S(T * .75) * .02], lean: 0, talk: false }),
  // Awkward silence: tiny weight shifts and a frozen half-smile.
  stAwkward: (t, T) => ({ aL: [-.42, 0, .28], aR: [-.42, 0, -.28], hd: [.05, S(T * .68) * .2, .07], lean: S(T * .9) * .03, talk: false }),
  // ---- zombies ----
  zombie: (t, T) => ({ aL: [-1.45 + S(T * 1.7) * .1, 0, -.06], aR: [-1.3 + S(T * 1.4 + 1) * .12, 0, .1], hd: [.15 + S(T * 1.1) * .06, S(T * .7) * .1, .28 + S(T * .9) * .1], lean: .1, talk: false }),
  zombieOne: (t, T) => ({ aL: [-.1 + S(T * 1.3) * .05, 0, .12], aR: [-1.4 + S(T * 1.5 + 1) * .12, 0, .1], hd: [.2, 0, -.3 + S(T * .9) * .08], lean: .12, talk: false }),
  // hanging from a ledge/plank by both hands (legs kick), and the meme T-pose (bind-pose arms straight out)
  hang: (t, T) => ({ aL: [-2.95 + S(T * 5) * .05, 0, -.18], aR: [-2.95 + S(T * 5 + 1) * .05, 0, .18], lL: [-.25 + S(T * 6.5) * .35, 0, .05], lR: [-.25 + S(T * 6.5 + 2.2) * .35, 0, -.05], hd: [-.35, 0, 0], talk: false }),
  tpose: (t, T) => ({ aL: [0, 0, PI / 2], aR: [0, 0, -PI / 2], lL: [0, 0, 0], lR: [0, 0, 0], hd: [0, 0, 0], lean: 0, talk: false }),
  zombieUp: (t, T) => ({ aL: [-2.3 + S(T * 2) * .15, 0, -.15], aR: [-2.1 + S(T * 2.3 + 1) * .15, 0, .15], hd: [-.55, 0, .2 + S(T * .9) * .06], lean: -.05, talk: false }),
  zombieRoar: (t, T) => ({ aL: [-1.9, 0, .5], aR: [-1.9, 0, -.5], hd: [-.25, 0, S(T * 20) * .04], lean: -.12, talk: false }),
  stretch: (t, T) => { const k = S(T * 2.6); return { aL: [-.1, 0, 2.6 + k * .2], aR: [-.1, 0, -2.6 + k * .2], lean: k * .12, hd: [.1, 0, .2 * k], talk: false }; },
  jogPlace: (t, T) => { const k = S(T * 11); return { aL: [-.9 + k * .7, 0, .12], aR: [-.9 - k * .7, 0, -.12], lL: [-Math.max(0, k) * .8, 0, 0], lR: [-Math.max(0, -k) * .8, 0, 0], y: Math.abs(k) * .18, talk: false }; },
  run: (t, T) => { const k = S(T * 14); return { aL: [-.7 + k * .9, 0, .1], aR: [-.7 - k * .9, 0, -.1], lean: .2, hd: [-.1, 0, 0], talk: false }; },
  runScared: (t, T) => { const k = S(T * 14); return { aL: [-2.6 + k * .3, 0, .4], aR: [-2.6 - k * .3, 0, -.4], lean: .15, talk: false }; },
  sneak: (t, T) => ({ aL: [-.6, 0, -.25], aR: [-.6, 0, .25], lean: .22, hd: [-.2, 0, 0], talk: false }),
  carry: (t, T) => ({ aL: [-1.05, 0, -.32], aR: [-1.05, 0, .32], lean: -.04, talk: false }),
  carryRun: (t, T) => ({ aL: [-1.1, 0, -.32], aR: [-1.1, 0, .32], lean: .12, talk: false }),
  panReady: (t, T) => ({ aL: [-.45, 0, .2], aR: [-1.9 + S(T * 3) * .05, 0, -.25], hd: [0, 0, 0], talk: false }),
  panSwing: (t, T) => { const up = Math.min(1, t / .18), down = Math.max(0, Math.min(1, (t - .18) / .1)); return { aL: [-.4, 0, .25], aR: [-1.2 - up * 1.7 + down * 2.2, -.2 * down, -.3 + down * .4], lean: down * .15 - up * .05, talk: false }; },
  panProud: (t, T) => ({ aL: [.15, 0, .55], aR: [-2.7, 0, -.3], hd: [-.08, 0, 0], talk: true }),
  fall: (t, T) => { const k = Math.min(1, t / .35); const kk = 1 - Math.pow(1 - k, 3); return { aL: [-.3 * kk, 0, 1.4 * kk], aR: [-.3 * kk, 0, -1.4 * kk], lL: [.2 * kk, 0, .15 * kk], lR: [-.1 * kk, 0, -.15 * kk], lean: -1.52 * kk, y: .55 * kk + Math.sin(k * Math.PI) * .4, hd: [-.2 * kk, 0, .3 * kk], talk: false }; },
  sleep: (t, T) => ({ lL: [-PI / 2, 0, .2], lR: [-PI / 2, 0, -.2], y: -1.45, aL: [-.15, 0, .35], aR: [-.15, 0, -.35], hd: [.5 + S(T * 1.2) * .04, 0, .3], lean: -.18, talk: false }),
  wake: (t, T) => { const k = Math.min(1, t / .5); return { lL: [-PI / 2 * (1 - k), 0, .2 * (1 - k)], lR: [-PI / 2 * (1 - k), 0, -.2 * (1 - k)], aL: [-1.9 * k, 0, .5 * k], aR: [-1.9 * k, 0, -.5 * k], hd: [-.25 * k, 0, 0], lean: -.18 * (1 - k) - .1 * k, y: -1.45 * (1 - k) + Math.sin(k * Math.PI) * .3, talk: false }; },
  scared: (t, T) => ({ aL: [-1.7, 0, -.55], aR: [-1.7, 0, .55], lean: -.12, hd: [.08, 0, S(T * 25) * .02], y: 0, talk: false }),
  freeze: (t, T) => ({ aL: [-.25, 0, .3], aR: [-.25, 0, -.3], lean: -.06, hd: [0, 0, 0], talk: false }),
  reachUp: (t, T) => ({ aL: [-2.7, 0, .25], aR: [-2.7, 0, -.25], hd: [-.2, 0, 0], talk: false }),
  pullCurtain: (t, T) => { const k = Math.min(1, t / .4); return { aL: [-2.5, 0, -.2 + k * .6], aR: [-2.5, 0, .2 - k * .6], hd: [-.15, 0, 0], talk: false }; },
  show: (t, T) => ({ aL: [0, 0, .08], aR: [-1.75, 0, .3], hd: [.05, 0, 0], talk: false }),
  readLabel: (t, T) => ({ aL: [-1.5, 0, -.25], aR: [-1.65, 0, .25], hd: [.15, 0, 0], lean: -.03, talk: false }),
  liftUp: (t, T) => ({ aL: [-2.6, 0, -.3], aR: [-2.6, 0, .3], y: Math.abs(S(T * 7)) * .12, talk: false }),
  placeHigh: (t, T) => ({ aL: [0, 0, .08], aR: [-2.0, 0, .1], lean: .08, hd: [-.15, 0, 0], talk: false }),
  drive: (t, T) => ({ ...sit, aL: [-1.25 + S(T * 1.7) * .04, 0, -.32], aR: [-1.25 - S(T * 1.7) * .04, 0, .32], hd: [0, 0, S(T * .8) * .03], talk: true }),
  driveWild: (t, T) => { const k = S(T * 5.5); return { ...sit, aL: [-1.3 + k * .35, 0, -.3 - k * .15], aR: [-1.3 - k * .35, 0, .3 - k * .15], hd: [-.05, 0, k * .12], lean: -.05, talk: false }; },
  turnKey: (t, T) => ({ ...sit, aL: [-1.2, 0, -.3], aR: [-1.05, 0, .55 + Math.max(0, S(T * 9)) * .15], hd: [.25, 0, 0], talk: false }),
  hit: (t, T) => { const k = Math.min(1, t / .12), r = Math.max(0, 1 - Math.max(0, t - .12) / .7), a = k * r; return { aL: [-.6 * a, 0, .9 * a], aR: [-.6 * a, 0, -.9 * a], lL: [.15 * a, 0, 0], lR: [-.25 * a, 0, 0], lean: -.35 * a, hd: [-.4 * a, 0, .15 * a], y: -.1 * a, talk: false }; },
  dashHit: (t, T) => { const k = Math.abs(S(T * 7)); return { ...sit, aL: [-1.2, 0, -.3], aR: [-1.3 - k * 1.1, 0, .35], hd: [.15, 0, 0], lean: .08, talk: false }; },
  riseSit: (t, T) => { const k = Math.min(1, t / .9), e = 1 - Math.pow(1 - k, 3); return { ...sit, y: .45 - 3.1 * (1 - e), aL: [-1.55 + S(T * 2) * .08, 0, -.12], aR: [-1.5 + S(T * 2.3) * .08, 0, .12], hd: [-.08, 0, .18 + S(T * .9) * .05], talk: false }; },
  hideSit: (t, T) => ({ ...sit, y: -2.65, aL: [-1.5, 0, -.1], aR: [-1.5, 0, .1], talk: false }),
  bang: (t, T) => { const k = Math.abs(S(T * 6)); return { aL: [-2.0 - k * .55, 0, -.1], aR: [-2.0 - (1 - k) * .55, 0, .1], hd: [-.15, 0, .1], lean: .12, talk: false }; },
  showBook: (t, T) => ({ aL: [0, 0, .08], aR: [-1.5 + S(T * 4) * .06, 0, -.06], hd: [-.05, 0, 0], talk: false }),
  holdRadio: (t, T) => ({ aL: [-.2, 0, .08], aR: [-1.4, 0, .3], hd: [.18, .15, 0], talk: true }),
  pant: (t, T) => ({ aL: [-.5, 0, -.25], aR: [-.5, 0, .25], lean: .28 + S(T * 9) * .04, hd: [-.2, 0, 0], talk: true }),
  leanDoor: (t, T) => ({ aL: [-1.6, 0, .1], aR: [-1.6, 0, -.1], lean: .1, talk: false }),
  knee: (t, T) => ({ aL: [-.7, 0, -.3], aR: [-.2, 0, .1], lean: .2, hd: [.1, 0, 0], talk: true }),
  // ---- horror ----
  flashAim: (t, T) => ({ aL: [-.35, 0, .1], aR: [-1.42 + S(T * 1.9) * .03, S(T * .8) * .06, .05], hd: [.02, 0, 0], lean: .04, talk: true }),
  flashSweep: (t, T) => ({ aL: [-.3, 0, .1], aR: [-1.4 + S(T * 1.2) * .08, S(T * .9) * .45, .05], hd: [0, S(T * .9) * .35, 0], talk: false }),
  flashLow: (t, T) => ({ aL: [-.6, 0, -.2], aR: [-1.1 + S(T * 2) * .03, 0, .1], lean: .2, hd: [-.15, 0, 0], talk: true }),
  camcorder: (t, T) => ({ aL: [-1.55, 0, -.55], aR: [-1.6, 0, .35], hd: [.05, 0, 0], talk: true }),
  holdArm: (t, T) => ({ aL: [-.9, 0, -.25], aR: [-1.05, 0, .72], hd: [.25, 0, 0], lean: .08, talk: true }),
  holdArmWalk: (t, T) => ({ aL: [-.8, 0, -.2], aR: [-1.0, 0, .7], hd: [.15, 0, 0], lean: .12, talk: false }),
  bandaging: (t, T) => { const k = S(T * 6); return { aL: [-1.2 + k * .15, .2, -.35 - k * .2], aR: [-1.15 - k * .15, -.2, .4 + k * .2], hd: [.35, 0, 0], lean: .12, talk: true }; },
  showArm: (t, T) => ({ aL: [-1.35, 0, -.15], aR: [-.2, 0, -.08], hd: [.3, 0, 0], talk: true }),
  hideArm: (t, T) => ({ aL: [.25, 0, .02], aR: [-.1, 0, -.08], hd: [.08, .25, 0], talk: true }),
  tired: (t, T) => ({ aL: [-.95, 0, -.2], aR: [-.95, 0, .2], lean: .5, hd: [-.5, 0, 0], y: -.35, lL: [-.35, 0, 0], lR: [-.35, 0, 0], talk: true }),
  limp: (t, T) => ({ aL: [-.25, 0, .25], aR: [-.9, 0, .6], hd: [.1, 0, .05], lean: .1, talk: true }),
  sitHurt: (t, T) => ({ lL: [-PI / 2, 0, .1], lR: [-.25, 0, -.08], y: -1.35, aL: [-.3, 0, .3], aR: [-.9, 0, .5], lean: -.12, hd: [.15, 0, 0], talk: true }),
  sitFloor: (t, T) => ({ lL: [-PI / 2, 0, .12], lR: [-PI / 2, 0, -.12], y: -1.4, aL: [-.5, 0, .2], aR: [-.5, 0, -.2], lean: -.06, talk: true }),
  crouch: (t, T) => ({ lL: [-1.25, 0, .1], lR: [-.2, 0, -.05], y: -1.05, aL: [-.6, 0, -.15], aR: [-.7, 0, .15], lean: .25, hd: [-.25, 0, 0], talk: true }),
  crouchLight: (t, T) => ({ lL: [-1.25, 0, .1], lR: [-.2, 0, -.05], y: -1.05, aL: [-.6, 0, -.15], aR: [-1.45 + S(T * 2) * .03, 0, .05], lean: .25, hd: [-.25, 0, 0], talk: true }),
  pushDoor: (t, T) => ({ aL: [-1.55, 0, .12], aR: [-1.55, 0, -.12], lean: .35 + S(T * 9) * .03, lL: [.35, 0, 0], lR: [-.3, 0, 0], hd: [.1, 0, 0], talk: true }),
  climb: (t, T) => { const k = S(T * 9); return { aL: [-.5 + k * .55, 0, .1], aR: [-.5 - k * .55, 0, -.1], lean: .22, hd: [-.15, 0, 0], talk: true }; },
  crawl: (t, T) => { const k = S(T * 3.2); return { lean: 1.45, y: .55, aL: [-2.75 + k * .45, 0, .15], aR: [-2.75 - k * .45, 0, -.15], hd: [-1.15 + S(T * 1.3) * .06, S(T * .7) * .15, S(T * 2.2) * .1], lL: [0, 0, 0], lR: [0, 0, 0], talk: false }; },
  crawlGrab: (t, T) => ({ lean: 1.35, y: .55, aL: [-2.5, 0, .25], aR: [-3.0 + S(T * 12) * .05, 0, -.1], hd: [-1.2, 0, S(T * 9) * .06], talk: false }),
  stab: (t, T) => { const k = Math.max(0, S(T * 4.5)); return { aL: [-1.0, 0, -.1], aR: [-2.2 + k * 1.2, 0, .1], hd: [-.1, 0, .25], lean: .1 + k * .1, talk: false }; },
  syringeUp: (t, T) => ({ aL: [-.3, 0, .2], aR: [-2.4 + S(T * 2) * .08, 0, -.1], hd: [-.05, 0, .35 + S(T * .9) * .08], lean: .05, talk: false }),
  tankRoar: (t, T) => ({ aL: [-.6, 0, 1.0 + S(T * 18) * .05], aR: [-.6, 0, -1.0 - S(T * 18) * .05], hd: [-.45, 0, S(T * 20) * .05], lean: -.18, talk: false }),
  tankSmash: (t, T) => { const k = Math.abs(S(T * 3)); return { aL: [-2.8 + k * 1.8, 0, -.2], aR: [-2.8 + k * 1.8, 0, .2], lean: k * .25, hd: [.1, 0, 0], talk: false }; },
  kneelBandage: (t, T) => { const k = S(T * 6); return { lL: [-1.3, 0, .1], lR: [-.15, 0, -.05], y: -1.1, aL: [-1.35 + k * .15, .2, -.35 - k * .2], aR: [-1.3 - k * .15, -.2, .4 + k * .2], hd: [.5, 0, 0], lean: .3, talk: true }; },
  kneelLook: (t, T) => ({ lL: [-1.3, 0, .1], lR: [-.15, 0, -.05], y: -1.1, aL: [-.8, 0, -.2], aR: [-.8, 0, .2], hd: [.1, 0, 0], lean: .15, talk: true }),
  lieBack: (t, T) => ({ lean: -1.5, y: .6, aL: [-.3, 0, .5], aR: [-.2, 0, -.6], lL: [0, 0, .08], lR: [0, 0, -.08], hd: [.1, 0, 0], talk: false }),
  lieTalk: (t, T) => ({ lean: -1.5, y: .6, aL: [-.3, 0, .5], aR: [-.2, 0, -.6], lL: [0, 0, .08], lR: [0, 0, -.08], hd: [.25 + S(T * 1.3) * .04, 0, 0], talk: true }),
  frozen: (t, T) => ({ aL: [-1.9, 0, -.3], aR: [-1.6, 0, .4], lL: [-.3, 0, 0], lR: [.25, 0, 0], lean: .12, hd: [-.2, 0, 0], talk: false }),
  hack: (t, T) => ({ aL: [-1.2, 0, .25 + S(T * 9) * .04], aR: [-1.1 + S(T * 11) * .08, 0, -.35], lean: .08, hd: [.35, 0, 0], talk: true }),
  command: (t, T) => ({ aL: [-.3, 0, .2], aR: [-1.55, 0, -.1], lean: -.04, hd: [-.08, 0, 0], talk: true }),
  inject: (t, T) => ({ aL: [-1.0, 0, .5], aR: [-1.15 + S(T * 2) * .03, 0, -.4], lean: .5, y: -.4, lL: [-.6, 0, 0], lR: [-.2, 0, 0], hd: [.4, 0, 0], talk: true }),
  lieTwitch: (t, T) => ({ lean: -1.5, y: .6 + Math.max(0, S(T * 14)) * .08, aL: [-.3 + S(T * 9) * .3, 0, .5], aR: [-.2, 0, -.6 - S(T * 11) * .2], lL: [0, 0, .08], lR: [0, 0, -.08], hd: [.1 + S(T * 13) * .15, 0, S(T * 7) * .2], talk: false }),
  hug: (t, T) => ({ aL: [-1.4, 0, -.7], aR: [-1.4, 0, .7], lean: .08, hd: [.1, 0, 0], talk: true }),
  giveBook: (t, T) => ({ aL: [-1.3, 0, -.15], aR: [-1.3, 0, .15], lean: .06, hd: [.12, 0, 0], talk: true }),
  heliSit: (t, T) => ({ ...sit, aL: [-.5, 0, .25 + S(T * 7) * .02], aR: [-.5, 0, -.25], hd: [S(T * 8) * .02, 0, 0], talk: true }),
  heliSitHide: (t, T) => ({ ...sit, aL: [-.75, .3, -.35], aR: [-.9, -.3, .55], hd: [.32, 0, 0], talk: true }),
  ladder: (t, T) => { const k = S(T * 7); return { aL: [-2.8 + k * .3, 0, .1], aR: [-2.8 - k * .3, 0, -.1], lL: [-.5 - Math.max(0, k) * .6, 0, 0], lR: [-.5 - Math.max(0, -k) * .6, 0, 0], talk: false }; },
  wipe: (t, T) => ({ aL: [0, 0, .08], aR: [-2.4 + S(T * 6) * .1, 0, .7], hd: [.1, 0, 0], talk: true }),
  remote: (t, T) => ({ ...sit, aL: [-.4, 0, .15], aR: [-1.15, 0, .1], hd: [0, 0, 0], talk: false }),
  // --- guns, mutants, action ---
  aim: (t, T) => ({ aL: [-1.45, -.5, -.05], aR: [-1.5 + S(T * 1.7) * .02, .12, .05], hd: [.05, .12, 0], lean: .06, talk: false }),
  shoot: (t, T) => { const r = Math.max(0, S(T * 50)) * .14; return { aL: [-1.45 - r * .6, -.5, -.05], aR: [-1.5 - r, .12, .05], hd: [.05 + r * .3, .12, 0], lean: .04 - r * .3, talk: false }; },
  leap: (t, T) => ({ aL: [-2.6, 0, -.25], aR: [-2.6, 0, .25], lL: [-.9, 0, .1], lR: [.5, 0, -.1], lean: .55, hd: [-.4, 0, 0], talk: false }),
  stalk: (t, T) => ({ aL: [-.9 + S(T * 2.1) * .2, 0, .2], aR: [-1.0 + S(T * 1.8 + 1) * .2, 0, -.2], lL: [-.9, 0, .15], lR: [-.3, 0, -.1], y: -.8, lean: .7, hd: [-.6, S(T * 1.3) * .25, S(T * 2.2) * .15], talk: false }),
  flail: (t, T) => ({ aL: [-2.2 + S(T * 13) * .6, 0, -.4 + S(T * 9) * .3], aR: [-2.0 + S(T * 11 + 1) * .6, 0, .4 + S(T * 8) * .3], lL: [S(T * 12) * .5, 0, .1], lR: [-S(T * 12) * .5, 0, -.1], hd: [-.2 + S(T * 10) * .15, S(T * 7) * .3, 0], lean: -.15, talk: true }),
  throwIt: (t, T) => { const k = Math.min(1, t / .35); return { aL: [-2.9 + k * 2.2, 0, -.2], aR: [-2.9 + k * 2.2, 0, .2], lean: -.2 + k * .45, hd: [k * .2, 0, 0], talk: false }; },
  swat: (t, T) => { const k = Math.min(1, t / .25); return { aL: [-.3, 0, .2], aR: [-2.4 + k * 1.2, -.9 * k, -1.2 + k * 1.6], lean: .1 + k * .1, hd: [.1, -.3 * k, 0], talk: false }; },
  pullLever: (t, T) => { const k = Math.min(1, t / .4); return { aL: [-2.3 + k * 1.6, 0, -.1], aR: [-2.3 + k * 1.6, 0, .1], lean: -.15 * k, hd: [-.1, 0, 0], talk: false }; },
  feed: (t, T) => ({ lL: [-1.3, 0, .1], lR: [-.15, 0, -.05], y: -1.1, aL: [-1.4 + S(T * 6) * .3, 0, -.2], aR: [-1.3 + S(T * 6 + 2) * .3, 0, .2], hd: [.55 + Math.abs(S(T * 7)) * .3, S(T * 3) * .2, 0], lean: .55, talk: false }),
  drag: (t, T) => ({ aL: [-1.0 + S(T * 4) * .15, 0, -.1], aR: [-1.1 + S(T * 4 + 1) * .15, 0, .1], lL: [-.4, 0, .1], lR: [.3, 0, -.1], lean: -.25, hd: [.2, 0, .1], talk: false }),
  holdHigh: (t, T) => ({ aL: [-.4, 0, .2], aR: [-2.7 + S(T * 3) * .05, 0, -.2], lean: -.08, hd: [-.15, 0, 0], talk: false }),
  dead: (t, T) => ({ aL: [-.3, 0, 1.4], aR: [-.3, 0, -1.2], lL: [.2, 0, .15], lR: [-.1, 0, -.15], lean: -1.52, y: .55, hd: [-.2, 0, .3], talk: false }),
  deadFront: (t, T) => ({ aL: [-2.6, 0, .4], aR: [-2.8, 0, -.3], lL: [.1, 0, .1], lR: [0, 0, -.1], lean: 1.5, y: .55, hd: [-1.1, .4, 0], talk: false }),
};

export const EXPR = {
  delighted: { eyes: 'happy', mouth: 'grin', browY: .35, cheeks: true, blush: true },
  dizzy: { eyes: 'spiral', mouth: 'wavy', browY: .3 },
  stern: { browAng: 1.1, browY: -.25, mouth: 'frown' },
  neutral: {},
  bored: { eyes: 'lid', mouth: 'flat' },
  happy: { mouth: 'smile', browY: .2 },
  joy: { eyes: 'happy', mouth: 'grin', browY: .4 },
  smug: { eyes: 'lid', mouth: 'smirk' },
  angry: { browAng: 1, browY: -.2, mouth: 'frown' },
  shocked: { eyeOpen: 1.3, eyeW: 1.15, browY: .9, mouth: 'jaw' },
  surprised: { eyeOpen: 1.15, browY: .6, mouth: 'o' },
  sad: { browAng: -.8, mouth: 'frown' },
  cry: { browAng: -.9, eyes: 'closed', mouth: 'wavy', tears: true },
  nervous: { browAng: -.6, mouth: 'wavy', sweat: true },
  star: { eyes: 'star', mouth: 'grin', browY: .5 },
  sipping: { eyes: 'closed', mouth: 'o', blush: true },
  busy: { mouth: 'smile', browY: .1, browAng: .3 },
  tired: { eyeOpen: .55, mouth: 'flat', sweat: true },
  wow: { eyeOpen: 1.2, browY: .7, mouth: 'grin' },
  sleep: { eyes: 'closed', mouth: 'o' },
  terrified: { eyeOpen: 1.35, eyeW: 1.1, browAng: -.8, browY: .8, mouth: 'jaw', sweat: true },
  scared: { eyeOpen: 1.2, browAng: -.7, browY: .5, mouth: 'wavy', sweat: true },
  determined: { browAng: .8, browY: -.1, mouth: 'smirk' },
  proud: { eyes: 'lid', mouth: 'smile', browY: .2 },
  hungry: { eyeOpen: 1.1, mouth: 'o', browAng: .6 },
  dazed: { eyes: 'star', mouth: 'wavy' },
  disgust: { eyes: 'lid', browAng: .6, mouth: 'wavy' },
  suspicious: { eyes: 'lid', browAng: .5, mouth: 'flat' },
  pain: { eyes: 'closed', browAng: -.9, browY: .3, mouth: 'wavy', sweat: true },
  hurt: { eyeOpen: .7, browAng: -.8, mouth: 'frown', sweat: true },
  sick: { eyeOpen: .6, browAng: -.5, mouth: 'flat', sweat: true },
  worried: { browAng: -.75, browY: .35, mouth: 'flat' },
  grim: { eyeOpen: .8, browAng: .5, browY: -.15, mouth: 'flat' },
  scream: { eyeOpen: 1.4, eyeW: 1.15, browAng: -.9, browY: .9, mouth: 'jaw', sweat: true },
  lying: { eyes: 'lid', browAng: -.3, mouth: 'smile', sweat: true },
  // ---- storytime faces (narrator + listeners reacting) ----
  deadpan: { eyes: 'lid', mouth: 'flat', browY: -.12 },
  roll: { eyes: 'lid', mouth: 'flat', browY: .15 },      // animated in runtime.js: eyes slide up and back
  shifty: { eyeOpen: 1.05, mouth: 'flat', browY: .1 },   // animated in runtime.js: eyes dart side to side
  cringe: { eyes: 'lid', browAng: .75, mouth: 'wavy', sweat: true },
  gasp: { eyeOpen: 1.35, eyeW: 1.12, browY: .85, mouth: 'o' },
  yuck: { eyes: 'lid', browAng: .8, mouth: 'wavy', lookY: .3 },
  plotting: { eyes: 'lid', browAng: .55, mouth: 'smirk', lookY: -.25 },
  confused: { browAng: -.55, browRaiseR: .85, eyeW: 1.05, mouth: 'wavy' },
  awkward: { eyeOpen: .85, mouth: 'smile', browY: .3, sweat: true },
  pleading: { eyeOpen: 1.25, eyeW: 1.12, browAng: -.9, browY: .55, mouth: 'wavy' },
  hype: { eyeOpen: 1.2, browY: .6, mouth: 'grin', cheeks: true },
  oops: { eyeOpen: 1.12, browY: .5, mouth: 'o', sweat: true, blush: true },
  done: { eyes: 'closed', mouth: 'flat', browAng: .35 },
};

// Storytime beats: one command in a scenario expands into pose + face + camera + sfx.
//   ['narr','story','twist']                     standing
//   ['narr','story',{beat:'intro',sit:true}]     same beat on the sofa ('stTell@sit')
// Any field can be overridden per call: pose, expr, look, punch, shake, sfx, vol, turn.
export const STORY = {
  intro:    { pose: 'stTell',       expr: 'happy',      look: 'cam' },
  hook:     { pose: 'stPointCam',   expr: 'determined', look: 'cam', punch: .18, sfx: 'whoosh' },
  picture:  { pose: 'stFrame',      expr: 'plotting',   look: 'cam' },
  emphasis: { pose: 'stChop',       expr: 'angry',      look: 'cam' },
  quotes:   { pose: 'stQuotes',     expr: 'smug',       look: 'cam', sfx: 'click' },
  whisper:  { pose: 'stWhisper',    expr: 'nervous',    look: 'cam' },
  list:     { pose: 'stCount',      expr: 'busy',       look: 'cam' },
  reveal:   { pose: 'stGasp',       expr: 'gasp',       look: 'cam', punch: .3, sfx: 'ding' },
  twist:    { pose: 'stDoubleTake', expr: 'shocked',    look: 'cam', punch: .24, sfx: 'whoosh' },
  denial:   { pose: 'stNoNo',       expr: 'cringe',     look: 'cam' },
  agree:    { pose: 'stNod',        expr: 'happy',      look: 'cam' },
  roll:     { pose: 'stRoll',       expr: 'roll',       look: 'cam' },
  cringe:   { pose: 'stCringe',     expr: 'cringe',     look: 'cam', sfx: 'creak' },
  rage:     { pose: 'stRage',       expr: 'scream',     look: 'cam', shake: .18, sfx: 'thud' },
  despair:  { pose: 'stDespair',    expr: 'cry',        look: 'none' },
  hype:     { pose: 'stShimmy',     expr: 'hype',       look: 'cam', sfx: 'pop' },
  phew:     { pose: 'stWipe',       expr: 'tired',      look: 'cam' },
  so:       { pose: 'stLeanBack',   expr: 'smug',       look: 'cam' },
  deadpan:  { pose: 'stStare',      expr: 'deadpan',    look: 'cam' },
  awkward:  { pose: 'stAwkward',    expr: 'awkward',    look: 'cam', sfx: 'tick' },
};

export function blendPose(a, b, k) {
  const out = {};
  for (const key of ['aL', 'aR', 'lL', 'lR', 'hd']) { const x = a[key] || [0, 0, 0], y = b[key] || [0, 0, 0]; out[key] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]; }
  out.y = (a.y || 0) + ((b.y || 0) - (a.y || 0)) * k; out.lean = (a.lean || 0) + ((b.lean || 0) - (a.lean || 0)) * k;
  out.talk = k < .5 ? a.talk : b.talk; return out;
}
// 'name@sit' = any upper-body clip while seated
export function clipPose(name, t, T) {
  const [base, mod] = name.split('@'); const f = CLIPS[base] || CLIPS.idle; const p = f(t, T);
  if (mod === 'sit') return { ...p, lL: sit.lL, lR: sit.lR, y: sit.y + Math.min(0, (p.y || 0)) };
  return p;
}
