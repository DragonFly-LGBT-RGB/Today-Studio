// Simple scene-relative stereo: equal-power panning and distance attenuation.
// This is not a binaural/HRTF implementation. Inputs use Studio world units.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function gains(listener, source, options = {}) {
  if (!listener?.p || !listener?.f || !Array.isArray(source)) return null;
  const [x, y, z] = source.map((v, i) => v - listener.p[i]);
  const [fx, , fz] = listener.f, h = Math.hypot(fx, fz) || 1;
  const horizontal = Math.hypot(x, z) || 1;
  const pan = clamp((x * (-fz / h) + z * (fx / h)) / horizontal, -1, 1) * clamp(options.pan ?? .9, 0, 1);
  const distance = Math.hypot(x, y, z);
  const near = Math.max(.1, options.near ?? 6), rolloff = Math.max(0, options.rolloff ?? .35);
  const gain = Math.max(options.minGain ?? .16, Math.min(1, near / (near + rolloff * Math.max(0, distance - near))));
  return [gain * Math.cos((pan + 1) * Math.PI / 4), gain * Math.sin((pan + 1) * Math.PI / 4)];
}
export function sourceAt(spec, track, sets) {
  if (Array.isArray(spec) && spec.length >= 3) return spec.slice(0, 3);
  if (typeof spec === 'string') {
    const a = track.A?.[spec]; if (a && a[3]) return a.slice(0, 3);
    return sets[track.set]?.anchors?.[spec] || null;
  }
  if (spec && typeof spec === 'object') {
    const base = sourceAt(spec.actor ?? spec.at ?? spec.pos, track, sets);
    if (!base) return null;
    const off = spec.off || [0, 0, 0]; return base.map((v, i) => v + (off[i] || 0));
  }
  return null;
}
const f = x => Number(x).toFixed(6);
function expression(samples, channel) {
  let result = f(samples[samples.length - 1].g[channel]);
  for (let i = samples.length - 2; i >= 0; i--) {
    const a = samples[i], b = samples[i + 1], dt = Math.max(.0001, b.t - a.t);
    const line = `(${f(a.g[channel])}+(${f(b.g[channel] - a.g[channel])})*(t-${f(a.t)})/${f(dt)})`;
    result = `if(lt(t,${f(b.t)}),${line},${result})`;
  }
  return result;
}
export function ffmpegPan(samples) {
  if (!samples || !samples.length) return '';
  return `aeval=exprs='val(0)*(${expression(samples, 0)})|val(0)*(${expression(samples, 1)})':c=stereo,`;
}
