import { SUPPORTED_CHAT_MODELS } from "@filiks/shared";
import { clearAuth } from "../../lib/auth";
import { performLogin } from "../../lib/oauth";
import { ConfirmDialog } from "../confirm-dialog";
import {
  AgentsDialogContent,
  ModelsDialogContent,
  SessionsDialogContent,
  ThemeDialogContent,
} from "../dialogs";
import type { Command } from "./types";

export const COMMANDS: Command[] = [
  {
    name: "new",
    description: "Start a new conversation",
    value: "/new",
    action: (ctx) => {
      ctx.navigate("/");
    },
  },
  {
    name: "agents",
    description: "Switch mode or agent profile",
    value: "/agents",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Agent",
        children: (
          <AgentsDialogContent
            currentMode={ctx.mode}
            onSelectMode={ctx.setMode}
          />
        ),
      });
    },
  },
  {
    name: "models",
    description: "Select Ai models for generation",
    value: "/models",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Model",
        children: (
          <ModelsDialogContent
            models={SUPPORTED_CHAT_MODELS}
            onSelectModel={ctx.setModel}
          />
        ),
      });
    },
  },
  {
    name: "sessions",
    description: "Browse past sessions",
    value: "/sessions",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Sessions",
        children: <SessionsDialogContent />,
      });
    },
  },
  {
    name: "themes",
    description: "Change color theme",
    value: "/theme",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Theme",
        children: <ThemeDialogContent />,
      });
    },
  },
  {
    name: "login",
    description: "Sign in with your browser",
    value: "/login",
    action: async (ctx) => {
      ctx.toast.show({ message: "Opening browser to sign in..." });
      try {
        await performLogin();
        ctx.toast.show({ variant: "success", message: "Signed in" });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sign in failed or timed out";

        ctx.toast.show({ variant: "error", message });
      }
    },
  },
  {
    name: "logout",
    description: "Signout of your account",
    value: "/logout",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Sign out?",
        children: (
          <ConfirmDialog
            message="Are you sure you want to sign out?"
            confirmLabel="Sign out"
            onConfirm={() => {
              clearAuth();
              ctx.toast.show({ variant: "success", message: "Signed out..." });
            }}
          />
        ),
      });
    },
  },
  {
    name: "upgrade",
    description: "Buy more credits",
    value: "/upgrade",
    action: (ctx) => {
      ctx.toast.show({ message: "Opening credits checkout..." });
    },
  },
  {
    name: "usage",
    description: "Open billing portal in your browser",
    value: "/usage",
    action: (ctx) => {
      ctx.toast.show({ message: "Opening billing portal..." });
    },
  },
  {
    name: "update",
    description: "Check for updates",
    value: "/update",
    action: (ctx) => {
      ctx.toast.show({
        message: "Run 'filiks update' in your terminal to update.",
      });
    },
  },
  {
    name: "exit",
    description: "Quit the application",
    value: "/exit",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Exit?",
        children: (
          <ConfirmDialog
            message="Are you sure you want to quit?"
            confirmLabel="Exit"
            onConfirm={() => {
              ctx.exit();
            }}
          />
        ),
      });
    },
  },
];
