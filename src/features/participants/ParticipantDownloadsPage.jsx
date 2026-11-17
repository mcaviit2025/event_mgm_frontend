import { useEffect, useMemo, useState } from "react";
import { apiBlobRequest } from "../../services/api.js";
import { formatDateTime, formatError } from "../../utils/eventFormatters.js";
import { Alert } from "../../shared/components/Alert.jsx";

const PAYMENT_STATUSES = [
  ["", "All payment statuses"],
  ["VERIFIED", "Verified"],
  ["PENDING", "Pending"],
  ["REJECTED", "Rejected"],
  ["NOT_REQUIRED", "Not required"],
];

const REGISTRATION_STATUSES = [
  ["", "All registration statuses"],
  ["APPROVED", "Approved"],
  ["PENDING", "Pending"],
  ["REJECTED", "Rejected"],
  ["CANCELLED", "Cancelled"],
];

export function ParticipantDownloadsPage({ token, events }) {
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [query, setQuery] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [includeTeamMembers, setIncludeTeamMembers] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!selectionInitialized && events.length > 0) {
      setSelectedEventIds(events.map((event) => String(event.id)));
      setSelectionInitialized(true);
    }
  }, [events, selectionInitialized]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return events;
    return events.filter((event) =>
      [event.eventName, event.venue, event.category?.name, event.eventType?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [events, query]);

  function toggleEvent(eventId) {
    const id = String(eventId);
    setSelectedEventIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  }

  async function downloadParticipants(eventIds, downloadType) {
    if (!eventIds.length) {
      setError("Select at least one event to download.");
      return;
    }
    setWorking(downloadType);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams();
      eventIds.forEach((eventId) => params.append("eventIds", eventId));
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (registrationStatus) params.set("registrationStatus", registrationStatus);
      params.set("includeTeamMembers", String(includeTeamMembers));

      const workbook = await apiBlobRequest(
        `/v1/admin/participants/export.xlsx?${params.toString()}`,
        { token },
      );
      const eventLabel = eventIds.length === 1
        ? safeFilename(events.find((event) => String(event.id) === eventIds[0])?.eventName || "event")
        : "selected-events";
      saveBlob(workbook, `participants-${eventLabel}-${dateStamp()}.xlsx`);
      setNotice("Participant workbook downloaded.");
    } catch (downloadError) {
      setError(formatError(downloadError));
    } finally {
      setWorking("");
    }
  }

  const allVisibleSelected = filteredEvents.length > 0
    && filteredEvents.every((event) => selectedEventIds.includes(String(event.id)));

  return (
    <>
      <section className="page-heading participant-download-heading">
        <div>
          <div className="eyebrow">EVENT REPORTS</div>
          <h1>Participant downloads</h1>
          <p>Export Excel lists for one event or combine multiple events into one workbook.</p>
        </div>
        <div className="participant-download-actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={working !== "" || events.length === 0}
            onClick={() => downloadParticipants(events.map((event) => String(event.id)), "all")}
          >
            {working === "all" ? "Preparing…" : "Download all events"}
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={working !== "" || selectedEventIds.length === 0}
            onClick={() => downloadParticipants(selectedEventIds, "selected")}
          >
            {working === "selected" ? "Preparing…" : `Download selected (${selectedEventIds.length})`}
          </button>
        </div>
      </section>

      {error && <Alert onDismiss={() => setError("")}>{error}</Alert>}
      {notice && <Alert variant="success" onDismiss={() => setNotice("")}>{notice}</Alert>}

      <section className="review-panel participant-download-panel">
        <header className="panel-heading">
          <div>
            <h2>Choose events and download options</h2>
            <p>Multi-event downloads include a combined participant tab and a separate tab for each event.</p>
          </div>
        </header>

        <div className="participant-export-options">
          <label className="participant-export-field">
            Payment status
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
              {PAYMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="participant-export-field">
            Registration status
            <select value={registrationStatus} onChange={(event) => setRegistrationStatus(event.target.value)}>
              {REGISTRATION_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="participant-export-checkbox">
            <input
              type="checkbox"
              checked={includeTeamMembers}
              onChange={(event) => setIncludeTeamMembers(event.target.checked)}
            />
            <span>
              <strong>Include teammates as separate rows</strong>
              <small>When off, exports only one row for each registration leader.</small>
            </span>
          </label>
        </div>

        <div className="participant-event-toolbar">
          <label className="search-field participant-event-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find an event"
            />
          </label>
          <button
            className="text-action"
            type="button"
            onClick={() => setSelectedEventIds((current) => allVisibleSelected
              ? current.filter((id) => !filteredEvents.some((event) => String(event.id) === id))
              : [...new Set([...current, ...filteredEvents.map((event) => String(event.id))])])}
          >
            {allVisibleSelected ? "Clear visible" : "Select visible"}
          </button>
        </div>

        {events.length === 0 ? (
          <div className="review-empty">No active events are available to export.</div>
        ) : filteredEvents.length === 0 ? (
          <div className="review-empty">No events match your search.</div>
        ) : (
          <div className="participant-event-list">
            {filteredEvents.map((event) => {
              const id = String(event.id);
              return (
                <article className="participant-event-item" key={id}>
                  <label className="participant-event-select">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(id)}
                      onChange={() => toggleEvent(id)}
                    />
                    <span className="participant-event-details">
                      <strong>{event.eventName}</strong>
                      <small>{formatDateTime(event.eventDateTime)} · {event.currentParticipants || 0} participants registered</small>
                    </span>
                  </label>
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    disabled={working !== ""}
                    onClick={() => downloadParticipants([id], id)}
                  >
                    {working === id ? "Preparing…" : "Download event"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
        <footer className="participant-export-note">
          Amount due is shown once on each group leader row to avoid counting the same group payment multiple times.
          Team members inherit the registration’s payment and registration statuses.
        </footer>
      </section>
    </>
  );
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value) {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
