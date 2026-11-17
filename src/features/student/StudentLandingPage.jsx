import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { formatAmount, formatDateTime, formatError } from "../../utils/eventFormatters.js";
import { Alert } from "../../shared/components/Alert.jsx";
import { Brand } from "../../shared/components/Brand.jsx";
import { RegistrationModal } from "./components/RegistrationModal.jsx";
import "./student.css";

export function StudentLandingPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [confirmation, setConfirmation] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/v1/events");
      setEvents(Array.isArray(response) ? response : []);
    } catch (loadError) {
      setError(formatError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const visibleEvents = useMemo(() => {
    const search = query.trim().toLowerCase();
    const now = new Date();
    return events.filter((event) => {
      const isOpen = event.isRegistrationOpen &&
        event.status === "OPEN" &&
        new Date(event.registrationDeadline) > now &&
        Number(event.availableSlots) > 0 &&
        (event.registrationMode !== "GROUP_ONLY" || Number(event.availableSlots) >= 2);
      const matchesSearch = !search ||
        [event.eventName, event.venue, event.description, event.category?.name, event.eventType?.name]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search));
      return isOpen && matchesSearch;
    });
  }, [events, query]);

  async function submitRegistration(payload, registrationType, paymentScreenshot) {
    const formData = new FormData();
    formData.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    if (paymentScreenshot) {
      formData.append("paymentScreenshot", paymentScreenshot);
    }
    const response = await apiRequest(
      `/v1/registrations/${registrationType}`,
      { method: "POST", body: formData },
    );
    const registrant = response?.name ? ` for ${response.name}` : "";
    setSelectedEvent(null);
    setConfirmation(`Registration received${registrant}. Your registration is pending confirmation.`);
    await loadEvents();
  }

  return (
    <div className="student-site">
      <header className="student-header">
        <div className="student-header-inner">
          <Brand />
          <nav className="student-nav" aria-label="Main navigation">
            <a className="student-nav-active" href="#events">Explore events</a>
            <a href="#about">About</a>
          </nav>
          <a className="student-admin-link" href="/admin">Organizer sign in <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main>
        <section className="student-hero">
          <div className="student-hero-content">
            <div className="student-eyebrow"><span /> IDEAS, PEOPLE, EXPERIENCES</div>
            <h1>Find your next<br /><em>great experience.</em></h1>
            <p>Discover what’s happening around you. Learn something new, meet your people, and make it count.</p>
            <a className="student-hero-cta" href="#events">Explore upcoming events <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-circle circle-one" />
            <div className="hero-art-circle circle-two" />
            <div className="hero-art-circle circle-three" />
            <div className="hero-spark">✳</div>
            <div className="hero-caption"><span>YOUR NEXT CHAPTER</span><strong>starts here.</strong></div>
          </div>
          <div className="hero-bottom"><span>CURATED FOR CURIOUS MINDS</span><span>SCROLL TO DISCOVER ↓</span></div>
        </section>

        <section className="student-events-section" id="events">
          <div className="student-section-heading">
            <div>
              <div className="student-eyebrow dark-eyebrow">THE EVENT BOARD</div>
              <h2>Open for registration<span>.</span></h2>
              <p>Find an event that speaks to you. Your next opportunity is one registration away.</p>
            </div>
            <label className="student-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(inputEvent) => setQuery(inputEvent.target.value)}
                placeholder="Search events"
                aria-label="Search events"
              />
            </label>
          </div>

          {error && <Alert onDismiss={() => setError("")}>{error}</Alert>}
          {confirmation && (
            <Alert variant="success" onDismiss={() => setConfirmation("")}>{confirmation}</Alert>
          )}

          {loading ? (
            <div className="student-loading"><span className="student-spinner" />Finding upcoming events…</div>
          ) : visibleEvents.length ? (
            <div className="student-event-grid">
              {visibleEvents.map((event, index) => (
                <article className="student-event-card" key={event.id}>
                  <div className={`event-card-art art-tone-${index % 4}`}>
                    <span className="event-card-category">{event.category?.name || "Featured event"}</span>
                    <span className="event-card-glyph" aria-hidden="true">{["✳", "◈", "✦", "⌘"][index % 4]}</span>
                    <span className="event-card-date">{formatDateTime(event.eventDateTime)}</span>
                  </div>
                  <div className="event-card-body">
                    <div className="event-card-meta">
                      <span>{event.eventType?.name || event.registrationMode?.replaceAll("_", " ")}</span>
                      <span>{Number(event.eventFee || 0) === 0 ? "Free" : formatAmount(event.eventFee)}</span>
                    </div>
                    <h3>{event.eventName}</h3>
                    <p className="event-card-description">{event.description}</p>
                    <div className="event-card-footer">
                      <span className="event-venue"><span aria-hidden="true">⌖</span>{event.venue}</span>
                      <button type="button" className="register-button" onClick={() => setSelectedEvent(event)}>
                        Register <span aria-hidden="true">→</span>
                      </button>
                    </div>
                    <div className="event-slots">
                      <span><i style={{ width: `${Math.min(100, Math.max(0, ((event.maxParticipants - event.availableSlots) / event.maxParticipants) * 100))}%` }} /></span>
                      <small>{event.availableSlots} places left</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="student-empty">
              <span className="empty-spark" aria-hidden="true">✳</span>
              <h3>{query ? "No events match your search" : "New experiences are on the way"}</h3>
              <p>{query ? "Try another search term." : "There are no open events right now. Check back soon for what’s next."}</p>
              {query && <button type="button" className="clear-search" onClick={() => setQuery("")}>Clear search</button>}
            </div>
          )}
        </section>

        <section className="student-about" id="about">
          <div><div className="student-eyebrow">MAKE YOUR MOMENT</div><h2>Show up curious.<br /><em>Leave inspired.</em></h2></div>
          <p>From hands-on workshops to community gatherings, discover spaces where new ideas and good people come together.</p>
        </section>
      </main>

      <footer className="student-footer">
        <Brand />
        <span>Find your people. Find your next thing.</span>
        <a href="/admin">Organizer sign in ↗</a>
      </footer>

      {selectedEvent && (
        <RegistrationModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSubmit={submitRegistration}
        />
      )}
    </div>
  );
}
