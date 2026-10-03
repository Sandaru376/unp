import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, ClipboardList, Settings2, X } from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import ConfirmDialog from "../components/ConfirmDialog";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  personId: "",
  positionId: "",
  locationId: "",
  startDate: today(),
  endDate: "",
  isActive: true,
});

function PersonCombobox({ id, people, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedPerson = people.find((person) => person.id === value);
  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const choosePerson = (person) => {
    onChange(person.id);
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      return;
    }

    if (!filteredPeople.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, filteredPeople.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) =>
        index < 0 ? filteredPeople.length - 1 : Math.max(index - 1, 0),
      );
    } else if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      choosePerson(filteredPeople[activeIndex] || filteredPeople[0]);
    }
  };

  return (
    <div className="assignment-person-combobox">
      <div className="assignment-person-input">
        <Search size={16} aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            isOpen && activeIndex >= 0 && filteredPeople[activeIndex]
              ? `${id}-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          disabled={!people.length}
          placeholder={people.length ? "Search people..." : "No people created yet"}
          value={isOpen ? query : selectedPerson?.name || ""}
          onFocus={() => {
            setQuery("");
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onBlur={() => {
            setIsOpen(false);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(event.target.value ? 0 : -1);
            onChange("");
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {selectedPerson && (
          <button
            className="assignment-person-clear"
            type="button"
            aria-label="Clear selected person"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setQuery("");
              setActiveIndex(0);
              setIsOpen(true);
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="assignment-person-options" id={`${id}-options`} role="listbox">
          {filteredPeople.length ? (
            filteredPeople.map((person, index) => (
              <div
                className="assignment-person-option"
                id={`${id}-option-${index}`}
                key={person.id}
                role="option"
                aria-selected={person.id === value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                data-active={activeIndex === index}
                onClick={() => choosePerson(person)}
              >
                {person.name}
              </div>
            ))
          ) : (
            <div className="assignment-person-empty" role="status">
              No people match “{query}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Assignments({ notify = () => {}, goSetup }) {
  const {
    people,
    positions,
    locations,
    assignments,
    selectors,
    addAssignment,
    updateAssignment,
    deleteAssignment,
  } = useOrganization();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(null);

  /* Location options show the full path so the hierarchy is obvious. */
  const locationOptions = useMemo(
    () =>
      locations
        .map((location) => ({
          id: location.id,
          label: selectors.getLocationPathString(location.id),
          inactive: location.isActive === false,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [locations, selectors],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return assignments
      .map((assignment) => selectors.getAssignmentView(assignment))
      .filter((view) => {
        if (!needle) return true;

        return [
          view.personName,
          view.positionName,
          view.pathString,
          view.assignment.startDate,
          view.assignment.isActive === false ? "inactive" : "active",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .reverse();
  }, [assignments, query, selectors]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (assignment) => {
    setEditingId(assignment.id);
    setForm({
      personId: assignment.personId,
      positionId: assignment.positionId,
      locationId: assignment.locationId,
      startDate: assignment.startDate || "",
      endDate: assignment.endDate || "",
      isActive: assignment.isActive !== false,
    });
    setError("");
    setShowForm(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = editingId
      ? updateAssignment(editingId, form)
      : addAssignment(form);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notify(editingId ? "Assignment updated" : "Assignment created");
    setShowForm(false);
    resetForm();
  };

  const requestDelete = (view) => {
    setConfirm({
      title: "Delete assignment?",
      message: `${view.personName} will no longer be ${view.positionName} at ${view.pathString || view.locationName}.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        deleteAssignment(view.assignment.id);
        setConfirm(null);
        notify("Assignment deleted");
        if (editingId === view.assignment.id) {
          setShowForm(false);
          resetForm();
        }
      },
    });
  };

  const missing = {
    people: people.length === 0,
    positions: positions.length === 0,
    locations: locations.length === 0,
  };

  const setField = (key, value) => {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <div className="tag">Team</div>

      <div className="setup-header">
        <div>
          <h1>Assignments</h1>
          <p className="mu lead">
            Connect a person, a position and a location. One person can hold
            several assignments — each one is stored as its own record.
          </p>
        </div>

        <div className="setup-stats">
          <span className="setup-stat">
            <b>{assignments.length}</b> Assignments
          </span>
          <span className="setup-stat">
            <b>{people.length}</b> People
          </span>
          <span className="setup-stat">
            <b>{positions.length}</b> Positions
          </span>
          <span className="setup-stat">
            <b>{locations.length}</b> Locations
          </span>
        </div>
      </div>

      {(missing.people || missing.positions || missing.locations) && (
        <div className="saved setup-callout">
          <div className="saved-message">
            <Settings2 size={18} aria-hidden="true" />
            <span>
              {[
                missing.people ? "people" : null,
                missing.positions ? "positions" : null,
                missing.locations ? "locations" : null,
              ]
                .filter(Boolean)
                .join(", ")}{" "}
              must exist before an assignment can be saved.
            </span>
          </div>

          {goSetup && (
            <button type="button" className="btn sm" onClick={goSetup}>
              Open Organization Setup
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="card setup-panel">
          <div className="setup-section-header">
            <div>
              <h2>{editingId ? "Edit Assignment" : "Create Assignment"}</h2>
              <p className="mu">
                Only the location id is stored — the path you see is calculated
                from the hierarchy.
              </p>
            </div>
          </div>

          <form className="setup-form" onSubmit={handleSubmit}>
            <div className="setup-field">
              <label htmlFor="assignment-person">Person</label>
              <PersonCombobox
                id="assignment-person"
                people={people}
                value={form.personId}
                onChange={(value) => setField("personId", value)}
              />
            </div>

            <div className="setup-field">
              <label htmlFor="assignment-position">Position</label>
              <select
                id="assignment-position"
                value={form.positionId}
                onChange={(event) => setField("positionId", event.target.value)}
              >
                <option value="">
                  {positions.length ? "Select position" : "No positions created yet"}
                </option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="setup-field">
              <label htmlFor="assignment-location">Location</label>
              <select
                id="assignment-location"
                value={form.locationId}
                onChange={(event) => setField("locationId", event.target.value)}
              >
                <option value="">
                  {locations.length ? "Select location" : "No locations created yet"}
                </option>
                {locationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {option.inactive ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="setup-field">
              <label htmlFor="assignment-start">Start Date</label>
              <input
                id="assignment-start"
                type="date"
                value={form.startDate}
                onChange={(event) => setField("startDate", event.target.value)}
              />
            </div>

            <div className="setup-field">
              <label htmlFor="assignment-end">End Date</label>
              <input
                id="assignment-end"
                type="date"
                value={form.endDate}
                onChange={(event) => setField("endDate", event.target.value)}
              />
            </div>

            <div className="setup-field">
              <label htmlFor="assignment-status">Status</label>
              <select
                id="assignment-status"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setField("isActive", event.target.value === "active")
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="setup-field setup-actions">
              <button className="btn" type="submit">
                <Plus size={15} aria-hidden="true" />
                {editingId ? "Save Changes" : "Save Assignment"}
              </button>

              <button
                className="btn o"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>

          {error && (
            <p className="setup-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="setup-header">
        <div>
          <h2>All Assignments</h2>
        </div>

        {!showForm && (
          <button type="button" className="btn" onClick={openCreate}>
            <Plus size={15} aria-hidden="true" />
            Create Assignment
          </button>
        )}
      </div>

      <div className="searchbar">
        <Search size={18} aria-hidden="true" />
        <input
          aria-label="Search assignments"
          placeholder="Search person, position or location…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="card tw">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Position</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((view) => (
              <tr key={view.assignment.id}>
                <td>
                  <b>{view.personName}</b>
                </td>
                <td>{view.positionName}</td>
                <td>
                  <span className="loc-path" title={view.pathString}>
                    {view.pathString || view.locationName}
                  </span>
                </td>
                <td>
                  <span className={`bd ${view.assignment.isActive === false ? "bd-muted" : ""}`}>
                    {view.assignment.isActive === false ? "Inactive" : "Active"}
                  </span>
                </td>
                <td className="table-actions">
                  <button
                    type="button"
                    className="btn sm o"
                    onClick={() => openEdit(view.assignment)}
                  >
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn sm o icon-action"
                    aria-label={`Delete assignment for ${view.personName}`}
                    onClick={() => requestDelete(view)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan="5" className="empty-state">
                  <div className="setup-empty">
                    <ClipboardList size={26} aria-hidden="true" />
                    <b>
                      {assignments.length
                        ? "No matching assignments."
                        : "No assignments have been created yet."}
                    </b>
                    <span className="mu">
                      {assignments.length
                        ? "Try a different search."
                        : "Assign a person to a position and a location to get started."}
                    </span>
                    {!assignments.length && !showForm && (
                      <button type="button" className="btn sm" onClick={openCreate}>
                        <Plus size={15} aria-hidden="true" />
                        Create Assignment
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
