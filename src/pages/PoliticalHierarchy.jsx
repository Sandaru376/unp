import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Building2,
  MapPin,
  Users,
  Settings2,
} from "lucide-react";

import { useOrganization } from "../context/OrganizationContext";
import { getInitials } from "../data/selectors";

function PersonCard({ person, onSelect, compact = false }) {
  const { selectors } = useOrganization();

  const avatarSrc = person.photo || person.image;
  const location = selectors.getPersonLocation(person);

  return (
    <button
      className={`hierarchy-person ${compact ? "compact" : ""}`}
      onClick={() => onSelect?.(person)}
      type="button"
      aria-label={`${person.name} — ${location.positionName || "No assignment"}`}
    >
      <div className="hierarchy-avatar">
        {avatarSrc ? (
          <img src={avatarSrc} alt={person.name} />
        ) : (
          getInitials(person.name)
        )}
      </div>

      <div className="hierarchy-person-tooltip">
        <strong>{person.name}</strong>
        <span>{location.positionName || "Unassigned"}</span>
        {location.pathNames.slice(0, -1).map((name) => (
          <small key={name}>{name}</small>
        ))}
      </div>
    </button>
  );
}

function PositionGroup({ title, people, onSelectPerson }) {
  return (
    <div className="hierarchy-position-group">
      <div className="hierarchy-position-title">
        <span>{title}</span>
        <b>{people.length}</b>
      </div>

      {people.length > 0 ? (
        <div className="hierarchy-people-grid compact-grid">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onSelect={onSelectPerson}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="hierarchy-vacant">
          <span className="hierarchy-vacant-dot" />
          <span>Vacant</span>
        </div>
      )}
    </div>
  );
}

