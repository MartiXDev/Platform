import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import { RouterView } from "vue-router";
import { router } from "./Platform/Navigation/router";

const queryClient = new QueryClient();

createApp(RouterView)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount("#app");
