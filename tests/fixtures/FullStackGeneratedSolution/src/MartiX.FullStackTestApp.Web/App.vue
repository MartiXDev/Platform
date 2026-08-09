<script setup lang="ts">
import { ref } from "vue";
import { translate } from "./Platform/Localization/messages";

import "./Platform/Ui/DesignContract.css";
import "./Platform/Ui/themes.css";

const state = ref<"loading" | "empty" | "error">("loading");
</script>

<template>
  <main class="application-shell" aria-labelledby="application-title">
    <h1 id="application-title">{{ translate("ui.application.title") }}</h1>
    <section class="ui-state" :data-state="state" aria-live="polite">
      <p>{{ translate(state === "loading" ? "ui.state.loading" : "ui.state.error") }}</p>
    </section>
  </main>
</template>
