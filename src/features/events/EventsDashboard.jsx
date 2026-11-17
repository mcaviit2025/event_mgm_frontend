import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, apiBlobRequest } from "../../services/api.js";
import { formatError, toApiDateTime } from "../../utils/eventFormatters.js";
import { Alert } from "../../shared/components/Alert.jsx";
import { StatCard } from "../../shared/components/StatCard.jsx";
import { AdminLayout } from "../../shared/layout/AdminLayout.jsx";
import { LookupModal } from "../lookups/LookupModal.jsx";
import { EventFormModal } from "./components/EventFormModal.jsx";
import { EventsTable } from "./components/EventsTable.jsx";
import { PaymentReviewPage } from "../payments/PaymentReviewPage.jsx";
import { CollectionsPage } from "../collections/CollectionsPage.jsx";
import { ParticipantDownloadsPage } from "../participants/ParticipantDownloadsPage.jsx";
import { LookupManagementPage } from "../lookups/LookupManagementPage.jsx";

export function EventsDashboard({ token, user, onSignOut }) {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [eventModal, setEventModal] = useState(null);
  const [lookupModal, setLookupModal] = useState(null);
  const [activeSection, setActiveSection] = useState("events");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const [eventsResult, categoriesResult, typesResult] = await Promise.allSettled([
      apiRequest("/v1/admin/events", { token }),
      apiRequest("/v1/admin/categories", { token }),
      apiRequest("/v1/admin/event-types", { token }),
    ]);

    const errors = [];
    if (eventsResult.status === "fulfilled") {
      setEvents(Array.isArray(eventsResult.value) ? eventsResult.value : []);
    } else {
      errors.push(`Events: ${formatError(eventsResult.reason)}`);
    }

    if (categoriesResult.status === "fulfilled") {
      setCategories(normalizeOptions(categoriesResult.value));
    } else {
      errors.push(`Categories: ${formatError(categoriesResult.reason)}`);
    }

    if (typesResult.status === "fulfilled") {
      setEventTypes(normalizeOptions(typesResult.value));
    } else {
      errors.push(`Event types: ${formatError(typesResult.reason)}`);
    }

    setPageError(errors.join(" "));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refreshCurrentSection = useCallback(() => {
    if (activeSection === "events" || activeSection === "participants") {
      loadDashboard();
    } else {
      setRefreshKey((key) => key + 1);
    }
  }, [activeSection, loadDashboard]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return events;
    return events.filter((event) =>
      [event.eventName, event.venue, event.category?.name, event.eventType?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [events, query]);

  async function saveEvent(form) {
    const { id, ...values } = form;
    const requestBody = {
      ...values,
      eventDateTime: toApiDateTime(values.eventDateTime),
      registrationDeadline: toApiDateTime(values.registrationDeadline),
      eventFee: values.eventFee,
      maxParticipants: Number(values.maxParticipants),
      maxParticipantsPerGroup: Number(values.maxParticipantsPerGroup),
      eventTypeId: Number(values.eventTypeId),
      categoryId: Number(values.categoryId),
    };

    await apiRequest(id ? `/v1/admin/events/${id}` : "/v1/admin/events", {
      token,
      method: id ? "PUT" : "POST",
      body: requestBody,
    });
    setEventModal(null);
    setNotice(id ? "Event changes saved." : "Event created successfully.");
    await loadDashboard();
  }

  async function saveLookup(form) {
    const endpoint = lookupModal.kind === "category"
      ? "/v1/admin/categories"
      : "/v1/admin/event-types";
    const createdOption = await apiRequest(endpoint, { token, method: "POST", body: form });
    if (!createdOption?.id) {
      throw new Error("The API did not return the ID of the new option.");
    }
    setNotice(lookupModal.kind === "category" ? "Category added." : "Event type added.");
    await loadDashboard();
    return createdOption;
  }

  
async function deleteEvent(event) {
  if (
    !window.confirm(
      `Before deleting "${event.eventName}", an Excel backup of all participants will be downloaded. Continue?`
    )
  ) {
    return;
  }

  try {
    // Step 1: Prepare complete participant export request
    const exportRequest = {
      exportType: "EVENT",
      eventId: event.id,
      selectedFields: [
        "EVENT_ID",
        "EVENT_NAME",
        "REGISTRATION_ID",
        "FIRST_NAME",
        "MIDDLE_NAME",
        "LAST_NAME",
        "EMAIL",
        "PHONE_NUMBER",
        "COLLEGE_NAME",
        "PARTICIPANT_TYPE",
        "NUMBER_OF_MEMBERS"
      ]
    };

    // Step 2: Generate Excel backup BEFORE deleting the event
    const blob = await apiBlobRequest(
      "/v1/admin/exports/participants",
      {
        token,
        method: "POST",
        body: exportRequest
      }
    );

    // Step 3: Validate the Excel file
    if (!blob || blob.size === 0) {
      throw new Error("Participant backup is empty. Event deletion cancelled.");
    }

    const buffer = await blob.slice(0, 2).arrayBuffer();
    const signature = new Uint8Array(buffer);

    if (signature[0] !== 0x50 || signature[1] !== 0x4B) {
      throw new Error("Invalid Excel backup received. Event deletion cancelled.");
    }

    // Step 4: Download Excel backup
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `event-${event.id}-participants.xlsx`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    // Step 5: Confirm before deleting
    const confirmDelete = window.confirm(
      "The participant backup download has been initiated. Have you saved the Excel file? Continue with event deletion?"
    );

    if (!confirmDelete) {
      setNotice("Event deletion cancelled. Backup download was initiated.");
      return;
    }

    // Step 6: Delete event only after backup generation and confirmation
    await apiRequest(`/v1/admin/events/${event.id}`, {
      token,
      method: "DELETE"
    });

    setNotice("Participant backup generated and event deleted successfully.");

    await loadDashboard();

  } catch (error) {
    setPageError(formatError(error));
  }
}


  const registrationCount = events.reduce(
    (total, event) => total + (event.currentParticipants || 0),
    0,
  );

  return (
    <>
      
<AdminLayout
  user={user}
  onSignOut={onSignOut}
  onOpenLookup={(kind) => setLookupModal({ kind })}
  onRefresh={refreshCurrentSection}
  loading={loading}
  activeSection={activeSection}
  onNavigate={setActiveSection}
  headerAction={
    activeSection === "events" ? (
      <button
        className="button button-primary button-small"
        type="button"
        onClick={() => setEventModal({})}
      >
        <span aria-hidden="true">＋</span> Create event
      </button>
    ) : null
  }
>
  {pageError && (
    <Alert onDismiss={() => setPageError("")}>
      {pageError}
    </Alert>
  )}

  {notice && (
    <Alert variant="success" onDismiss={() => setNotice("")}>
      {notice}
    </Alert>
  )}

  {activeSection === "events" ? (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">EVENT MANAGEMENT</div>
          <h1>Your events</h1>
          <p>Plan, publish, and keep track of every gathering.</p>
        </div>

        <button
          className="button button-primary create-mobile"
          type="button"
          onClick={() => setEventModal({})}
        >
          ＋ Create event
        </button>
      </section>

      <section className="stats-grid" aria-label="Event statistics">
        <StatCard
          label="Active events"
          value={events.length}
          icon="◷"
          tone="violet"
          detail="Available in your workspace"
        />

        <StatCard
          label="Total registrations"
          value={registrationCount}
          icon="♙"
          tone="blue"
          detail="Across all events"
        />

        <StatCard
          label="Categories"
          value={categories.length}
          icon="⌘"
          tone="orange"
          detail="Available to assign"
        />

        <StatCard
          label="Event types"
          value={eventTypes.length}
          icon="◇"
          tone="green"
          detail="Available to assign"
        />
      </section>

      <EventsTable
        events={events}
        filteredEvents={filteredEvents}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        onEdit={setEventModal}
        onDelete={deleteEvent}
        onCreate={() => setEventModal({})}
      />

      <footer className="page-footer">
        <span>Gather Event Management</span>
        <span>
          Built for better gatherings{" "}
          <span className="footer-heart">♥</span>
        </span>
      </footer>
    </>
  ) : activeSection === "payments" ? (
    <PaymentReviewPage
      token={token}
      refreshKey={refreshKey}
      onNotice={setNotice}
    />
  ) : activeSection === "collections" ? (
    <CollectionsPage
      token={token}
      refreshKey={refreshKey}
    />
  ) : activeSection === "participants" ? (
    <ParticipantDownloadsPage
      token={token}
      events={events}
    />
  ) : activeSection === "categories" ? (
    <LookupManagementPage
      kind="category"
      items={categories}
      loading={loading}
      onCreate={() => setLookupModal({ kind: "category" })}
      onEdit={(item) =>
        setLookupModal({ kind: "category", item })
      }
      onToggleStatus={(item, activate) =>
        toggleLookupStatus("category", item, activate)
      }
      onDelete={(item) =>
        deleteLookup("category", item)
      }
    />
  ) : activeSection === "eventTypes" ? (
    <LookupManagementPage
      kind="event-type"
      items={eventTypes}
      loading={loading}
      onCreate={() => setLookupModal({ kind: "event-type" })}
      onEdit={(item) =>
        setLookupModal({ kind: "event-type", item })
      }
      onToggleStatus={(item, activate) =>
        toggleLookupStatus("event-type", item, activate)
      }
      onDelete={(item) =>
        deleteLookup("event-type", item)
      }
    />
  ) : null}
</AdminLayout>


      {eventModal && (
        <EventFormModal
          event={eventModal.id ? eventModal : null}
          categories={categories}
          eventTypes={eventTypes}
          onClose={() => setEventModal(null)}
          onSave={saveEvent}
          onCreateLookup={(kind, onCreated) => setLookupModal({ kind, onCreated })}
        />
      )}
      {lookupModal && (
        <LookupModal
          kind={lookupModal.kind}
          onClose={() => setLookupModal(null)}
          onSave={saveLookup}
          onCreated={lookupModal.onCreated}
        />
      )}
    </>
  );
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.filter((item) => (item.isActive ?? item.active ?? true) !== false);
}
