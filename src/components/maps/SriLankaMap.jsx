import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { RotateCcw } from "lucide-react";

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

const BASE_VIEW = { center: [80.75, 7.88], zoom: 1 };

const getProvinceFocus = (label, event) => {
  const bounds = event?.currentTarget?.getBBox?.();
  const fitWidth = bounds?.width ? (600 * 0.72) / bounds.width : 2;
  const fitHeight = bounds?.height ? (700 * 0.72) / bounds.height : 2;

  return {
    center: LABELS[label] || BASE_VIEW.center,
    zoom: Math.max(1.05, Math.min(3, fitWidth, fitHeight)),
  };
};

const COLORS = {
  empty: "var(--primary-tint)",
  active: "rgba(var(--primary-rgb), 0.48)",
  hover: "rgba(var(--primary-rgb), 0.68)",
  selected: "var(--primary)",
  selectedHover: "var(--primary-hover)",
  border: "#ffffff",
};

export default function SriLankaMap({
  selectedProvince = null,
  onProvince,
  showLabels = true,
  counts = {},
  provinceDetails = {},
  focus = null,
}) {
  const [hovered, setHovered] = useState(null); // display name, e.g. "North Western"
  const [view, setView] = useState(BASE_VIEW);
  const viewRef = useRef(BASE_VIEW);
  const animationFrame = useRef(null);
  const selectedKey = normalizeProvinceName(selectedProvince || "");
  const hoveredKey = normalizeProvinceName(hovered || "");
  const selectedLabel = Object.keys(LABELS).find(
    (name) => normalizeProvinceName(name) === selectedKey,
  );

  const transitionTo = useCallback((nextView) => {
    if (animationFrame.current !== null) {
      window.cancelAnimationFrame(animationFrame.current);
    }

    const start = viewRef.current;
    const startedAt = window.performance.now();

    const animate = (now) => {
      const progress = Math.min((now - startedAt) / 650, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const frame = {
        center: [
          start.center[0] + (nextView.center[0] - start.center[0]) * eased,
          start.center[1] + (nextView.center[1] - start.center[1]) * eased,
        ],
        zoom: start.zoom + (nextView.zoom - start.zoom) * eased,
      };

      viewRef.current = frame;
      setView(frame);

      if (progress < 1) {
        animationFrame.current = window.requestAnimationFrame(animate);
        return;
      }

      viewRef.current = nextView;
      setView(nextView);
      animationFrame.current = null;
    };

    animationFrame.current = window.requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (selectedLabel) {
      transitionTo(
        focus?.center && focus?.zoom
          ? { center: focus.center, zoom: focus.zoom }
          : getProvinceFocus(selectedLabel),
      );
    } else if (
      viewRef.current.zoom !== BASE_VIEW.zoom ||
      viewRef.current.center[0] !== BASE_VIEW.center[0] ||
      viewRef.current.center[1] !== BASE_VIEW.center[1]
    ) {
      transitionTo(BASE_VIEW);
    }

    return () => {
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [focus?.center, focus?.zoom, selectedLabel, transitionTo]);

  const selectProvince = (label, event) => {
    const nextFocus = getProvinceFocus(label, event);
    transitionTo(nextFocus);
    onProvince?.(label, nextFocus);
  };

  const selectedDetails = selectedLabel ? provinceDetails[selectedLabel] : null;

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
        style={{ touchAction: "none" }}
      >
        <ZoomableGroup center={view.center} zoom={view.zoom}>
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
                    onClick={(event) => selectProvince(label, event)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectProvince(label, event);
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
                      fill: isSelected ? "#ffffff" : "var(--primary-hover)",
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
        </ZoomableGroup>
      </ComposableMap>

      {selectedLabel && (
        <div className="map-selected-details" aria-live="polite">
          <strong className="map-selected-name">
            <span className="map-dot" />
            {selectedLabel} Province
          </strong>
          <div className="map-selected-stats">
            <span><b>{counts[selectedLabel] || 0}</b> Members</span>
            <span><b>{selectedDetails?.locationCount || 0}</b> Locations</span>
            <span><b>{selectedDetails?.assignmentCount || 0}</b> Assignments</span>
          </div>
          <button
            className="map-reset-view"
            type="button"
            aria-label="Reset map view"
            title="Reset map view"
            onClick={() => transitionTo(BASE_VIEW)}
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {showLabels && hovered && !selectedLabel && (
        <div className="map-hover-label">
          <span className="map-dot" />
          {hovered}
          <em>{counts[hovered] || 0} {(counts[hovered] || 0) === 1 ? "member" : "members"}</em>
        </div>
      )}

      
    </div>
  );
}