function LocationNode({
  location,
  matchesAssignment,
  onSelectPerson,
  goSetup,
  defaultOpen = true,
}) {
  const { positions, selectors } = useOrganization();
  const [open, setOpen] = useState(defaultOpen);

  const type = selectors.getLocationTypeById(location.locationTypeId);
  const children = selectors.getChildLocations(location.id);

  const nodeAssignments = selectors
    .getAssignmentsAtLocation(location.id)
    .filter(matchesAssignment);

  const groups = positions
    .map((position) => ({
      key: position.id,
      title: position.name,
      people: nodeAssignments
        .filter((assignment) => assignment.positionId === position.id)
        .map((assignment) => selectors.getPersonById(assignment.personId))
        .filter(Boolean),
    }))
    .filter((group) => group.people.length > 0);

  const personCount = new Set(
    selectors.getAssignmentsAtLocation(location.id).map((a) => a.personId),
  ).size;

  return (
    <section className={`hierarchy-node ${open ? "is-open" : ""}`}>
      <button
        className="hierarchy-node-header"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="hierarchy-node-icon">
          <MapPin size={20} />
        </span>

        <span className="hierarchy-node-heading">
          <strong>{location.name}</strong>
          <small>
            {type?.name || "Location"} · {personCount}{" "}
            {personCount === 1 ? "person" : "people"} · {children.length}{" "}
            {children.length === 1 ? "child" : "children"}
          </small>
        </span>

        <span className="hierarchy-node-toggle">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>

      {open && (
        <div className="hierarchy-node-content">
          {groups.length ? (
            <div className="hierarchy-position-list">
              {groups.map((group) => (
                <PositionGroup
                  key={group.key}
                  title={group.title}
                  people={group.people}
                  onSelectPerson={onSelectPerson}
                />
              ))}
            </div>
          ) : (
            <div className="hierarchy-empty">
              {selectors.getAssignmentsAtLocation(location.id).length
                ? "No matching assignments at this location."
                : "No assignments at this location yet."}
            </div>
          )}

          {children.map((child) => (
            <LocationNode
              key={child.id}
              location={child}
              matchesAssignment={matchesAssignment}
              onSelectPerson={onSelectPerson}
              goSetup={goSetup}
              defaultOpen={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function PoliticalHierarchy({
  setSelectedPersonId,
  goSetup,
}) {
  const { locations, positions, assignments, selectors } = useOrganization();

  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("All");
  const [focusLocationId, setFocusLocationId] = useState("");

  const roots = useMemo(() => {
    if (focusLocationId) {
      const focused = selectors.getLocationById(focusLocationId);
      return focused ? [focused] : [];
    }
    return selectors.getRootLocations();
  }, [focusLocationId, locations, selectors]);

  const matchesAssignment = (assignment) => {
    if (positionFilter !== "All" && assignment.positionId !== positionFilter) {
      return false;
    }

    const query = search.trim().toLowerCase();
    if (!query) return true;

    const view = selectors.getAssignmentView(assignment);

    return [
      view.personName,
      view.positionName,
      view.locationName,
      view.pathString,
      assignment.isActive === false ? "inactive" : "active",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  };

  const filteredCount = assignments.filter(matchesAssignment).length;

  const selectPerson = (person) => {
    setSelectedPersonId?.(person.id);
  };

  return (
    <div className="political-hierarchy-page">
      <div className="tag">Leadership Network</div>

      <div className="hierarchy-header">
        <div>
          <h1>Organization Hierarchy</h1>

          <p className="mu lead">
            Locations, positions and people exactly as you configured them.
          </p>
        </div>

        <div className="hierarchy-member-count">
          <Users size={18} />
          <strong>{filteredCount}</strong>
          <span>assignments</span>
        </div>
      </div>

      {/* Controls */}
      <div className="card hierarchy-controls">
        <div className="hierarchy-control hierarchy-search">
          <label htmlFor="hierarchy-search">Search</label>

          <div className="hierarchy-search-input">
            <Search size={17} />

            <input
              id="hierarchy-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search person, position or location…"
            />
          </div>
        </div>

        <div className="hierarchy-control">
          <label htmlFor="hierarchy-location">Location</label>

          <select
            id="hierarchy-location"
            value={focusLocationId}
            onChange={(event) => setFocusLocationId(event.target.value)}
          >
            <option value="">All root locations</option>
            {locations
              .map((location) => ({
                id: location.id,
                label: selectors.getLocationPathString(location.id),
              }))
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
          </select>
        </div>

        <div className="hierarchy-control">
          <label htmlFor="hierarchy-position">Position</label>

          <select
            id="hierarchy-position"
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
          >
            <option value="All">All Positions</option>

            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main hierarchy */}
      <div className="hierarchy-tree">
        <div className="hierarchy-root">
          <div className="hierarchy-root-icon">
            <Building2 size={22} />
          </div>

          <div>
            <strong>Organization</strong>
            <span>
              {locations.length} locations · {positions.length} positions ·{" "}
              {assignments.length} assignments
            </span>
          </div>
        </div>

        <div className="hierarchy-root-line" />

        {locations.length ? (
          roots.map((location) => (
            <LocationNode
              key={location.id}
              location={location}
              matchesAssignment={matchesAssignment}
              onSelectPerson={selectPerson}
              goSetup={goSetup}
            />
          ))
        ) : (
          <div className="card hierarchy-no-results">
            <MapPin size={22} />
            <strong>No locations have been created yet.</strong>
            <span>
              Build your structure in Organization Setup, then assign people to
              positions and locations.
            </span>
            {goSetup && (
              <button type="button" className="btn sm" onClick={goSetup}>
                <Settings2 size={14} aria-hidden="true" />
                Open Organization Setup
              </button>
            )}
          </div>
        )}

        {locations.length > 0 && !filteredCount && (
          <div className="card hierarchy-no-results">
            <Search size={22} />
            <strong>No matching assignments</strong>
            <span>Try another search or position filter.</span>
          </div>
        )}
      </div>
    </div>
  );
}
