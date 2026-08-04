import type {
  Button,
  TextInput,
} from "@fluentui/web-components";

declare global {
  interface HTMLElementTagNameMap {
    "fluent-button": Button;
    "fluent-text-input": TextInput;
  }
}

export {};
