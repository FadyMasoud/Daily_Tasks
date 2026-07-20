// Small inline SVG flags — reliable across platforms (Windows doesn't render
// regional-indicator emoji flags, so we draw them).

export function EgyptFlag({ className = '' }) {
  return (
    <svg viewBox="0 0 24 16" width="22" height="15" className={className} aria-hidden>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5.34" y="0" fill="#CE1126" />
      <rect width="24" height="5.34" y="10.66" fill="#000" />
      {/* Simplified gold eagle emblem */}
      <g fill="#C09300">
        <ellipse cx="12" cy="8" rx="1.5" ry="1.9" />
        <rect x="11.4" y="6.2" width="1.2" height="3.6" rx="0.3" />
      </g>
    </svg>
  );
}

export function USAFlag({ className = '' }) {
  const stripes = Array.from({ length: 13 }, (_, i) => i);
  const h = 16 / 13;
  return (
    <svg viewBox="0 0 24 16" width="22" height="15" className={className} aria-hidden>
      <rect width="24" height="16" fill="#B22234" />
      {stripes.filter(i => i % 2 === 1).map(i => (
        <rect key={i} x="0" y={i * h} width="24" height={h} fill="#fff" />
      ))}
      <rect width="10.5" height={h * 7} fill="#3C3B6E" />
      {/* Stars simplified as a small grid of dots */}
      <g fill="#fff">
        {[1.6, 4, 6.4, 8.8].map(x =>
          [1.2, 3, 4.8].map(y => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.45" />
          ))
        )}
      </g>
    </svg>
  );
}
