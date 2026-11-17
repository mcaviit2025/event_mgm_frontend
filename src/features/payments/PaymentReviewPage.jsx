import { useCallback, useEffect, useState } from "react";
import { apiBlobRequest, apiRequest } from "../../services/api.js";
import { formatAmount, formatDateTime, formatError } from "../../utils/eventFormatters.js";
import { Alert } from "../../shared/components/Alert.jsx";

export function PaymentReviewPage({ token, refreshKey, onNotice }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("PENDING");
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pageError, setPageError] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const response = await apiRequest("/v1/admin/payments", { token });
      setPayments(Array.isArray(response) ? response : []);
    } catch (error) {
      setPageError(formatError(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments, refreshKey]);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const filteredPayments = filter === "ALL"
    ? payments
    : payments.filter((payment) => payment.paymentStatus === filter);

  async function updateStatus(payment, paymentStatus) {
    if (paymentStatus === "REJECTED"
      && !window.confirm(`Reject the payment proof submitted by ${payment.studentName}?`)) {
      return;
    }
    setBusyId(payment.registrationId);
    setPageError("");
    try {
      await apiRequest(`/v1/admin/payments/${payment.registrationId}`, {
        token,
        method: "PATCH",
        body: { paymentStatus },
      });
      onNotice(`Payment ${paymentStatus === "VERIFIED" ? "verified" : "rejected"}.`);
      await loadPayments();
    } catch (error) {
      const message = formatError(error);
      setPageError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function viewProof(payment) {
    setPageError("");
    try {
      const image = await apiBlobRequest(
        `/v1/admin/payments/${payment.registrationId}/proof`,
        { token },
      );
      setPreview({
        url: URL.createObjectURL(image),
        studentName: payment.studentName,
        eventName: payment.eventName,
      });
    } catch (error) {
      setPageError(formatError(error));
    }
  }

  function closePreview() {
    setPreview(null);
  }

  const pendingCount = payments.filter((payment) => payment.paymentStatus === "PENDING").length;

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">PAYMENT OPERATIONS</div>
          <h1>Payment review</h1>
          <p>Review student payment screenshots and verify or reject each submission.</p>
        </div>
      </section>

      {pageError && <Alert onDismiss={() => setPageError("")}>{pageError}</Alert>}

      <section className="review-panel">
        <header className="panel-heading">
          <div>
            <h2>Registration payments <span className="count-pill">{pendingCount} pending</span></h2>
            <p>Only verified payments are included in collection totals.</p>
          </div>
          <label className="review-filter">
            <span>Show</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
              <option value="NOT_REQUIRED">No payment required</option>
              <option value="ALL">All statuses</option>
            </select>
          </label>
        </header>

        {loading ? (
          <div className="review-empty">Loading registration payments…</div>
        ) : filteredPayments.length === 0 ? (
          <div className="review-empty">
            {filter === "PENDING" ? "No payments are waiting for review." : "No registrations match this filter."}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="events-table review-table">
              <thead>
                <tr>
                  <th>STUDENT / TEAM</th>
                  <th>EVENT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>PROOF</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.registrationId}>
                    <td>
                      <div className="review-student">
                        <strong>{payment.studentName}</strong>
                        <small>{payment.email}</small>
                        <small>{payment.registrationType} · {payment.numberOfMembers} participant{payment.numberOfMembers === 1 ? "" : "s"} · {formatDateTime(payment.registeredAt)}</small>
                      </div>
                    </td>
                    <td>{payment.eventName}</td>
                    <td>{formatAmount(payment.amountDue)}</td>
                    <td><span className={`status-badge payment-status-${payment.paymentStatus.toLowerCase()}`}>{payment.paymentStatus}</span></td>
                    <td>
                      {payment.paymentProofAvailable ? (
                        <button className="text-action" type="button" onClick={() => viewProof(payment)}>View screenshot</button>
                      ) : <span className="proof-missing">{payment.paymentStatus === "NOT_REQUIRED" ? "Not required" : "No screenshot"}</span>}
                    </td>
                    <td>
                      <div className="payment-actions">
                        {payment.paymentStatus !== "VERIFIED" && payment.paymentStatus !== "NOT_REQUIRED" && (
                          <span title={payment.paymentProofAvailable ? "" : "A payment screenshot is required before verification."}>
                            <button
                              className="button button-primary button-small"
                              type="button"
                              disabled={busyId === payment.registrationId || !payment.paymentProofAvailable}
                              onClick={() => updateStatus(payment, "VERIFIED")}
                            >
                              Verify
                            </button>
                          </span>
                        )}
                        {payment.paymentStatus !== "REJECTED" && payment.paymentStatus !== "NOT_REQUIRED" && payment.paymentProofAvailable && (
                          <button
                            className="button button-secondary button-small reject-payment"
                            type="button"
                            disabled={busyId === payment.registrationId}
                            onClick={() => updateStatus(payment, "REJECTED")}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {preview && (
        <div className="modal-backdrop proof-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closePreview()}>
          <section className="modal-card proof-modal" role="dialog" aria-modal="true" aria-labelledby="proof-title">
            <header className="modal-header">
              <div>
                <div className="eyebrow">PAYMENT PROOF</div>
                <h2 id="proof-title">{preview.studentName}</h2>
                <p>{preview.eventName}</p>
              </div>
              <button className="close-button" type="button" onClick={closePreview} aria-label="Close">×</button>
            </header>
            <div className="proof-image-frame">
              <img src={preview.url} alt={`Payment screenshot submitted by ${preview.studentName}`} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
