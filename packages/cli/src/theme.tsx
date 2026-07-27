export type ThemeColors = {
    primary: string;
    planMode: string;
    selection: string;
    thinking: string;
    success: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    dialogSurface: string;
    thinkingBorder: string;
    dimSeparator: string;
    text: string;
    textMuted: string;
    textOnSelection: string;
};

export type Theme = {
    name: string;
    colors: ThemeColors;
};

export const THEMES: Theme[] = [
    {
        name: "Nkhalango",
        colors: {
            primary: "#2DD4BF",
            planMode: "#818CF8",
            selection: "#5EEAD4",
            thinking: "#A78BFA",
            success: "#34D399",
            error: "#FB7185",
            info: "#22D3EE",
            background: "#0B0D10",
            surface: "#161920",
            dialogSurface: "#060810",
            thinkingBorder: "#262A38",
            dimSeparator: "#383D50",
            text: "#E2E6EF",
            textMuted: "#6B7280",
            textOnSelection: "#000000",
        },
    },
    {
        name: "Moto",
        colors: {
            primary: "#F59E0B",
            planMode: "#FB7185",
            selection: "#FBBF24",
            thinking: "#F87171",
            success: "#4ADE80",
            error: "#F87171",
            info: "#FB923C",
            background: "#0F0D0A",
            surface: "#1C1813",
            dialogSurface: "#080704",
            thinkingBorder: "#2C2418",
            dimSeparator: "#4A3C28",
            text: "#E6DFD3",
            textMuted: "#8C7D6A",
            textOnSelection: "#000000",
        },
    },
    {
        name: "Mwezi",
        colors: {
            primary: "#818CF8",
            planMode: "#C084FC",
            selection: "#A5B4FC",
            thinking: "#E879F9",
            success: "#6EE7B7",
            error: "#FB7185",
            info: "#67E8F9",
            background: "#0D0D15",
            surface: "#181A26",
            dialogSurface: "#07070E",
            thinkingBorder: "#262A40",
            dimSeparator: "#3A3E60",
            text: "#E2E0F0",
            textMuted: "#686A90",
            textOnSelection: "#000000",
        },
    },
    {
        name: "Kuwala",
        colors: {
            primary: "#7C3AED",
            planMode: "#DB2777",
            selection: "#A78BFA",
            thinking: "#EC4899",
            success: "#059669",
            error: "#DC2626",
            info: "#0891B2",
            background: "#F8F5F0",
            surface: "#EDE8E0",
            dialogSurface: "#FCFAF5",
            thinkingBorder: "#DDD5C8",
            dimSeparator: "#B0A898",
            text: "#2D261E",
            textMuted: "#8C8070",
            textOnSelection: "#FFFFFF",
        },
    },
    {
        name: "Mdima",
        colors: {
            primary: "#60A5FA",
            planMode: "#A78BFA",
            selection: "#3B82F6",
            thinking: "#818CF8",
            success: "#34D399",
            error: "#F87171",
            info: "#22D3EE",
            background: "#000000",
            surface: "#0F0F0F",
            dialogSurface: "#000000",
            thinkingBorder: "#1F1F1F",
            dimSeparator: "#333333",
            text: "#F5F5F5",
            textMuted: "#666666",
            textOnSelection: "#000000",
        },
    },
];

export const DEFAULT_THEME = THEMES.find((t) => t.name === "Nkhalango")!;
