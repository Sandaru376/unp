import React, { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

import sriLankaProvinces from "../../data/sriLankaProvincesGeo";
import "./SriLankaMap.css";

const normalizeProvinceName = (name = "") =>
  name.toLowerCase().replace(/\s+province$/i, "").replace(/\s+/g, " ").trim();

const displayProvinceName = (name = "") =>
  name.replace(/\s+province$/i, "").trim();

// [longitude, latitude] positions for the labels
const LABELS = {
  Northern: [80.35, 9.0],
  "North Western": [80.0, 7.9],
  "North Central": [80.7, 8.3],
  Eastern: [81.35, 7.7],
  Central: [80.72, 7.2],
  Western: [80.0, 6.95],
  Sabaragamuwa: [80.55, 6.62],
  Uva: [81.15, 6.95],
  Southern: [80.6, 6.15],
};

const COLORS = {
  empty: "#d3e9dd",          // province with no members yet
  active: "#97d3b2",         // province that has members
  hover: "#5fc08c",
  selected: "#0a8f4a",
  selectedHover: "#087a40",
  border: "#ffffff",
};

export default function SriLankaMap({
  selectedProvince = null,
  onProvince,
  showLabels = true,
  counts = {},
}) {
  const [hovered, setHovered] = useState(null); // display name, e.g. "North Western"
  const selectedKey = normalizeProvinceName(selectedProvince || "");
  const hoveredKey = normalizeProvinceName(hovered || "");

  return (
    <div className="sri-lanka-map-wrapper">
      <div className="map-top-label">
        <span className="map-dot" />
        <span>Sri Lanka</span>
      </div>

      <div className="map-legend" aria-hidden="true">
        <span><i className="sw sw-active" />Has members</span>
        <span><i className="sw sw-empty" />No members yet</span>
        <span><i className="sw sw-selected" />Selected</span>
      </div>

      <ComposableMap
        className="sri-lanka-map"
        width={600}
        height={700}
        projection="geoMercator"
        projectionConfig={{ scale: 9200, center: [80.75, 7.88] }}
      >
        <Geographies geography={sriLankaProvinces}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const label = displayProvinceName(geo.properties.province_name);
              const key = normalizeProvinceName(label);
              const isSelected = Boolean(selectedKey) && key === selectedKey;
              const isHovered = hoveredKey === key;
              const hasMembers = (counts[label] || 0) > 0;

              let fill = hasMembers ? COLORS.active : COLORS.empty;
              if (isSelected && isHovered) fill = COLORS.selectedHover;
              else if (isSelected) fill = COLORS.selected;
              else if (isHovered) fill = COLORS.hover;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className={`sri-lanka-province${isSelected ? " is-selected" : ""}`}
                  fill={fill}
                  stroke={COLORS.border}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={() => setHovered(label)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(label)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onProvince?.(label)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onProvince?.(label);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${label} Province`}
                />
              );
            })
          }
        </Geographies>

        {showLabels &&
          Object.entries(LABELS).map(([name, coordinates]) => {
            const isSelected = selectedKey === normalizeProvinceName(name);
            return (
              <Marker key={name} coordinates={coordinates}>
                <text
                  textAnchor="middle"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    fill: isSelected ? "#ffffff" : "#064d29",
                    stroke: isSelected ? "none" : "rgba(255,255,255,0.75)",
                    strokeWidth: 3,
                    strokeLinejoin: "round",
                    paintOrder: "stroke",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {name}
                </text>
              </Marker>
            );
          })}
      </ComposableMap>

      {showLabels && hovered && (
        <div className="map-hover-label">
          <span className="map-dot" />
          {hovered}
          <em>{counts[hovered] || 0} {(counts[hovered] || 0) === 1 ? "member" : "members"}</em>
        </div>
      )}

      
    </div>
  );
}