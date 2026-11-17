import { formatAmount, formatDateTime } from "../../../utils/eventFormatters.js";

function StatusBadge({ event }) {
  const status = event.status || "OPEN";
  const isOpen = status === "OPEN" && event.isRegistrationOpen;
  const tone = isOpen ? "open" : status.toLowerCase();
  const label = isOpen ? "Open" : status.toLowerCase().replaceAll("_", " ");
  return <span className={`status-badge ${tone}`}><span />{label}</span>;
}

function EmptyState({ searching, onCreate }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">✳</span>
      <strong>{searching ? "No matching events" : "Your first event starts here"}</strong>
      <span>{searching ? "Try another name, venue, or category." : "Create an event and it will appear in this list."}</span>
      {!searching && (
        <button className="button button-primary button-small" type="button" onClick={onCreate}>
          ＋ Create event
        </button>
      )}
    </div>
  );
}

export function EventsTable({ events, filteredEvents, query, onQueryChange, loading, onEdit, onDelete, onCreate }) {
  return (
    <div className="events-panel">
      <div className="panel-heading">
        <div>
          <h2>All events <span className="count-pill">{events.length}</span></h2>
          <p>A complete overview of your upcoming and past events.</p>
        </div>
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search events" aria-label="Search events" />
        </label>
      </div>
      <div className="table-scroll">
        <table className="events-table">
          <thead>
            <tr>
              <th>EVENT</th><th>DATE &amp; TIME</th><th>CATEGORY</th><th>FEE</th>
              <th>REGISTRATIONS</th><th>STATUS</th><th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading && !events.length ? (
              <tr><td colSpan="7" className="table-state"><span className="spinner" />Loading events…</td></tr>
            ) : filteredEvents.length ? filteredEvents.map((event) => (
              <tr key={event.id}>
                <td>
                  <div className="event-cell">
                    <span className="event-avatar">{(event.eventName || "E").slice(0, 1).toUpperCase()}</span>
                    <span><strong>{event.eventName}</strong><small>{event.venue}</small></span>
                  </div>
                </td>
                <td className="date-cell">{formatDateTime(event.eventDateTime)}</td>
                <td><span className="category-chip">{event.category?.name || "Uncategorized"}</span></td>
                <td><span className="fee-cell">{Number(event.eventFee || 0) === 0 ? "Free" : formatAmount(event.eventFee)}</span></td>
                <td><span className="registration-cell">{event.currentParticipants || 0}<span> / {event.maxParticipants}</span></span></td>
                <td><StatusBadge event={event} /></td>
                <td>
                  <div className="row-actions">
                    <button className="text-action" type="button" onClick={() => onEdit(event)}>Edit</button>
                    <button className="more-button" type="button" onClick={() => onDelete(event)} title="Delete event" aria-label={`Delete ${event.eventName}`}>···</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="table-state"><EmptyState searching={Boolean(query)} onCreate={onCreate} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-footer">
        <span>Showing <strong>{filteredEvents.length}</strong> of <strong>{events.length}</strong> events</span>
        <span className="footer-live"><span /> Synced with your workspace</span>
      </div>
    </div>
  );
}
