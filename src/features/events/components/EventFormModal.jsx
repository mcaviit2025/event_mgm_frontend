import { useState } from "react";
import { Alert } from "../../../shared/components/Alert.jsx";
import { formatAmount, formatError, toLocalDateTimeInput } from "../../../utils/eventFormatters.js";

function createEmptyForm() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(18, 0, 0, 0);
  const deadline = new Date(start);
  deadline.setHours(deadline.getHours() - 3);

  return {
    eventName: "",
    venue: "",
    eventDateTime: toLocalDateTimeInput(start),
    registrationDeadline: toLocalDateTimeInput(deadline),
    description: "",
    eventFee: "0.00",
    maxParticipants: "50",
    maxParticipantsPerGroup: "1",
    registrationMode: "SOLO_ONLY",
    eventTypeId: "",
    categoryId: "",
  };
}

function createEventForm(event) {
  if (!event) return createEmptyForm();
  return {
    id: event.id,
    eventName: event.eventName || "",
    venue: event.venue || "",
    eventDateTime: (event.eventDateTime || "").slice(0, 16),
    registrationDeadline: (event.registrationDeadline || "").slice(0, 16),
    description: event.description || "",
    eventFee: formatAmount(event.eventFee),
    maxParticipants: String(event.maxParticipants ?? 50),
    maxParticipantsPerGroup: String(event.maxParticipantsPerGroup ?? 1),
    registrationMode: event.registrationMode || "SOLO_ONLY",
    eventTypeId: String(event.eventType?.id || ""),
    categoryId: String(event.category?.id || ""),
  };
}

export function EventFormModal({
  event,
  categories,
  eventTypes,
  onClose,
  onSave,
  onCreateLookup,
}) {
  const [form, setForm] = useState(() => createEventForm(event));
  const [validationErrors, setValidationErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "registrationMode") {
        if (value === "SOLO_ONLY") next.maxParticipantsPerGroup = "1";
        if (value === "GROUP_ONLY" && Number(current.maxParticipantsPerGroup) < 2) {
          next.maxParticipantsPerGroup = "2";
        }
      }
      return next;
    });
    setValidationErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function submit(submitEvent) {
    submitEvent.preventDefault();
    setSubmitting(true);
    setError("");
    setValidationErrors({});
    try {
      await onSave(form);
    } catch (saveError) {
      setError(
        Object.keys(saveError.validationErrors || {}).length
          ? "Please review the highlighted fields and try again."
          : formatError(saveError),
      );
      setValidationErrors(saveError.validationErrors || {});
    } finally {
      setSubmitting(false);
    }
  }

  const fieldError = (name) =>
    validationErrors[name] && <small className="field-error">{validationErrors[name]}</small>;
  const dateMinimum = toLocalDateTimeInput(new Date());
  const groupOnly = form.registrationMode === "GROUP_ONLY";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
        <header className="modal-header">
          <div>
            <div className="eyebrow">{event ? "EVENT DETAILS" : "NEW EVENT"}</div>
            <h2 id="event-modal-title">{event ? "Edit event" : "Create an event"}</h2>
            <p>Set the details, schedule and registration options for your event.</p>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        {error && <div className="modal-error"><Alert>{error}</Alert></div>}
        {Object.keys(validationErrors).length > 0 && (
          <ul className="validation-summary">
            {Object.entries(validationErrors).filter(([, message]) => message).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="event-form">
          <div className="form-section-title"><span>01</span> Event details</div>
          <div className="form-grid">
            <label className="field-wide">
              Event name
              <input required minLength="3" maxLength="100" value={form.eventName} onChange={(event) => update("eventName", event.target.value)} placeholder="e.g. Design community meetup" />
              {fieldError("eventName")}
            </label>
            <label className="field-wide">
              Description
              <textarea required minLength="10" maxLength="1000" rows="3" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Tell people what makes this event special…" />
              <small className="field-hint">{form.description.length}/1000 characters</small>
              {fieldError("description")}
            </label>
            <label>
              Venue
              <input required minLength="3" maxLength="100" value={form.venue} onChange={(event) => update("venue", event.target.value)} placeholder="Venue or location" />
              {fieldError("venue")}
            </label>
            <label>
              Event fee <span className="label-hint">Zero means free</span>
              <div className="input-prefix">
                <span aria-hidden="true">¤</span>
                <input required type="number" min="0" max="99999999.99" step="0.01" value={form.eventFee} onChange={(event) => update("eventFee", event.target.value)} aria-label="Event fee amount" />
              </div>
              <small className="field-hint">Enter the amount in your event’s currency.</small>
              {fieldError("eventFee")}
            </label>
          </div>

          <div className="form-section-title"><span>02</span> Schedule</div>
          <div className="form-grid">
            <label>
              Event date &amp; time
              <input required type="datetime-local" min={dateMinimum} value={form.eventDateTime} onChange={(event) => update("eventDateTime", event.target.value)} />
              {fieldError("eventDateTime")}
            </label>
            <label>
              Registration deadline
              <input required type="datetime-local" min={dateMinimum} value={form.registrationDeadline} onChange={(event) => update("registrationDeadline", event.target.value)} />
              {fieldError("registrationDeadline")}
            </label>
            <p className="form-note field-wide">Registration must close at least 2 hours before the event begins.</p>
          </div>

          <div className="form-section-title"><span>03</span> Registration &amp; classification</div>
          <div className="form-grid">
            <label>
              Registration mode
              <select value={form.registrationMode} onChange={(event) => update("registrationMode", event.target.value)}>
                <option value="SOLO_ONLY">Solo only</option>
                <option value="GROUP_ONLY">Groups only</option>
                <option value="BOTH">Solo &amp; groups</option>
              </select>
            </label>
            <label>
              Maximum participants
              <input required type="number" min="1" max="10000" value={form.maxParticipants} onChange={(event) => update("maxParticipants", event.target.value)} />
              {fieldError("maxParticipants")}
            </label>
            <label>
              Participants per group
              <input required type="number" min={groupOnly ? "2" : "1"} max="50" value={form.maxParticipantsPerGroup} onChange={(event) => update("maxParticipantsPerGroup", event.target.value)} disabled={form.registrationMode === "SOLO_ONLY"} />
              {fieldError("maxParticipantsPerGroup")}
            </label>
            <label>
              Event type
              <div className="select-action">
                <select required value={form.eventTypeId} onChange={(event) => update("eventTypeId", event.target.value)}>
                  <option value="">Select event type</option>
                  {eventTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
                <button type="button" title="Add event type" aria-label="Add event type" onClick={() => onCreateLookup("event-type", (created) => update("eventTypeId", String(created.id)))}>＋</button>
              </div>
              {fieldError("eventTypeId")}
              {eventTypes.length === 0 && <small className="field-hint">Add an event type to continue.</small>}
            </label>
            <label>
              Category
              <div className="select-action">
                <select required value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <button type="button" title="Add category" aria-label="Add category" onClick={() => onCreateLookup("category", (created) => update("categoryId", String(created.id)))}>＋</button>
              </div>
              {fieldError("categoryId")}
              {categories.length === 0 && <small className="field-hint">Add a category to continue.</small>}
            </label>
          </div>

          <footer className="modal-footer">
            <span className="required-note"><span>*</span> Required fields</span>
            <div>
              <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? "Saving…" : event ? "Save changes" : "Create event"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
