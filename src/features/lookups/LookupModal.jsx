import { useEffect, useState } from "react";
import { Alert } from "../../shared/components/Alert.jsx";
import { formatError } from "../../utils/eventFormatters.js";

export function LookupModal({ kind, item = null, onClose, onSave, onCreated }) {
  const label = kind === "category" ? "category" : "event type";
  const editing = Boolean(item?.id);
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm({ name: item?.name || "", description: item?.description || "" });
  }, [item]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };
      if (editing) payload.isActive = item.isActive ?? item.active ?? true;
      const savedOption = await onSave(payload);
      if (!editing) onCreated?.(savedOption);
      onClose();
    } catch (saveError) {
      setError(formatError(saveError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop lookup-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}>
      <section className="modal-card lookup-modal" role="dialog" aria-modal="true" aria-labelledby="lookup-title">
        <header className="modal-header">
          <div>
            <div className="eyebrow">CLASSIFICATION</div>
            <h2 id="lookup-title">{editing ? "Edit" : "Add"} {label}</h2>
            <p>{editing ? `Update the ${label} details.` : `Create a new option for your event.`}</p>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close" disabled={submitting}>×</button>
        </header>
        {error && <div className="modal-error"><Alert>{error}</Alert></div>}
        <form className="lookup-form" onSubmit={submit}>
          <label>
            Name
            <input
              required minLength="2" maxLength="50" pattern="[a-zA-Z0-9 ]+"
              title="Use 2–50 letters, numbers or spaces."
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={`e.g. ${kind === "category" ? "Community" : "Workshop"}`}
            />
          </label>
          <label>
            Description <span className="label-hint">Optional</span>
            <textarea
              maxLength="255" rows="3" value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="A short description"
            />
          </label>
          <footer className="modal-footer">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? "Saving…" : editing ? `Save ${label}` : `Add ${label}`}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
