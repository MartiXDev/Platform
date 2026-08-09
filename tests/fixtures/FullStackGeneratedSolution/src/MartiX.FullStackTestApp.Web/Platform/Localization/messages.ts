import catalog from "./en-US.json";

export const messages = {
  "ui.application.title": "ui.application.title",
  "ui.state.loading": "ui.state.loading",
  "ui.state.empty": "ui.state.empty",
  "ui.state.validation": "ui.state.validation",
  "ui.state.denied": "ui.state.denied",
  "ui.state.error": "ui.state.error",
  "ui.state.offline": "ui.state.offline",
  "ui.state.reconnecting": "ui.state.reconnecting",
  "ui.state.stale": "ui.state.stale",
  "ui.error.offline": "ui.error.offline",
  "ui.session.anonymous": "ui.session.anonymous",
  "ui.session.expired": "ui.session.expired",
  "ui.session.authenticated": "ui.session.authenticated",
  "ui.theme.system": "ui.theme.system",
  "ui.theme.light": "ui.theme.light",
  "ui.theme.dark": "ui.theme.dark",
} as const;

export type UiMessageKey = keyof typeof messages;

export function translate(key: UiMessageKey): string {
  return catalog[key] ?? key;
}
