import { Brand } from "../components/Brand.jsx";

export function AdminLayout({ user, onSignOut, onOpenLookup, onRefresh, loading, headerAction, activeSection, onNavigate, children }) {
  const displayName = user?.fullName || user?.username || "Administrator";
  const currentTitle = {
    events: "Events",
    payments: "Payment review",
    collections: "Collections",
    participants: "Participant downloads",
  }[activeSection] || "Events";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={`nav-item ${activeSection === "events" ? "active" : ""}`} type="button" onClick={() => onNavigate("events")}>
            <span className="nav-symbol" aria-hidden="true">▦</span> Events
          </button>
          <button className={`nav-item ${activeSection === "payments" ? "active" : ""}`} type="button" onClick={() => onNavigate("payments")}>
            <span className="nav-symbol" aria-hidden="true">◉</span> Payment review
          </button>
          <button className={`nav-item ${activeSection === "collections" ? "active" : ""}`} type="button" onClick={() => onNavigate("collections")}>
            <span className="nav-symbol" aria-hidden="true">$</span> Collections
          </button>
          <button className={`nav-item ${activeSection === "participants" ? "active" : ""}`} type="button" onClick={() => onNavigate("participants")}>
            <span className="nav-symbol" aria-hidden="true">▤</span> Participant downloads
          </button>
          <button className="nav-item" type="button" onClick={() => onOpenLookup("event-type")}>
            <span className="nav-symbol" aria-hidden="true">◇</span> Event types
          </button>
          <button className="nav-item" type="button" onClick={() => onOpenLookup("category")}>
            <span className="nav-symbol" aria-hidden="true">⌘</span> Categories
          </button>
        </nav>

        <div className="sidebar-bottom">
          <a className="help-card" href="/api/swagger-ui.html" target="_blank" rel="noreferrer">
            <span className="help-icon" aria-hidden="true">?</span>
            <span className="help-copy">
              <strong>Need a hand?</strong>
              <small>Explore the API docs</small>
            </span>
            <span className="help-link" aria-hidden="true">↗</span>
          </a>
          <button className="profile-button" type="button" onClick={onSignOut}>
            <span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span className="profile-copy">
              <strong>{displayName}</strong>
              <small>Administrator · Sign out</small>
            </span>
            <span className="profile-menu" aria-hidden="true">↗</span>
          </button>
        </div>
      </aside>

      <main className="main-content" id="events">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span><span className="crumb-separator">/</span><strong>{currentTitle}</strong>
          </div>
          <div className="topbar-actions">
            <span className="today-label">
              {new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date())}
            </span>
            <button
              className="icon-button"
              type="button"
              title={`Refresh ${currentTitle.toLowerCase()}`}
              aria-label={`Refresh ${currentTitle.toLowerCase()}`}
              onClick={onRefresh}
              disabled={loading}
            >
              ⟳
            </button>
            {headerAction}
          </div>
        </header>
        <div className="content-container">{children}</div>
      </main>
    </div>
  );
}
