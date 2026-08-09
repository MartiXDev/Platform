import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { useState } from "react";
import { translate } from "./Platform/Localization/messages";
import "./Platform/Ui/DesignContract.css";
import "./Platform/Ui/themes.css";

export function App() {
  const [state] = useState<"loading" | "empty" | "error">("loading");
  return (
    <FluentProvider theme={webLightTheme}>
      <main className="application-shell" aria-labelledby="application-title">
        <h1 id="application-title">{translate("ui.application.title")}</h1>
        <section className="ui-state" data-state={state} aria-live="polite">
          <p>{translate(state === "loading" ? "ui.state.loading" : "ui.state.error")}</p>
        </section>
      </main>
    </FluentProvider>
  );
}
