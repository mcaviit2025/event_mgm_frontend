
import { useEffect, useState } from "react";

export function Alert({
  children,
  onDismiss,
  variant = "error",
  duration = 4500
}) {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  function dismiss() {
    if (closing) return;

    setClosing(true);

    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 250);
  }

  if (!visible) return null;

  const notificationDetails = {
    success: { icon: "✓", title: "Success" },
    error: { icon: "✕", title: "Error" },
    warning: { icon: "!", title: "Warning" },
    info: { icon: "i", title: "Information" }
  };

  const details = notificationDetails[variant] || notificationDetails.info;

  return (
    <div
      className={`alert alert-${variant} ${closing ? "alert-closing" : "alert-enter"}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <span className="alert-icon" aria-hidden="true">
        {details.icon}
      </span>

      <div className="alert-content">
        <strong className="alert-title">{details.title}</strong>
        <span className="alert-message">{children}</span>
      </div>

      <button
        type="button"
        className="alert-close"
        onClick={dismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>

      {duration > 0 && (
        <div
          className="alert-progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
}
