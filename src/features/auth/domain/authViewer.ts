export type AuthViewer = {
  email: string | null;
  id: string;
  walletAddress: string | null;
};

export function parseAuthViewer(value: unknown): AuthViewer | null {
  const viewer = value as Partial<Record<keyof AuthViewer, unknown>> | null;

  if (!viewer || typeof viewer.id !== "string" || !viewer.id.trim()) {
    return null;
  }

  if (viewer.email != null && typeof viewer.email !== "string") {
    return null;
  }

  if (viewer.walletAddress != null && typeof viewer.walletAddress !== "string") {
    return null;
  }

  return {
    email: typeof viewer.email === "string" ? viewer.email : null,
    id: viewer.id,
    walletAddress:
      typeof viewer.walletAddress === "string" ? viewer.walletAddress : null,
  };
}
