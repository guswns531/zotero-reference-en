export function normalizeError(error: unknown, context: string) {
  if (error instanceof Error) {
    error.message = `[${context}] ${error.message}`;
    return error;
  }

  return new Error(`[${context}] ${String(error)}`);
}

export function reportError(error: unknown, context: string) {
  const normalized = normalizeError(error, context);
  try {
    Zotero.logError(normalized);
  } catch {}
  try {
    console.error(normalized);
  } catch {}
  return normalized;
}
