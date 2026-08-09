<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { createGeneratedClient } from "./Platform/Api/generated";
import { request } from "./Platform/Api/transport";
import { translate } from "./Platform/Localization/messages";
import { loadRuntimeConfiguration } from "./Platform/Runtime/config";
import { readSession } from "./Platform/Session/session";

import "./Platform/Ui/DesignContract.css";
import "./Platform/Ui/themes.css";

const runtimeQuery = useQuery({
  queryKey: ["runtime-configuration"],
  queryFn: () => loadRuntimeConfiguration(),
  staleTime: Infinity,
});
const sessionQuery = useQuery({
  queryKey: ["session"],
  queryFn: () => readSession(),
  enabled: computed(() => runtimeQuery.isSuccess.value),
});
const stateMessages = {
  loading: "ui.state.loading",
  empty: "ui.state.empty",
  denied: "ui.state.denied",
  error: "ui.state.error",
  offline: "ui.state.offline",
} as const;
const client = computed(() => {
  const configuration = runtimeQuery.data.value;
  return configuration === undefined
    ? null
    : createGeneratedClient(configuration.apiBasePath, request);
});
const state = computed<keyof typeof stateMessages>(() => {
  if (
    runtimeQuery.isPending.value ||
    (runtimeQuery.isSuccess.value && sessionQuery.isPending.value)
  ) {
    return "loading";
  }
  if (runtimeQuery.isError.value) {
    return "error";
  }
  if (sessionQuery.isError.value) {
    return "offline";
  }
  switch (sessionQuery.data.value?.kind) {
    case "denied":
      return "denied";
    case "expired":
      return "error";
    default:
      return "empty";
  }
});
const stateMessage = computed(() => stateMessages[state.value]);
const sessionState = computed(
  () => sessionQuery.data.value?.kind ?? "anonymous",
);
const clientReady = computed(() => client.value !== null);
</script>

<template>
  <main class="application-shell" aria-labelledby="application-title">
    <h1 id="application-title">{{ translate("ui.application.title") }}</h1>
    <section
      class="ui-state"
      :data-state="state"
      :data-session-state="sessionState"
      :data-client-ready="clientReady"
      :aria-busy="state === 'loading'"
      aria-live="polite"
    >
      <p>{{ translate(stateMessage) }}</p>
    </section>
  </main>
</template>
