import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { EventsDashboard } from "../features/events/EventsDashboard.jsx";
import { StudentLandingPage } from "../features/student/StudentLandingPage.jsx";

const TOKEN_KEY = "event-admin-token";

export default function App() {
  if (!window.location.pathname.startsWith("/admin")) {
    return <StudentLandingPage />;
  }

  return <AdminApp />;
}

function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    function handleExpired() {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken("");
      setUser(null);
      setAuthError("Your session expired. Please sign in again.");
    }

    window.addEventListener("event-admin-auth-expired", handleExpired);
    return () => window.removeEventListener("event-admin-auth-expired", handleExpired);
  }, []);

  const signIn = useCallback(async (credentials) => {
    const response = await apiRequest("/v1/auth/login", {
      method: "POST",
      body: credentials,
    });

    if (!response?.token) {
      throw new Error("The login response did not include an access token.");
    }

    sessionStorage.setItem(TOKEN_KEY, response.token);
    setUser(response.user || null);
    setToken(response.token);
    setAuthError("");
  }, []);

  const signOut = useCallback(async () => {
    let logoutError = "";

    try {
      await apiRequest("/v1/auth/logout", { method: "POST", token });
    } catch (error) {
      logoutError = error.message;
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken("");
      setUser(null);
      setAuthError(
        logoutError
          ? `Signed out locally, but server logout failed: ${logoutError}`
          : "",
      );
    }
  }, [token]);

  if (!token) {
    return (
      <LoginPage
        initialError={authError}
        onClearError={() => setAuthError("")}
        onLogin={signIn}
      />
    );
  }

  return <EventsDashboard token={token} user={user} onSignOut={signOut} />;
}
