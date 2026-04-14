/**
 * App root — redirects to the appropriate starting surface.
 * - Logged-in merchants land on the dashboard.
 * - Everyone else sees the welcome screen.
 */

import React from "react";
import { Redirect } from "expo-router";

import { isLoggedIn } from "../utils/auth";

export default function Index() {
  const [target, setTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    isLoggedIn().then((logged) => {
      if (mounted) setTarget(logged ? "/dashboard" : "/welcome");
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!target) return null;
  return <Redirect href={target as "/welcome" | "/dashboard"} />;
}
