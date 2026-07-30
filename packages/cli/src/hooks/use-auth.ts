import { useEffect, useState } from "react";
import { getUser, onAuthChange } from "../lib/auth";

export function useAuth() {
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    return onAuthChange(() => {
      setUser(getUser());
    });
  }, []);

  return { user, isAuthenticated: user !== null };
}
