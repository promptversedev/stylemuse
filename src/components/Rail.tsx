"use client";

import { Icon } from "@/components/IconSprite";
import { Brand } from "@/components/Brand";
import { TABS, type TabId } from "@/lib/nav-data";

export function Rail({
  open,
  onClose,
  activeTab,
  onSelectTab,
}: {
  open: boolean;
  onClose: () => void;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}) {
  return (
    <>
      <nav className={"rail" + (open ? " is-open" : "")} id="rail" aria-label="Model and background switcher">
        <div className="rail__brand">
          <Brand />
        </div>
        <ul className="rail__list">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                className="rail__link"
                type="button"
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => {
                  onSelectTab(tab.id);
                  onClose();
                }}
              >
                <Icon id={`i-${tab.icon}`} />
                <span>{tab.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="scrim" id="navScrim" hidden={!open} onClick={onClose} />
    </>
  );
}
