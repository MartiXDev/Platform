"use client";

import * as React from "react";
import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
} from "@fluentui/react-components";
import type { Theme } from "@fluentui/react-components";
import { useServerInsertedHTML } from "next/navigation";

export type FluentRegistryProps = React.PropsWithChildren<{
  theme: Theme;
}>;

export function FluentRegistry({
  children,
  theme,
}: FluentRegistryProps) {
  const [renderer] = React.useState(() => createDOMRenderer());
  const didRenderRef = React.useRef(false);

  useServerInsertedHTML(() => {
    if (didRenderRef.current) {
      return;
    }

    didRenderRef.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={theme}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
