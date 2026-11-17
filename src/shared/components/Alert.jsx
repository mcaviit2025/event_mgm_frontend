export function Alert({ children, onDismiss, variant = "error" }) {
  return (
    <div className={`alert alert-${variant}`} role={variant === "error" ? "alert" : "status"}>
      <span className="alert-icon" aria-hidden="true">
        {variant === "error" ? "!" : "✓"}
      </span>
      <span>{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  );
}
