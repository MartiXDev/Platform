import type { PropsWithChildren } from "react";
import {
  FluentProvider,
} from "@fluentui/react-components";
import type { Theme } from "@fluentui/react-components";

export type AppFluentProviderProps = PropsWithChildren<{
  theme: Theme;
}>;

export function AppFluentProvider({
  children,
  theme,
}: AppFluentProviderProps) {
  return (
    <FluentProvider theme={theme}>
      {children}
    </FluentProvider>
  );
}
