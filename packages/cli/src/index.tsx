import "dotenv/config";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./screens/home";
import { NewSession } from "./screens/new-session";
import { Session } from "./screens/session";

writeFileSync("/tmp/filiks-argv.json", JSON.stringify(process.argv));

if (process.argv[1] === "update" || process.argv[2] === "update") {
  try {
    const { update } = await import("./lib/update");
    await update();
  } catch (err) {
    console.error(
      "Update failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
  process.exit(0);
}

const bakPath = `${process.execPath}.bak`;
if (existsSync(bakPath)) {
  try {
    unlinkSync(bakPath);
  } catch {}
}

const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "sessions/new", element: <NewSession /> },
      { path: "sessions/:id", element: <Session /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});
createRoot(renderer).render(<App />);

// Set terminal window/tab title
process.stdout.write("\x1b]0;Filiks\x07");
