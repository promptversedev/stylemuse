"use client";

import { Icon } from "@/components/IconSprite";
import { Brand } from "@/components/Brand";

export function TopBar({
  railOpen,
  onMenuClick,
}: {
  railOpen: boolean;
  onMenuClick: () => void;
}) {
  return (
    <header className="topbar">
      <button
        className="topbar__btn"
        type="button"
        aria-label="Open navigation"
        aria-controls="rail"
        aria-expanded={railOpen}
        onClick={onMenuClick}
      >
        <Icon id="i-menu" />
      </button>
      <span className="topbar__brand">
        <Brand />
      </span>

      {/* Discoverable from every page: the people who need it are on other
          teams and will not be reading the repo. */}
      <a className="topbar__docs" href="/integrate">
        For developers
      </a>
    </header>
  );
}
