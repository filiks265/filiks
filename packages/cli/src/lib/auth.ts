import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, parse } from "node:path";

type AuthData = {
    token: string;
    idToken?: string;
};

const AUTH_DIR = join(homedir(), ".filiks");
const AUTH_FILE = join(AUTH_DIR, "auth.json");

type AuthListener = () => void;
const listeners = new Set<AuthListener>();

export function onAuthChange(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dispatchAuthChange() {
  listeners.forEach(l => l());
}

export function getAuth(): AuthData | null {
    try {
        const data = readFileSync(AUTH_FILE, "utf8");
        const parsed = JSON.parse(data) as Partial<AuthData>;
        return typeof parsed.token === "string" ? { token: parsed.token, idToken: parsed.idToken } : null;
    } catch {
        return null;
    }
};

export function getUser(): { email?: string; name?: string; id: string } | null {
    const auth = getAuth();
    if (!auth) return null;
    try {
        const jwt = auth.idToken ?? auth.token;
        const payload = JSON.parse(
            Buffer.from(jwt.split(".")[1]!, "base64url").toString(),
        );
        if (typeof payload.sub !== "string") return null;
        return {
            email: payload.email,
            name: payload.name,
            id: payload.sub,
        };
    } catch {
        return null;
    }
}


export function saveAuth(data: AuthData) {
    if (!existsSync(AUTH_DIR)){
        // Owner-only permissions (rwx-----) so other users on the machine can't read tokens
        mkdirSync(AUTH_DIR, {mode: 0o700});
    }
    writeFileSync(AUTH_FILE, JSON.stringify(data), {mode: 0o600});
    dispatchAuthChange();
}

export function clearAuth() {
    try {
        unlinkSync(AUTH_FILE);
    } catch {
        // File doesn't exist
    }
    dispatchAuthChange();
}

