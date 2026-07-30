import { TextAttributes } from "@opentui/core";
import { useTheme } from "../../providers/theme";
import { Panel } from "./panel";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type Props = {
  title: string;
  createdAt: string;
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export function SessionInfoPanel({ title, createdAt }: Props) {
  const { colors } = useTheme();

  return (
    <Panel title="Session Info">
      <text attributes={TextAttributes.BOLD} fg={colors.text}>
        {truncate(title, 38)}
      </text>
      <text fg={colors.textMuted}>{formatTimestamp(createdAt)}</text>
    </Panel>
  );
}
