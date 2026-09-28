"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { EmbedPanel } from "@/components/EmbedPanel";
import { ReturnToStudio } from "@/components/ReturnToStudio";

export function AuthBar({
  user,
  publicToken,
  selectedModelId,
  selectedBackgroundId,
  onSignIn,
  onSignOut,
}: {
  user: User | null;
  publicToken: string | null;
  selectedModelId: string | null;
  selectedBackgroundId: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [showEmbed, setShowEmbed] = useState(false);
  const name: string = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "";
  const avatar: string | undefined = user?.user_metadata?.avatar_url;

  return (
    <div className="authbar">
      <ReturnToStudio
        publicToken={publicToken}
        selectedModelId={selectedModelId}
        selectedBackgroundId={selectedBackgroundId}
      />

      {user && publicToken && (
        <div style={{ position: "relative" }}>
          <button className="embedbtn" type="button" onClick={() => setShowEmbed((v) => !v)}>
            Get embed code
          </button>
          {showEmbed && (
            <EmbedPanel publicToken={publicToken} onClose={() => setShowEmbed(false)} />
          )}
        </div>
      )}

      {user ? (
        <button className="authuser" type="button" onClick={onSignOut} title="Sign out">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="authuser__avatar" src={avatar} alt="" />
          ) : (
            <span className="authuser__avatar">{name.slice(0, 1).toUpperCase() || "?"}</span>
          )}
          Sign out
        </button>
      ) : (
        <button className="authbtn" type="button" onClick={onSignIn}>
          Sign in with Google
        </button>
      )}
    </div>
  );
}
