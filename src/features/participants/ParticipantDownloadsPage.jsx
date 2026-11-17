import { useMemo, useState } from "react";
import { apiBlobRequest } from "../../services/api.js";
import { formatDateTime, formatError } from "../../utils/eventFormatters.js";
import { Alert } from "../../shared/components/Alert.jsx";

const FIELD_GROUPS = [
  {
    title: "Event information",
    description: "Identify which event each participant belongs to.",
    fields: [
      ["EVENT_ID", "Event ID"],
      ["EVENT_NAME", "Event name"],
      ["CATEGORY", "Category"],
      ["EVENT_TYPE", "Event type"],
      ["EVENT_DATE", "Event date"],
      ["VENUE", "Venue"],
    ],
  },
  {
    title: "Registration information",
    description: "Registration, payment and fee details.",
    fields: [
      ["REGISTRATION_ID", "Registration ID"],
      ["REGISTRATION_CODE", "Registration code"],
      ["REGISTRATION_DATE", "Registration date"],
      ["REGISTRATION_TYPE", "Registration type"],
      ["REGISTRATION_STATUS", "Registration status"],
      ["PAYMENT_STATUS", "Payment status"],
      ["AMOUNT_DUE", "Amount due"],
      ["NUMBER_OF_MEMBERS", "Number of members"],
    ],
  },
  {
    title: "Participant information",
    description: "The primary registrant and additional team members appear as separate rows.",
    fields: [
      ["FIRST_NAME", "First name"],
      ["MIDDLE_NAME", "Middle name"],
      ["LAST_NAME", "Last name"],
      ["EMAIL", "Email"],
      ["PHONE_NUMBER", "Phone number"],
      ["COLLEGE_NAME", "College name"],
      ["COURSE", "Course"],
      ["PARTICIPANT_TYPE", "Participant type"],
    ],
  },
  {
    title: "Additional information",
    description: "Optional activity and status fields.",
    fields: [
      ["EVENT_FEE", "Event fee"],
      ["EVENT_ACTIVE_STATUS", "Event active status"],
      ["REGISTRATION_ACTIVE_STATUS", "Registration active status"],
      ["PARTICIPANT_ACTIVE_STATUS", "Participant active status"],
    ],
  },
];

const DEFAULT_FIELDS = [
  "EVENT_NAME",
  "REGISTRATION_CODE",
  "FIRST_NAME",
  "LAST_NAME",
  "EMAIL",
  "PHONE_NUMBER",
  "COLLEGE_NAME",
  "COURSE",
  "PARTICIPANT_TYPE",
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields.map(([key]) => key));

