export const FULL_STACK_UI_CONTRACT_VERSION = "1.0.0";
export const FULL_STACK_UI_PACKAGE_MANAGER = "pnpm@10.34.5";
export const FULL_STACK_UI_NODE_ENGINE = "^20.19.0 || >=22.12.0";
export const FULL_STACK_UI_BUILD_SCRIPT = Object.freeze({
  react: "tsc --noEmit && vite build",
  vue: "vue-tsc --noEmit && vite build",
});
export const FULL_STACK_UI_BUILD_ALLOWLIST = Object.freeze([
  "esbuild@0.25.12",
]);
export const FULL_STACK_UI_PNPM_WORKSPACE_SETTINGS = Object.freeze([
  "minimumReleaseAge: 4320",
  "minimumReleaseAgeStrict: true",
  "minimumReleaseAgeIgnoreMissingTime: false",
  "trustPolicy: no-downgrade",
  "trustLockfile: false",
  "blockExoticSubdeps: true",
  "strictPeerDependencies: true",
  "engineStrict: true",
  "verifyDepsBeforeRun: error",
  "strictDepBuilds: true",
  "savePrefix: \"\"",
]);
export const FULL_STACK_UI_LOCKFILE_SECTIONS = Object.freeze([
  "packages:",
  "snapshots:",
]);

export const FULL_STACK_UI_PROVIDERS = Object.freeze([
  "blazor-webapp",
  "react",
  "vue",
]);

export const FULL_STACK_UI_APPLICATION_FILES = Object.freeze({
  "blazor-webapp": "App.razor",
  react: "App.tsx",
  vue: "App.vue",
});

export const FULL_STACK_UI_BROWSER_ENTRY_FILES = Object.freeze({
  react: "main.tsx",
  vue: "main.ts",
});

export const FULL_STACK_UI_CAPABILITIES = Object.freeze([
  "application-ui",
  "ui.design-contract",
  "ui.generated-client",
  "ui.problem-details",
  "ui.secure-session",
  "ui.authorization-states",
  "ui.accessibility",
  "ui.localization",
  "ui.theme",
  "ui.browser-evidence",
  "ui.build-evidence",
  "ui.security-evidence",
  "ui.deployment-evidence",
  "ui.observability",
]);

export const FULL_STACK_UI_EVIDENCE = Object.freeze([
  "browser",
  "build",
  "client",
  "security",
  "deployment",
  "observability",
]);

export const FULL_STACK_UI_MESSAGE_KEYS = Object.freeze([
  "ui.application.title",
  "ui.state.loading",
  "ui.state.empty",
  "ui.state.validation",
  "ui.state.denied",
  "ui.state.error",
  "ui.state.offline",
  "ui.state.reconnecting",
  "ui.state.stale",
  "ui.error.offline",
  "ui.session.anonymous",
  "ui.session.expired",
  "ui.session.authenticated",
  "ui.theme.system",
  "ui.theme.light",
  "ui.theme.dark",
]);

export const FULL_STACK_UI_RENDERING_PROFILES = Object.freeze([
  "application",
  "hybrid-web",
]);
export const FULL_STACK_DEFAULT_RENDERING_PROFILE = "application";

export const FULL_STACK_UI_THEMES = Object.freeze([
  "light",
  "dark",
  "system",
]);

export const FULL_STACK_UI_SESSION_OWNER = "server-bff";
export const FULL_STACK_DEFAULT_CULTURE = "en-US";
export const FULL_STACK_UI_CULTURE_PATTERN =
  /^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{1,8})*$/;

export const FULL_STACK_REACT_PACKAGE_MANAGER = "pnpm@10.17.1";
export const FULL_STACK_REACT_NODE_ENGINE = ">=22.14.0 <27";
