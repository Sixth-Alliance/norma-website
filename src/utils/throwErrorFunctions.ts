type UnknownResponse = any;

/**
 * General purpose error message extractor for backend responses
 * Backend format: {success: false, message: string, errors: {...}}
 */
function extractErrorMessage(response: UnknownResponse, defaultMsg: string): string {
  if (!response) return defaultMsg;

  // Backend standard format: {success: false, message: string, errors: {...}}
  if (response?.message) return response.message;

  // Check for errors object with field-level validation errors
  if (response?.errors && typeof response.errors === "object") {
    const msgs: string[] = [];
    for (const [field, error] of Object.entries(response.errors)) {
      if (typeof error === "string") {
        msgs.push(error);
      } else if (Array.isArray(error)) {
        msgs.push(...error.map(String));
      }
    }
    if (msgs.length > 0) return msgs.join(". ");
  }

  // Legacy fallback for older formats
  const validation = response?.error?.validation || response?.error;
  if (validation) {
    const msgs: string[] = [];
    if (typeof validation === "string") msgs.push(validation);
    if (validation?.message) msgs.push(String(validation.message));
    if (Array.isArray(validation)) msgs.push(...validation.map(String));
    if (typeof validation === "object") {
      for (const v of Object.values(validation)) {
        if (typeof v === "string") msgs.push(v);
        else if (Array.isArray(v)) msgs.push(...v.map(String));
      }
    }
    if (msgs.length > 0) return msgs.join(". ");
  }

  // Final fallback
  return response?.msg || defaultMsg;
}

// Extracts error information from a backend response and throws a JS Error.
// This helper is defensive and safe when `response` is null/undefined.
export function extractAndThrowLoginError(response: UnknownResponse): never {
  const defaultMsg = "Login failed. Please try again.";
  const message = extractErrorMessage(response, defaultMsg);
  throw new Error(message);
}

export function extractAndThrowVerifyOTPError(response: UnknownResponse): never {
  const defaultMsg = "Verification failed. Please check your code and try again.";
  const message = extractErrorMessage(response, defaultMsg);
  throw new Error(message);
}

export default { extractAndThrowLoginError, extractAndThrowVerifyOTPError };
