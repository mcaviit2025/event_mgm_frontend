import { useRef, useState } from "react";
import { Alert } from "../../../shared/components/Alert.jsx";
import { formatAmount, formatError, formatDateTime } from "../../../utils/eventFormatters.js";

const emptyParticipant = () => ({
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  collegeName: "",
  course: "",
});

const participantFields = [
  { name: "firstName", label: "First name", minLength: 2, maxLength: 50 },
  { name: "middleName", label: "Middle name", optional: true, maxLength: 50 },
  { name: "lastName", label: "Last name", minLength: 2, maxLength: 50 },
  { name: "email", label: "Email address", type: "email", maxLength: 100 },
  { name: "phoneNumber", label: "Phone number", type: "tel", pattern: "\\+?[0-9]{10,15}", placeholder: "+15551234567" },
  { name: "collegeName", label: "College or institution", minLength: 3, maxLength: 100, wide: true },
  { name: "course", label: "Course or program", minLength: 2, maxLength: 50, wide: true },
];

function RegistrationModal({ event, onClose, onSubmit }) {
  const [registrationType, setRegistrationType] = useState(
    event.registrationMode === "GROUP_ONLY" ? "group" : "solo",
  );
  const [step, setStep] = useState(0);
  const [solo, setSolo] = useState(emptyParticipant);
  const [leader, setLeader] = useState(emptyParticipant);
  const [teamMembers, setTeamMembers] = useState([emptyParticipant()]);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const isPaid = Number(event.eventFee || 0) > 0;
  const groupAllowed = event.registrationMode !== "SOLO_ONLY" &&
    Number(event.maxParticipantsPerGroup) >= 2 &&
    Number(event.availableSlots) >= 2;
  const soloAllowed = event.registrationMode !== "GROUP_ONLY";
  const maxGroupSize = Math.min(
    Number(event.maxParticipantsPerGroup || 0),
    Number(event.availableSlots || 0),
  );
  const maxTeamMembers = Math.max(0, maxGroupSize - 1);
  const participantErrors = validationErrors || {};
  const rosterSize = registrationType === "group" ? teamMembers.length + 1 : 1;

  function updateParticipant(setParticipant, participant, field, value) {
    setParticipant({ ...participant, [field]: value });
    setValidationErrors({});
    setError("");
  }

  function addTeamMember() {
    setTeamMembers((members) => members.length < maxTeamMembers
      ? [...members, emptyParticipant()]
      : members);
  }

  function removeTeamMember(index) {
    setTeamMembers((members) => members.filter((_, currentIndex) => currentIndex !== index));
    setValidationErrors({});
  }

  function getRosterEmailError() {
    if (registrationType !== "group") return "";
    const emails = [leader, ...teamMembers]
      .map((participant) => participant.email.trim().toLowerCase())
      .filter(Boolean);
    return emails.length === new Set(emails).size
      ? ""
      : "Each group participant must use a different email address.";
  }

  function continueToPayment() {
    if (!formRef.current?.reportValidity()) return;
    if (registrationType === "group" && rosterSize > Number(event.maxParticipantsPerGroup)) {
      setError(`This group can have at most ${event.maxParticipantsPerGroup} participants, including the leader.`);
      return;
    }
    const emailError = getRosterEmailError();
    if (emailError) {
      setError(emailError);
      return;
    }
    setError("");
    setValidationErrors({});
    setStep(1);
  }

  async function submit(formEvent) {
    formEvent.preventDefault();
    if (step === 0) {
      continueToPayment();
      return;
    }

    setSubmitting(true);
    setError("");
    setValidationErrors({});

    const payload = registrationType === "solo"
      ? {
          eventId: event.id,
          firstName: solo.firstName,
          middleName: solo.middleName,
          lastName: solo.lastName,
          email: solo.email,
          phoneNumber: solo.phoneNumber,
          collegeName: solo.collegeName,
          course: solo.course,
        }
      : {
          eventId: event.id,
          leader,
          teamMembers,
        };

    try {
      await onSubmit(payload, registrationType, paymentScreenshot);
    } catch (submitError) {
      setError(formatError(submitError));
      setValidationErrors(submitError.validationErrors || {});
    } finally {
      setSubmitting(false);
    }
  }

  function renderParticipant(participant, setParticipant, prefix, group = false) {
    return (
      <div className="participant-grid">
        {participantFields.map((field) => {
          const inputId = `${prefix}${field.name}`;
          const key = `${prefix}${field.name}`;
          const backendError = participantErrors[key];
          return (
            <label key={key} className={field.wide ? "participant-wide" : ""} htmlFor={inputId}>
              <span>{field.label}{field.optional && <span className="optional-label">Optional</span>}</span>
              <input
                id={inputId}
                name={inputId}
                type={field.type || "text"}
                required={!field.optional}
                minLength={field.minLength}
                maxLength={field.maxLength}
                pattern={
                  field.pattern
                    ? field.pattern
                    : group && field.name === "email"
                      ? "[A-Za-z0-9+_.-]+@(.+)"
                    : group && ["firstName", "lastName", "middleName"].includes(field.name)
                      ? field.name === "middleName" ? "[A-Za-z ]*" : "[A-Za-z ]+"
                      : undefined
                }
                value={participant[field.name]}
                onChange={(inputEvent) => updateParticipant(
                  setParticipant,
                  participant,
                  field.name,
                  inputEvent.target.value,
                )}
                placeholder={field.placeholder || ""}
                autoComplete={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "off"}
                aria-invalid={Boolean(backendError)}
                aria-describedby={backendError ? `${inputId}-error` : undefined}
              />
              {backendError && <small className="field-error" id={`${inputId}-error`}>{backendError}</small>}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop student-modal-backdrop"
      role="presentation"
      onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}
    >
      <section className="modal-card registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title">
        <header className="modal-header registration-header">
          <div>
            <div className="eyebrow">EVENT REGISTRATION</div>
            <h2 id="registration-title">{event.eventName}</h2>
            <p>{formatDateTime(event.eventDateTime)} <span>·</span> {event.venue}</p>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="registration-summary">
          <span>{isPaid ? `${formatAmount(event.eventFee)} per registration` : "Free event"}</span>
          <span>{event.availableSlots} places available</span>
        </div>

        <ol className="registration-stepper" aria-label="Registration steps">
          <li className={step === 0 ? "current" : "complete"}>
            <span>{step === 0 ? "1" : "✓"}</span>
            <div><strong>Participants</strong><small>Contact and student details</small></div>
          </li>
          <li className={step === 1 ? "current" : ""}>
            <span>2</span>
            <div><strong>{isPaid ? "Payment" : "Review"}</strong><small>{isPaid ? "Upload payment proof" : "Confirm registration"}</small></div>
          </li>
        </ol>

        {error && <div className="registration-error"><Alert>{error}</Alert></div>}
        {Object.keys(validationErrors).length > 0 && (
          <ul className="validation-summary" role="alert">
            {Object.entries(validationErrors).map(([field, message]) => (
              <li key={field}>{field}: {message}</li>
            ))}
          </ul>
        )}

        <form ref={formRef} className="registration-form" onSubmit={submit} noValidate={false}>
          {step === 0 ? (
            <>
              {groupAllowed && soloAllowed && (
                <fieldset className="registration-type-picker">
                  <legend>Choose how you’re registering</legend>
                  <label className={registrationType === "solo" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="registrationType"
                      value="solo"
                      checked={registrationType === "solo"}
                      onChange={() => {
                        setRegistrationType("solo");
                        setValidationErrors({});
                        setError("");
                      }}
                    />
                    <span><strong>Individual</strong><small>Register one participant</small></span>
                  </label>
                  <label className={registrationType === "group" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="registrationType"
                      value="group"
                      checked={registrationType === "group"}
                      onChange={() => {
                        setRegistrationType("group");
                        setValidationErrors({});
                        setError("");
                      }}
                    />
                    <span><strong>Group</strong><small>Register your team together</small></span>
                  </label>
                </fieldset>
              )}

              {registrationType === "solo" ? (
                <section className="participant-section">
                  <div className="participant-section-heading">
                    <span>01</span>
                    <div><strong>Participant details</strong><small>Fields marked optional can be left blank.</small></div>
                  </div>
                  {renderParticipant(solo, setSolo, "", false)}
                </section>
              ) : (
                <>
                  <section className="participant-section">
                    <div className="participant-section-heading">
                      <span>01</span>
                      <div><strong>Group leader · Participant 1</strong><small>Leader details are saved with the group registration.</small></div>
                    </div>
                    {renderParticipant(leader, setLeader, "leader.", true)}
                  </section>
                  <section className="participant-section teammate-roster">
                    <div className="participant-section-heading teammate-roster-heading">
                      <span>02</span>
                      <div>
                        <strong>Teammates</strong>
                        <small>Add each teammate below. At least one teammate is required.</small>
                      </div>
                      <span className="roster-count">{teamMembers.length + 1}/{maxGroupSize}</span>
                    </div>
                    {teamMembers.map((member, index) => (
                      <section className="teammate-card" key={index}>
                        <div className="participant-section-heading">
                          <span>{String(index + 2).padStart(2, "0")}</span>
                          <div><strong>Teammate {index + 1}</strong><small>Saved as a team member for this registration.</small></div>
                          {teamMembers.length > 1 && (
                            <button className="remove-member" type="button" onClick={() => removeTeamMember(index)}>
                              Remove teammate
                            </button>
                          )}
                        </div>
                        {renderParticipant(
                          member,
                          (updated) => setTeamMembers((members) => members.map(
                            (current, memberIndex) => memberIndex === index ? updated : current,
                          )),
                          `teamMembers[${index}].`,
                          true,
                        )}
                      </section>
                    ))}
                    <button
                      className="add-member-button add-teammate-button"
                      type="button"
                      onClick={addTeamMember}
                      disabled={teamMembers.length >= maxTeamMembers}
                      title={teamMembers.length >= maxTeamMembers ? "The maximum group size has been reached." : ""}
                    >
                      <span aria-hidden="true">＋</span> Add another teammate
                    </button>
                    <p className="group-size-note" aria-live="polite">
                      {teamMembers.length} teammate{teamMembers.length === 1 ? "" : "s"} added · {rosterSize} of {maxGroupSize} total participants, including the leader.
                      {teamMembers.length >= maxTeamMembers && " Maximum group size reached."}
                    </p>
                  </section>
                </>
              )}
            </>
          ) : (
            <section className="participant-section registration-payment-step">
              <div className="participant-section-heading">
                <span>02</span>
                <div>
                  <strong>{isPaid ? "Payment details" : "Review your registration"}</strong>
                  <small>
                    {isPaid
                      ? "Upload a clear screenshot so the organizer can verify your payment."
                      : "This event is free. Confirm your participant details to finish."}
                  </small>
                </div>
              </div>

              <div className="registration-review-card">
                <div><span>Event</span><strong>{event.eventName}</strong></div>
                <div><span>Registration</span><strong>{registrationType === "group" ? `Group · ${rosterSize} participants` : "Individual"}</strong></div>
                <div><span>Event fee</span><strong>{isPaid ? formatAmount(event.eventFee) : "Free"}</strong></div>
                {registrationType === "group" && isPaid && (
                  <p>The fee is charged once for the entire group, not per participant.</p>
                )}
              </div>

              {isPaid && (
                <label className="payment-upload" htmlFor="payment-screenshot">
                  <span className="payment-upload-icon" aria-hidden="true">↑</span>
                  <strong>Payment screenshot <span>Required</span></strong>
                  <small>PNG, JPG, or GIF · Maximum 5 MB</small>
                  <input
                    id="payment-screenshot"
                    type="file"
                    required
                    accept="image/png,image/jpeg,image/gif"
                    onChange={(inputEvent) => {
                      const selectedFile = inputEvent.target.files?.[0] || null;
                      if (selectedFile?.size > 5 * 1024 * 1024) {
                        setPaymentScreenshot(null);
                        setError("Payment screenshot must be 5 MB or smaller.");
                        inputEvent.target.value = "";
                        return;
                      }
                      setError("");
                      setPaymentScreenshot(selectedFile);
                    }}
                  />
                  {paymentScreenshot && (
                    <span className="selected-proof">
                      <strong>{paymentScreenshot.name}</strong>
                      <small>{(paymentScreenshot.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload</small>
                    </span>
                  )}
                  {validationErrors.paymentScreenshot && (
                    <small className="field-error">{validationErrors.paymentScreenshot}</small>
                  )}
                </label>
              )}
            </section>
          )}

          <footer className="modal-footer registration-footer">
            {step === 1 ? (
              <button type="button" className="button button-secondary" onClick={() => setStep(0)}>
                Back to details
              </button>
            ) : (
              <button type="button" className="button button-secondary" onClick={onClose}>
                Cancel
              </button>
            )}
            {step === 0 ? (
              <button type="button" className="button button-primary" onClick={continueToPayment}>
                Continue <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit registration"} <span aria-hidden="true">→</span>
              </button>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}

export { RegistrationModal };
