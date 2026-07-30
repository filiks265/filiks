import type { SupportedChatModel, SupportedChatModelId } from "@filiks/shared";
import { TextAttributes } from "@opentui/core";
import { useCallback, useMemo, useState } from "react";
import { useDialog } from "../../providers/dialog";
import { useToast } from "../../providers/toast";
import { DialogSearchList } from "../dialog-search-list";

type ListEntry =
  | { kind: "header"; section: string; label: string }
  | { kind: "model"; id: SupportedChatModelId; provider: string };

type ModelsDialogContentProps = {
  models: readonly SupportedChatModel[];
  onSelectModel: (modelId: SupportedChatModelId) => void;
};

function buildGroupedList(
  models: readonly SupportedChatModel[],
  query: string,
): ListEntry[] {
  const filtered = query
    ? models.filter((m) => m.id.toLowerCase().includes(query.toLowerCase()))
    : models;

  const groups = new Map<
    string,
    { name: string; models: SupportedChatModel[] }
  >();
  for (const m of filtered) {
    let group = groups.get(m.provider);
    if (!group) {
      group = { name: m.providerName, models: [] };
      groups.set(m.provider, group);
    }
    group.models.push(m);
  }

  for (const [, group] of groups) {
    group.models.sort((a, b) => b.context - a.context);
  }

  const sortedProviders = [...groups.entries()]
    .map(([provider, group]) => ({
      provider,
      maxContext: Math.max(...group.models.map((m) => m.context)),
      name: group.name,
    }))
    .sort((a, b) => b.maxContext - a.maxContext);

  const result: ListEntry[] = [];
  for (const { provider, name } of sortedProviders) {
    const group = groups.get(provider)!;
    result.push({ kind: "header", section: provider, label: `── ${name} ──` });
    for (const m of group.models) {
      result.push({ kind: "model", id: m.id, provider: m.provider });
    }
  }

  return result;
}

export const ModelsDialogContent = ({
  models,
  onSelectModel,
}: ModelsDialogContentProps) => {
  const dialog = useDialog();
  const toast = useToast();
  const [searchValue, setSearchValue] = useState("");

  const entries = useMemo(
    () => buildGroupedList(models, searchValue),
    [models, searchValue],
  );

  const handleSelect = useCallback(
    (entry: ListEntry) => {
      if (entry.kind !== "model") return;
      onSelectModel(entry.id);
      toast.show({ message: `Switched to ${entry.id}` });
      dialog.close();
    },
    [onSelectModel, dialog, toast],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  return (
    <DialogSearchList
      items={entries}
      onSelect={handleSelect}
      searchValue={searchValue}
      onSearchChange={handleSearchChange}
      filterFn={(_entry, _query) => true}
      renderItem={(entry, isSelected) => {
        if (entry.kind === "header") {
          return <text attributes={TextAttributes.DIM}>{entry.label}</text>;
        }
        return (
          <text selectable={false} fg={isSelected ? "black" : "white"}>
            {entry.id}
          </text>
        );
      }}
      getKey={(entry) =>
        entry.kind === "header" ? `header:${entry.section}` : entry.id
      }
      placeholder="Search models"
      emptyText="No matching models"
    />
  );
};
