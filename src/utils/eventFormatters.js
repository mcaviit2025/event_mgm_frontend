export function toLocalDateTimeInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function toApiDateTime(value) {
  return value || "";
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

export function formatError(error) {
  return error?.message || "Something went wrong. Please try again.";
}
