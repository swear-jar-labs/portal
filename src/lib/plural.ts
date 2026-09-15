export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

export const DEFAULT_LOCALE = "en";

const rulesByLocale = new Map<string, Intl.PluralRules>();

function rulesFor(locale: string): Intl.PluralRules {
  let rules = rulesByLocale.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    rulesByLocale.set(locale, rules);
  }
  return rules;
}

export function plural(count: number, forms: PluralForms, locale: string = DEFAULT_LOCALE): string {
  return forms[rulesFor(locale).select(count)] ?? forms.other;
}
