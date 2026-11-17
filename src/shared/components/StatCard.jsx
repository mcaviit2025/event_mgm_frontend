export function StatCard({ label, value, icon, tone, detail }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`} aria-hidden="true">{icon}</div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <span className="stat-decoration" aria-hidden="true">↗</span>
    </article>
  );
}
