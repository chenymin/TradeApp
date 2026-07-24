import React from "react";

export function GlassView({ children, ...props }: Record<string, unknown> & {
  children?: React.ReactNode;
}) {
  return React.createElement("GlassView", props, children);
}

export function isLiquidGlassAvailable() {
  return true;
}
