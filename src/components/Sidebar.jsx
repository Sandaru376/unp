import React from "react";
import {
  LayoutDashboard,
  Map,
  Users,
  ClipboardList,
  Network,
  Settings2,
} from "lucide-react";

/* [view key, icon, label, mobile label] */
export const NAV_ITEMS = [
  ["dash", LayoutDashboard, "Dashboard", "Home"],
  ["map", Map, "Map Explorer", "Map"],
  ["people", Users, "People", "People"],
  ["assignments", ClipboardList, "Assignments", "Assign"],
  ["setup", Settings2, "Organization Setup", "Setup"],
  ["hierarchy", Network, "Hierarchy", "Hierarchy"],
];

export default function Sidebar({ view, onNavigate }) {
  return (
    <aside>
      <div className="side-label">Menu</div>
      {NAV_ITEMS.map(([key, Icon, label]) => (
        <button
          className={`nav ${view === key ? "on" : ""}`}
          key={key}
          onClick={() => onNavigate(key)}
          aria-current={view === key ? "page" : undefined}
        >
          <span className="nav-ico">
            <Icon size={19} aria-hidden="true" />
          </span>
          {label}
        </button>
      ))}
      <div className="side-bottom">
        <p>United National Party</p>
        <small>Organization Platform · v0.1</small>
      </div>
    </aside>
  );
}
