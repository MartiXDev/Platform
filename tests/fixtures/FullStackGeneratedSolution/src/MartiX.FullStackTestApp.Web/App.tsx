import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createGeneratedClient,
} from "./Platform/Api/generated";
import { request } from "./Platform/Api/transport";
import { translate } from "./Platform/Localization/messages";
import {
  loadRuntimeConfiguration,
  type RuntimeUiConfiguration,
} from "./Platform/Runtime/config";
import { readSession, type SessionState } from "./Platform/Session/session";
import "./Platform/Ui/DesignContract.css";
import "./Platform/Ui/themes.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
const ApiClientContext = createContext<ReturnType<
  typeof createGeneratedClient
> | null>(null);
const stateMessages = {
  loading: "ui.state.loading",
  empty: "ui.state.empty",
  denied: "ui.state.denied",
  error: "ui.state.error",
  offline: "ui.state.offline",
} as const;

function useSystemTheme() {
  const [prefersDark, setPrefersDark] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    setPrefersDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return prefersDark ? webDarkTheme : webLightTheme;
}

function SessionView({ session }: { session: SessionState }) {
  const client = useContext(ApiClientContext);
  const state =
    session.kind === "anonymous"
      ? "empty"
      : session.kind === "denied"
        ? "denied"
        : session.kind === "expired"
          ? "error"
          : "empty";
  return (
    <section
      className="ui-state"
      data-client-ready={client !== null}
      data-state={state}
      aria-live="polite"
    >
      <p>{translate(stateMessages[state])}</p>
    </section>
  );
}

function ApplicationContent() {
  const runtime = useQuery<RuntimeUiConfiguration>({
    queryKey: ["runtime-ui-configuration"],
    queryFn: () => loadRuntimeConfiguration(),
  });
  const session = useQuery<SessionState>({
    queryKey: ["server-bff-session"],
    queryFn: () => readSession(),
    enabled: runtime.isSuccess,
  });
  const client = useMemo(
    () =>
      runtime.data === undefined
        ? null
        : createGeneratedClient(runtime.data.apiBasePath, request),
    [runtime.data],
  );
  const state = runtime.isPending || session.isPending
    ? "loading"
    : runtime.isError || session.isError
      ? "offline"
      : null;

  return (
    <ApiClientContext.Provider value={client}>
      <main className="application-shell" aria-labelledby="application-title">
        <h1 id="application-title">{translate("ui.application.title")}</h1>
        {state === null && session.data !== undefined ? (
          <SessionView session={session.data} />
        ) : (
          <section
            className="ui-state"
            data-state={state}
            aria-live="polite"
            aria-busy={state === "loading"}
            role="status"
          >
            <p>{translate(stateMessages[state ?? "error"])}</p>
          </section>
        )}
      </main>
    </ApiClientContext.Provider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <ApplicationContent />,
    errorElement: (
      <main className="application-shell" aria-labelledby="application-title">
        <h1 id="application-title">{translate("ui.application.title")}</h1>
        <section className="ui-state" data-state="error" aria-live="polite" role="alert">
          <p>{translate("ui.state.error")}</p>
        </section>
      </main>
    ),
  },
]);

export function App() {
  const theme = useSystemTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <FluentProvider theme={theme}>
        <RouterProvider router={router} />
      </FluentProvider>
    </QueryClientProvider>
  );
}
