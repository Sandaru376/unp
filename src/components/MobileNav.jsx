import React from "react";
import { NAV_ITEMS } from "./Sidebar";

export default function MobileNav({ view, onNavigate }) {
  return (
    <nav className="bn" aria-label="Main navigation">
      {NAV_ITEMS.map(([key, Icon, label, mobileLabel]) => (
        <button
          className={view === key ? "on" : ""}
          key={key}
          onClick={() => onNavigate(key)}
          aria-current={view === key ? "page" : undefined}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{mobileLabel || label.split(" ")[0]}</span>
        </button>
      ))}
    </nav>
  );
}
