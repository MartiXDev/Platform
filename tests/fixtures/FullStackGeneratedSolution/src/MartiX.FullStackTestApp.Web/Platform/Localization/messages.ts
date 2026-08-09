import catalog from "./en-US.json";

export const messages = {
  "ui.application.title": "ui.application.title",
  "ui.state.loading": "ui.state.loading",
  "ui.state.empty": "ui.state.empty",
  "ui.state.error": "ui.state.error",
} as const;

export type UiMessageKey = keyof typeof messages;

export function translate(key: UiMessageKey): string {
  return catalog[key] ?? key;
}
