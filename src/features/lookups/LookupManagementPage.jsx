import { useMemo, useState } from "react";
import { formatError } from "../../utils/eventFormatters.js";

export function LookupManagementPage({
  kind,
  items = [],
  loading = false,
  onCreate,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  const isCategory = kind === "category";
  const label = isCategory ? "Category" : "Event type";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !q ||
        [item.name, item.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(q));
      const active = item.isActive ?? item.active ?? true;
      const matchesStatus =
        status === "all" ||
        (status === "active" && active) ||
        (status === "inactive" && !active);
      return matchesQuery && matchesStatus;
    });
  }, [items, query, status]);

  const activeCount = items.filter((item) => item.isActive ?? item.active ?? true).length;
  const inactiveCount = items.length - activeCount;

  async function runAction(id, action) {
    setBusyId(id);
    setActionError("");
    try {
      await action();
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(item) {
    const message =
      `Delete "${item.name}" permanently? ` +
      "If it is already used by an event, the server may reject this operation.";
    if (window.confirm(message)) {
      runAction(item.id, () => onDelete(item));
    }
  }

  return (
    <>
      <section className="page-heading lookup-page-heading">
        <div>
          <div className="eyebrow">EVENT CONFIGURATION</div>
          <h1>{isCategory ? "Categories" : "Event types"}</h1>
          <p>Manage the options administrators can assign to events.</p>
        </div>
        <button className="button button-primary" type="button" onClick={onCreate}>
          <span aria-hidden="true">＋</span> Add {label.toLowerCase()}
        </button>
      </section>

      <section className="stats-grid lookup-stats" aria-label={`${label} statistics`}>
        <div className="stat-card">
          <span className="stat-icon violet" aria-hidden="true">{isCategory ? "⌘" : "◇"}</span>
          <div className="stat-content"><span>Total {label.toLowerCase()}s</span><strong>{items.length}</strong><small>All records</small></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green" aria-hidden="true">✓</span>
          <div className="stat-content"><span>Active</span><strong>{activeCount}</strong><small>Available in event forms</small></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon orange" aria-hidden="true">Ⅱ</span>
          <div className="stat-content"><span>Inactive</span><strong>{inactiveCount}</strong><small>Hidden from event forms</small></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon blue" aria-hidden="true">↻</span>
          <div className="stat-content"><span>Management</span><strong>CRUD</strong><small>Create, edit and maintain</small></div>
        </div>
      </section>

      <section className="events-panel lookup-management-panel">
        <div className="panel-heading lookup-toolbar">
          <div>
            <h2>{label} directory <span className="count-pill">{filteredItems.length}</span></h2>
            <p>Search, update, activate or deactivate records.</p>
          </div>
          <div className="lookup-filters">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}s…`}
                aria-label={`Search ${label.toLowerCase()}s`}
              />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {actionError && <div className="lookup-inline-error" role="alert">{actionError}</div>}

        <div className="table-scroll">
          <table className="events-table lookup-table">
            <thead>
              <tr>
                <th>{label.toUpperCase()}</th>
                <th>DESCRIPTION</th>
                <th>STATUS</th>
                <th className="lookup-actions-heading">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="table-state" colSpan="4"><span className="spinner" /> Loading {label.toLowerCase()}s…</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className="table-state" colSpan="4">
                    <div className="empty-state">
                      <span className="empty-icon">{isCategory ? "⌘" : "◇"}</span>
                      <strong>{items.length ? "No matching records" : `No ${label.toLowerCase()}s yet`}</strong>
                      <span>{items.length ? "Try another search or status filter." : `Create your first ${label.toLowerCase()} to use it in events.`}</span>
                      {!items.length && <button className="button button-primary button-small" type="button" onClick={onCreate}>Add {label.toLowerCase()}</button>}
                    </div>
                  </td>
                </tr>
              ) : filteredItems.map((item) => {
                const active = item.isActive ?? item.active ?? true;
                const busy = busyId === item.id;
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="lookup-name-cell">
                        <span className="lookup-record-icon">{(item.name || "?").slice(0, 1).toUpperCase()}</span>
                        <span><strong>{item.name}</strong><small>ID: {item.id}</small></span>
                      </div>
                    </td>
                    <td className="lookup-description">{item.description?.trim() || "—"}</td>
                    <td><span className={`status-badge ${active ? "open" : "cancelled"}`}><span />{active ? "Active" : "Inactive"}</span></td>
                    <td>
                      <div className="lookup-row-actions">
                        <button className="text-action" type="button" onClick={() => onEdit(item)}>Edit</button>
                        <button
                          className={`text-action ${active ? "lookup-deactivate" : "lookup-activate"}`}
                          type="button"
                          disabled={busy}
                          onClick={() => runAction(item.id, () => onToggleStatus(item, !active))}
                        >
                          {busy ? "Saving…" : active ? "Deactivate" : "Activate"}
                        </button>
                        <button className="text-action lookup-delete" type="button" disabled={busy} onClick={() => confirmDelete(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer className="panel-footer">
          <span>Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> records</span>
          <span className="footer-live"><span /> Changes are saved to the server</span>
        </footer>
      </section>
    </>
  );
}
