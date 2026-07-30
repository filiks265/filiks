// packages/cli/src/components/border.ts

export const EmptyBorder = {
  topLeft: "",
  topRight: "",
  bottomLeft: "",
  bottomRight: "",
  horizontal: "",
  vertical: "",
  topT: "",
  bottomT: "",
  leftT: "",
  rightT: "",
  cross: "",
};

export const SplitBorderChars = {
  ...EmptyBorder,
  vertical: "┃",
  bottomLeft: "╹",
};
