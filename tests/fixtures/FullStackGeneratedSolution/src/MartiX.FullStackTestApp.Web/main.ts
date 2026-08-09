import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import { RouterView } from "vue-router";
import { router } from "./Platform/Navigation/router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

createApp(RouterView)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount("#app");
