export function formatDate(iso: string, includeYear = false): string {
  if (!iso) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (includeYear) options.year = "numeric";
  return new Date(iso).toLocaleDateString("en-CA", options);
}
