import { useCallback, useEffect, useRef } from "react";
import { useDialog } from "../../providers/dialog";
import { useTheme } from "../../providers/theme";
import { useToast } from "../../providers/toast";
import { THEMES } from "../../theme";
import type { Theme } from "../../theme";
import { DialogSearchList } from "../dialog-search-list";

export const ThemeDialogContent = () => {
  const dialog = useDialog();
  const toast = useToast();
  const { setTheme, currentTheme, colors } = useTheme();
  // A way to stole the theme when we are changing theses
  const originalThemeRef = useRef(currentTheme);
  const confirmedRef = useRef(false);

  // Revert to original theme if the user dismisses without confirming
  useEffect(() => {
    return () => {
      if (!confirmedRef.current) {
        setTheme(originalThemeRef.current);
      }
    };
  }, [setTheme]);

  const handleSelect = useCallback(
    (theme: Theme) => {
      confirmedRef.current = true;
      setTheme(theme);
      toast.show({ message: `Switched to ${theme.name}` });
      dialog.close();
    },
    [setTheme, dialog, toast],
  );

  const handleHighlight = useCallback(
    (theme: Theme) => {
      setTheme(theme);
    },
    [setTheme],
  );

  return (
    <DialogSearchList
      items={THEMES}
      onSelect={handleSelect}
      onHighlight={handleHighlight}
      filterFn={(t, query) =>
        t.name.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(theme, isSelected) => (
        <text
          selectable={false}
          fg={isSelected ? colors.textOnSelection : colors.text}
        >
          {theme.name === originalThemeRef.current.name ? "\u2022 " : ""}
          {theme.name}
        </text>
      )}
      getKey={(t) => t.name}
      placeholder="Search Themes"
      emptyText="No matching themes"
    />
  );
};
