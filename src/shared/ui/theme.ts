export const colors = {
  champagne: "#B8872B",
  background: "#F4F7F4",
  border: "#D8E0DC",
  danger: "#A33A2D",
  dangerMuted: "#F7E7E3",
  dangerSoft: "#F7E7E3",
  glassBorder: "rgba(255, 255, 255, 0.88)",
  glassFill: "rgba(255, 255, 255, 0.72)",
  ink: "#172421",
  muted: "#66736E",
  positive: "#147A5D",
  primary: "#176B58",
  primaryStrong: "#0F4E40",
  primarySoft: "#E0EEE8",
  primaryMuted: "#8FA9A2",
  surface: "#FFFFFF",
  surfaceMuted: "#EDF2EF",
  surfaceSubtle: "#EDF2EF",
  text: "#172026",
  warning: "#A46718",
};

export const radii = {
  full: 999,
  lg: 8,
  md: 6,
  sm: 4,
};

export const spacing = {
  lg: 24,
  md: 16,
  page: 20,
  section: 24,
  sm: 8,
  xl: 32,
  xs: 4,
  xxl: 40,
};

export const typography = {
  body: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 17 },
  display: { fontSize: 32, fontWeight: "800", lineHeight: 38 },
  label: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: "700", lineHeight: 14 },
  numberRow: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  pageTitle: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
} as const;

export const motion = {
  chromeDurationMs: 220,
  pressDurationMs: 150,
  skeletonDurationMs: 1400,
} as const;