export function ParticipantDownloadsPage({ token, events = [] }) {
  const [exportType, setExportType] = useState("EVENT");
  const [eventId, setEventId] = useState(events[0]?.id ? String(events[0].id) : "");
  const [selectedFields, setSelectedFields] = useState(DEFAULT_FIELDS);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.id) === eventId),
    [events, eventId],
  );

  function toggleField(field) {
    setSelectedFields((current) => current.includes(field)
      ? current.filter((item) => item !== field)
      : [...current, field]);
  }

  function selectGroup(fields) {
    setSelectedFields((current) => {
      const allSelected = fields.every((field) => current.includes(field));
      return allSelected
        ? current.filter((field) => !fields.includes(field))
        : [...new Set([...current, ...fields])];
    });
  }

  async function downloadParticipants() {
    if (exportType === "EVENT" && !eventId) {
      setError("Select an event before generating the export.");
      return;
    }
    if (selectedFields.length === 0) {
      setError("Select at least one field to export.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    const request = {
      exportType,
      eventId: exportType === "EVENT" ? Number(eventId) : null,
      selectedFields,
    };

    try {
      const workbook = await apiBlobRequest(
        "/v1/admin/exports/participants",
        {
          token,
          method: "POST",
          body: request,
        },
      );

      const eventLabel = exportType === "EVENT"
        ? safeFilename(selectedEvent?.eventName || `event-${eventId}`)
        : "all-events";

      saveBlob(
        workbook,
        `participants-${eventLabel}-${dateStamp()}.xlsx`,
      );
      setNotice("Participant Excel workbook downloaded successfully.");
    } catch (downloadError) {
      setError(formatError(downloadError));
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <section className="page-heading participant-download-heading">
        <div>
          <div className="eyebrow">REPORTS & DATA EXPORT</div>
          <h1>Participant export</h1>
          <p>Build an Excel report for one event or combine participants from every event.</p>
        </div>
        <div className="participant-export-heading-meta">
          <span className="participant-export-meta-icon" aria-hidden="true">▤</span>
          <span>
            <strong>{events.length}</strong>
            <small>Events available</small>
          </span>
        </div>
      </section>

      {error && <Alert onDismiss={() => setError("")}>{error}</Alert>}
      {notice && <Alert variant="success" onDismiss={() => setNotice("")}>{notice}</Alert>}

      <section className="review-panel participant-builder-panel">
        <header className="panel-heading">
          <div>
            <h2>1. Choose export scope</h2>
            <p>Select an individual event or export participants across all events.</p>
          </div>
        </header>

        <div className="participant-export-mode-grid">
          <button
            type="button"
            className={`participant-export-mode ${exportType === "EVENT" ? "selected" : ""}`}
            onClick={() => setExportType("EVENT")}
            aria-pressed={exportType === "EVENT"}
          >
            <span className="participant-mode-icon" aria-hidden="true">◷</span>
            <span className="participant-mode-copy">
              <strong>Event-wise export</strong>
              <small>Export participants from one selected event.</small>
            </span>
            <span className="participant-mode-radio" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`participant-export-mode ${exportType === "ALL" ? "selected" : ""}`}
            onClick={() => setExportType("ALL")}
            aria-pressed={exportType === "ALL"}
          >
            <span className="participant-mode-icon" aria-hidden="true">▦</span>
            <span className="participant-mode-copy">
              <strong>Overall export</strong>
              <small>Combine participants from all events in one sheet.</small>
            </span>
            <span className="participant-mode-radio" aria-hidden="true" />
          </button>
        </div>

        {exportType === "EVENT" ? (
          <div className="participant-event-picker">
            <label className="participant-export-field" htmlFor="participant-event-select">
              Select event
              <select
                id="participant-event-select"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                disabled={events.length === 0}
              >
                <option value="">Choose an event</option>
                {events.map((event) => (
                  <option key={event.id} value={String(event.id)}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </label>
            {selectedEvent && (
              <div className="participant-selected-event">
                <span className="participant-selected-event-icon" aria-hidden="true">✓</span>
                <span>
                  <strong>{selectedEvent.eventName}</strong>
                  <small>
                    {selectedEvent.eventDateTime ? formatDateTime(selectedEvent.eventDateTime) : "Date not available"}
                    {" · "}
                    {selectedEvent.currentParticipants || 0} registered participants
                  </small>
                </span>
              </div>
            )}
            {events.length === 0 && (
              <p className="participant-inline-empty">No events are currently available.</p>
            )}
          </div>
        ) : (
          <div className="participant-overall-note">
            <span className="participant-overall-icon" aria-hidden="true">▦</span>
            <span>
              <strong>All events will be included</strong>
              <small>The workbook will contain one combined Participants worksheet. The Event Name field is recommended to identify each participant's event.</small>
            </span>
          </div>
        )}
      </section>

      <section className="review-panel participant-builder-panel">
        <header className="panel-heading participant-fields-heading">
          <div>
            <h2>2. Choose fields</h2>
            <p>Choose the columns you want in your Excel workbook. This selection works for both export modes.</p>
          </div>
          <div className="participant-field-count">
            <strong>{selectedFields.length}</strong>
            <span>of {ALL_FIELDS.length} selected</span>
          </div>
        </header>

        <div className="participant-field-toolbar">
          <span>{selectedFields.length === 0 ? "No fields selected" : `${selectedFields.length} columns will be included`}</span>
          <div>
            <button type="button" className="text-action" onClick={() => setSelectedFields(ALL_FIELDS)}>
              Select all
            </button>
            <span className="participant-toolbar-divider">·</span>
            <button type="button" className="text-action" onClick={() => setSelectedFields([])}>
              Clear all
            </button>
          </div>
        </div>

        <div className="participant-field-groups">
          {FIELD_GROUPS.map((group) => {
            const keys = group.fields.map(([key]) => key);
            const groupSelected = keys.every((key) => selectedFields.includes(key));
            return (
              <section className="participant-field-group" key={group.title}>
                <header>
                  <div>
                    <h3>{group.title}</h3>
                    <p>{group.description}</p>
                  </div>
                  <button type="button" className="text-action" onClick={() => selectGroup(keys)}>
                    {groupSelected ? "Clear group" : "Select group"}
                  </button>
                </header>
                <div className="participant-field-options">
                  {group.fields.map(([key, label]) => (
                    <label className="participant-field-option" key={key}>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(key)}
                        onChange={() => toggleField(key)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="participant-builder-footer">
          <div className="participant-export-summary">
            <span className="participant-summary-icon" aria-hidden="true">✓</span>
            <span>
              <strong>{exportType === "EVENT" ? "Event-wise workbook" : "Overall workbook"}</strong>
              <small>
                {exportType === "EVENT"
                  ? (selectedEvent?.eventName || "Select an event to continue")
                  : "All events · One combined Participants sheet"}
                {" · "}
                {selectedFields.length} selected columns
              </small>
            </span>
          </div>
          <button
            className="button button-primary participant-generate-button"
            type="button"
            onClick={downloadParticipants}
            disabled={working || selectedFields.length === 0 || (exportType === "EVENT" && !eventId)}
          >
            <span aria-hidden="true">↓</span>
            {working ? "Generating Excel…" : "Generate & download Excel"}
          </button>
        </footer>
      </section>

      <div className="participant-export-help">
        <strong>Participant rows</strong>
        <span>The primary registrant is included as the solo participant or team leader. Additional team members are included as separate rows and inherit the registration's event and registration details.</span>
      </div>
    </>
  );
}

function saveBlob(blob, filename) {
  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1500);
}

function safeFilename(value) {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
