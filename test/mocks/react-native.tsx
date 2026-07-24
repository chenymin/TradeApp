import React from "react";

type Props = Record<string, unknown> & {
  children?: React.ReactNode;
};

export function Pressable({ children, ...props }: Props) {
  return React.createElement("Pressable", props, children);
}

export function Text({ children, ...props }: Props) {
  return React.createElement("Text", props, children);
}

export function TextInput(props: Props) {
  return React.createElement("TextInput", props);
}

export function Image(props: Props) {
  return React.createElement("Image", props);
}

export function ScrollView({ children, ...props }: Props) {
  return React.createElement("ScrollView", props, children);
}

export function RefreshControl(props: Props) {
  return React.createElement("RefreshControl", props);
}

export function useWindowDimensions() {
  return { fontScale: 1, height: 844, scale: 3, width: 390 };
}

export function ActivityIndicator(props: Props) {
  return React.createElement("ActivityIndicator", props);
}

export const FlatList = React.forwardRef(function FlatList(
  {
    data = [],
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    renderItem,
    ...props
  }: Props & {
    data?: unknown[];
    ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
    ListFooterComponent?: React.ReactNode | (() => React.ReactNode);
    ListHeaderComponent?: React.ReactNode | (() => React.ReactNode);
    renderItem?: (input: { index: number; item: unknown }) => React.ReactNode;
  },
  ref: React.ForwardedRef<{ scrollToOffset(input: { animated: boolean; offset: number }): void }>,
) {
  React.useImperativeHandle(ref, () => ({ scrollToOffset() {} }));
  const children = [renderListComponent(ListHeaderComponent)];

  if (data.length === 0) {
    children.push(renderListComponent(ListEmptyComponent));
  } else {
    children.push(...data.map((item, index) => renderItem?.({ index, item })));
  }

  children.push(renderListComponent(ListFooterComponent));
  return React.createElement("FlatList", { ...props, data, renderItem }, children);
});

export function View({ children, ...props }: Props) {
  return React.createElement("View", props, children);
}

export const AccessibilityInfo = {
  addEventListener() {
    return { remove() {} };
  },
  async isReduceMotionEnabled() {
    return false;
  },
  async isReduceTransparencyEnabled() {
    return false;
  },
};

class AnimatedValue {
  constructor(public value: number) {}
}

function AnimatedView({ children, ...props }: Props) {
  return React.createElement("AnimatedView", props, children);
}

function animation() {
  return {
    start() {},
    stop() {},
  };
}

export const Animated = {
  Value: AnimatedValue,
  View: AnimatedView,
  loop: animation,
  sequence: animation,
  timing: animation,
};

export const Easing = {
  inOut(value: unknown) {
    return value;
  },
  ease: "ease",
};

export const Platform = {
  OS: "ios",
  Version: 26,
};

export const StyleSheet = {
  create<T extends Record<string, unknown>>(styles: T): T {
    return styles;
  },
};

export const Share = {
  dismissedAction: "dismissedAction",
  sharedAction: "sharedAction",
  share: async () => ({ action: "sharedAction" }),
};

export const Keyboard = {
  dismiss() {},
};

function renderListComponent(
  component: React.ReactNode | (() => React.ReactNode) | undefined,
) {
  return typeof component === "function" ? component() : component ?? null;
}
