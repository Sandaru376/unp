import React from "react";
import { Bell, Search } from "lucide-react";

export default function Topbar({ query, onSearch, onHome }) {
  return (
    <header className="topbar">
      <button className="topbar-brand" onClick={onHome} aria-label="Go to dashboard">
        <span className="logo">UNP</span>
        <span className="topbar-title">
          <b>UNP</b>
          <small>Organization Platform</small>
        </span>
      </button>

      <div className="topbar-search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Search people"
          placeholder="Search people, positions, locations…"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>

      <div className="topbar-right">
        <span className="demo">Prototype · demo data</span>
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={18} aria-hidden="true" />
        </button>
        <div className="me" title="Administrator">Ad</div>
      </div>
    </header> 
  );
}