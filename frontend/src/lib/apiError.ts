/**
 * Safely extract a human-readable error message from an Axios error.
 *
 * FastAPI (Pydantic v2) returns validation errors as:
 *   { detail: [{type, loc, msg, input, url}, ...] }
 *
 * Other errors come as:
 *   { detail: "plain string message" }
 *
 * This helper always returns a plain string — safe to render as a React child.
 */
export function apiErrorMessage(error: any, fallback = "Something went wrong. Please try again."): string {
  const detail = error?.response?.data?.detail;

  if (!detail) return fallback;

  // Pydantic v2: array of validation error objects
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        if (typeof d === "string") return d;
        const field = Array.isArray(d.loc) ? d.loc.slice(1).join(" → ") : "";
        const msg = d.msg || String(d);
        return field ? `${field}: ${msg}` : msg;
      })
      .join(" · ");
  }

  // Plain string
  if (typeof detail === "string") return detail;

  // Fallback: stringify whatever came back
  return fallback;
}
