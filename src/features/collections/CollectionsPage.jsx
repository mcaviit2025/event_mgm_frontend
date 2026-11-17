import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { formatAmount, formatError } from "../../utils/eventFormatters.js";
import { Alert } from "../../shared/components/Alert.jsx";
import { StatCard } from "../../shared/components/StatCard.jsx";

export function CollectionsPage({ token, refreshKey }) {
  const [collections, setCollections] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCollections(await apiRequest("/v1/admin/collections", { token }));
    } catch (loadError) {
      setError(formatError(loadError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections, refreshKey]);

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">FINANCIAL OVERVIEW</div>
          <h1>Event collections</h1>
          <p>Verified payment totals by event and across your entire event program.</p>
        </div>
      </section>

      {error && <Alert onDismiss={() => setError("")}>{error}</Alert>}
      {loading && !collections ? (
        <div className="review-empty">Loading collection totals…</div>
      ) : collections ? (
        <>
          <section className="stats-grid collection-stats" aria-label="Collection totals">
            <StatCard label="Total collected" value={formatAmount(collections.amountCollected)} icon="$" tone="green" detail="Verified payments only" />
            <StatCard label="Registrations" value={collections.registrationCount} icon="♙" tone="blue" detail="Across all events" />
            <StatCard label="Verified payments" value={collections.verifiedPaymentCount} icon="✓" tone="violet" detail="Free registrations have no charge" />
          </section>

          <section className="review-panel">
            <header className="panel-heading">
              <div>
                <h2>Event-wise collection</h2>
                <p>Group registrations are charged once per group. Pending and rejected payments are excluded.</p>
              </div>
            </header>
            {collections.events.length === 0 ? (
              <div className="review-empty">Create an event to start tracking collections.</div>
            ) : (
              <div className="table-scroll">
                <table className="events-table collection-table">
                  <thead>
                    <tr>
                      <th>EVENT</th>
                      <th>FEE</th>
                      <th>REGISTRATIONS</th>
                      <th>VERIFIED</th>
                      <th>PENDING</th>
                      <th>COLLECTED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.events.map((event) => (
                      <tr key={event.eventId}>
                        <td><strong>{event.eventName}</strong></td>
                        <td>{Number(event.eventFee) === 0 ? "Free" : formatAmount(event.eventFee)}</td>
                        <td>{event.registrationCount}</td>
                        <td>{event.verifiedPaymentCount}</td>
                        <td>{event.pendingPaymentCount}</td>
                        <td><strong>{formatAmount(event.amountCollected)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
