export function Brand() {
  return (
    <span className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand__mark" src="/logo-mark.png" alt="" width={28} height={28} />
      <span className="brand__word">
        Style<span>Muse</span>
      </span>
    </span>
  );
}
