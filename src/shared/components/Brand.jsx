export function Brand({ light = false }) {
  return (
    <a className={`brand${light ? " brand-light" : ""}`} href="#" aria-label="Gather home">
      <span className="brand-mark">g</span>
      <span>
        gather<span className="brand-dot">.</span>
      </span>
    </a>
  );
}
