import { useEffect } from "react";
import { VERSION } from "../lib/version";
import { useToast } from "../providers/toast";

const REPO = "filiks265/filiks";

export function VersionCheck() {
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ tag_name: string }>;
      })
      .then((release) => {
        if (cancelled || !release) return;
        const latest = release.tag_name;
        if (latest === VERSION || VERSION === "dev") return;
        toast.show({
          variant: "info",
          message: `Update ${latest} available — run 'filiks update' to upgrade`,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
