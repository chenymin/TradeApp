import { isValidElement, type ReactNode } from "react";

export type PlainNode =
  | string
  | number
  | null
  | undefined
  | {
      children: PlainNode[];
      props: Record<string, unknown>;
      type: unknown;
    };

export function renderElement(node: ReactNode): PlainNode {
  if (!isValidElement(node)) {
    return node as PlainNode;
  }

  const props = node.props as Record<string, unknown>;

  if (typeof node.type === "function" && !isClassComponent(node.type)) {
    const component = node.type as (props: Record<string, unknown>) => ReactNode;
    return renderElement(component(props));
  }

  return {
    children: renderChildren(props.children),
    props,
    type: node.type,
  };
}

export function findByProps(
  node: PlainNode,
  props: Record<string, unknown>,
): Extract<PlainNode, { props: Record<string, unknown> }> {
  if (isPlainElement(node) && matchesProps(node, props)) {
    return node;
  }

  if (isPlainElement(node)) {
    for (const child of node.children) {
      const match = findByPropsOrNull(child, props);

      if (match) {
        return match;
      }
    }
  }

  throw new Error(`No element found for props ${JSON.stringify(props)}`);
}

export function getPressHandler(tree: PlainNode, label: string): () => Promise<void> | void {
  const handler = findByProps(tree, { accessibilityLabel: label }).props.onPress;

  if (typeof handler !== "function") {
    throw new Error(`No onPress handler found for ${label}`);
  }

  return handler as () => Promise<void> | void;
}

export function textContent(node: PlainNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!isPlainElement(node)) {
    return "";
  }

  return node.children.map((child) => textContent(child)).join("");
}

function renderChildren(children: unknown): PlainNode[] {
  if (Array.isArray(children)) {
    return children.map((child) => renderElement(child as ReactNode));
  }

  return [renderElement(children as ReactNode)];
}

function findByPropsOrNull(
  node: PlainNode,
  props: Record<string, unknown>,
): Extract<PlainNode, { props: Record<string, unknown> }> | null {
  try {
    return findByProps(node, props);
  } catch {
    return null;
  }
}

function matchesProps(
  node: Extract<PlainNode, { props: Record<string, unknown> }>,
  props: Record<string, unknown>,
): boolean {
  return Object.entries(props).every(([key, value]) => node.props[key] === value);
}

function isPlainElement(
  node: PlainNode,
): node is Extract<PlainNode, { props: Record<string, unknown> }> {
  return typeof node === "object" && node !== null && "props" in node;
}

function isClassComponent(component: unknown): boolean {
  return (
    typeof component === "function" &&
    "prototype" in component &&
    Boolean(
      (component as { prototype?: { isReactComponent?: unknown } }).prototype
        ?.isReactComponent,
    )
  );
}
