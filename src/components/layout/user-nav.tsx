import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/providers/language-provider";

export function UserNav() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const copy = {
    signedIn: isEs ? "Sesion iniciada" : "Signed in",
    signingOut: isEs ? "Cerrando..." : "Closing...",
    logout: isEs ? "Salir" : "Logout",
    login: isEs ? "Iniciar sesion" : "Login",
    signup: isEs ? "Crear cuenta" : "Sign up",
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <div className="flex items-center gap-3 rounded-full border px-3 py-1.5 text-sm">
          <div className="flex flex-col leading-tight">
            <span className="font-medium">
              {user.user_metadata?.full_name || user.email}
            </span>
            <span className="text-muted-foreground">{copy.signedIn}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={loading || signingOut}>
            {signingOut ? copy.signingOut : copy.logout}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
            {copy.login}
          </Button>
          <Button variant="default" size="sm" onClick={() => navigate("/signup")}>
            {copy.signup}
          </Button>
        </div>
      )}
    </div>
  );
}
