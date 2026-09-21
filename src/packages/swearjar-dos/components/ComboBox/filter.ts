export type ComboBoxFilterOption = {
  value: string;
  label: string;
  hint?: string;
};

// The dropdown shows the first matches only: a long queue must not blow the
// popup.
export const MAX_SUGGESTIONS = 20;

// The dropdown's match: a case-insensitive substring over the option's key,
// label and hint (a ticket matches by "cmp-2" as well as by its title).
export function filterComboOptions<T extends ComboBoxFilterOption>(
  options: readonly T[],
  query: string,
): T[] {
  const text = query.trim().toLowerCase();
  if (text === "") return [...options].slice(0, MAX_SUGGESTIONS);
  return options
    .filter((option) =>
      `${option.value} ${option.label} ${option.hint ?? ""}`.toLowerCase().includes(text),
    )
    .slice(0, MAX_SUGGESTIONS);
}
