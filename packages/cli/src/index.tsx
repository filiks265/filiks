import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createMemoryRouter, RouterProvider } from "react-router"; 
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./screens/home";
import { NewSession } from "./screens/new-session";
import { Session } from "./screens/session";
import { TextErrorBoundary } from "./components/text-error-boundary";
import { existsSync, unlinkSync } from "fs";

if (process.argv[2] === "update") {
  const { update } = await import("./lib/update");
  await update();
  process.exit(0);
}

const bakPath = process.execPath + ".bak";
if (existsSync(bakPath)) {
  try { unlinkSync(bakPath); } catch {}
}


const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "sessions/new", element: <NewSession/> },
      { path: "sessions/:id", element: <Session /> },
    ]
  }
]);


function App() {
  return <RouterProvider router={router} />;
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});
createRoot(renderer).render(<TextErrorBoundary><App /></TextErrorBoundary>);

// Set terminal window/tab title
process.stdout.write("\x1b]0;Filiks\x07");
