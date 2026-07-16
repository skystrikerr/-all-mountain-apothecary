// Layered animated mountain silhouettes — pure SVG + CSS, no JS runtime cost.
// Three ridgelines drift horizontally at different speeds (parallax) with a
// soft mist band between them. Each ridge is two copies of the same seamless
// path side by side, translated -50% on loop, so the drift never jumps.
// Server-renderable; animation lives in globals.css (.animate-ridge/.animate-mist)
// and is disabled by the prefers-reduced-motion block there.

const RIDGES = [
  {
    // far ridge — tallest, faintest, slowest
    d: 'M0,120 L80,70 L160,100 L260,40 L360,95 L460,60 L560,110 L660,55 L760,90 L860,45 L960,100 L1060,65 L1200,120 L1200,200 L0,200 Z',
    fill: '#4c6e5d',
    opacity: 0.28,
    duration: '95s',
    height: 'h-48 md:h-64',
  },
  {
    // mid ridge
    d: 'M0,140 L100,80 L200,120 L320,60 L440,115 L560,75 L680,125 L800,70 L920,115 L1040,85 L1200,140 L1200,200 L0,200 Z',
    fill: '#3a5a49',
    opacity: 0.5,
    duration: '65s',
    height: 'h-36 md:h-48',
  },
  {
    // near ridge — darkest, fastest
    d: 'M0,160 L140,105 L280,145 L420,95 L560,140 L700,100 L840,150 L980,110 L1200,160 L1200,200 L0,200 Z',
    fill: '#12291d',
    opacity: 0.9,
    duration: '42s',
    height: 'h-24 md:h-32',
  },
]

export default function MountainBackdrop({ className = '' }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {RIDGES.map((ridge, i) => (
        <div
          key={i}
          className={`absolute bottom-0 left-0 w-full overflow-hidden ${ridge.height}`}
          style={{ opacity: ridge.opacity }}
        >
          <div
            className="animate-ridge flex w-[200%] h-full"
            style={{ animationDuration: ridge.duration }}
          >
            <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="w-1/2 h-full">
              <path d={ridge.d} fill={ridge.fill} />
            </svg>
            <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="w-1/2 h-full">
              <path d={ridge.d} fill={ridge.fill} />
            </svg>
          </div>
        </div>
      ))}

      {/* drifting mist between the mid and near ridges */}
      <div
        className="animate-mist absolute bottom-16 md:bottom-24 left-[-10%] w-[120%] h-10 md:h-14 blur-xl"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(249,246,240,0.14) 30%, rgba(249,246,240,0.08) 55%, rgba(249,246,240,0.16) 75%, transparent)',
        }}
      />
    </div>
  )
}
