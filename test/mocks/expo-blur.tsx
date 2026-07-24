import React from "react";

export function BlurView({ children, ...props }: Record<string, unknown> & {
  children?: React.ReactNode;
}) {
  return React.createElement("BlurView", props, children);
}
