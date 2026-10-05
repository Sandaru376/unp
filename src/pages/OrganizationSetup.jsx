import React, { useEffect, useMemo, useState } from "react";
import {
  Layers,
  MapPin,
  Award,
  Plus,
  Pencil,
  Power,
  Trash2,
  Search,
} from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import ConfirmDialog from "../components/ConfirmDialog";

/* =========================================================
   Helpers
   ========================================================= */

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const newLocationTypeRow = () => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  isActive: true,
});

const newLocationRow = () => ({
  id: crypto.randomUUID(),
  name: "",
  locationTypeId: "",
  parentId: "",
  isActive: true,
});

const newPositionTypeRow = () => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  isActive: true,
});

const newPositionRow = () => ({
  id: crypto.randomUUID(),
  name: "",
  positionTypeId: "",
  parentPositionId: "",
  allowedLocationTypeIds: [],
  isActive: true,
});

/** All positions that sit below `rootId` in the parent chain. */
function getPositionDescendantIds(rootId, positions) {
  const result = new Set();
  const stack = [rootId];

  while (stack.length) {
    const current = stack.pop();
    positions.forEach((position) => {
      if (position.parentPositionId === current && !result.has(position.id)) {
        result.add(position.id);
        stack.push(position.id);
      }
    });
  }

  return result;
}

/**
 * Saves rows one by one. Rows that were saved are removed from the list,
 * so if one row fails the user keeps only the rows that still need work.
 */
function runBulkSave({ rows, getRowError, toPayload, addItem }) {
  const invalidIndex = rows.findIndex((row) => getRowError(row));

  if (invalidIndex !== -1) {
    return {
      savedCount: 0,
      remaining: rows,
      error: `Row ${invalidIndex + 1} is incomplete: ${getRowError(
        rows[invalidIndex],
      )}`,
    };
  }

  const savedIds = [];

  for (const row of rows) {
    const result = addItem(toPayload(row));

    if (!result.ok) {
      return {
        savedCount: savedIds.length,
        remaining: rows.filter((item) => !savedIds.includes(item.id)),
        error: `Could not add “${row.name.trim()}”: ${result.error}`,
      };
    }

    savedIds.push(row.id);
  }

  return { savedCount: savedIds.length, remaining: [], error: "" };
}

function useBulkRows(createRow) {
  const [rows, setRows] = useState(() => [createRow()]);

  return {
    rows,
    setRows,
    reset: () => setRows([createRow()]),
    add: () => setRows((current) => [...current, createRow()]),
    remove: (rowId) =>
      setRows((current) =>
        current.length === 1
          ? current
          : current.filter((row) => row.id !== rowId),
      ),
    update: (rowId, patch) =>
      setRows((current) =>
        current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      ),
  };
}

/* =========================================================
   Shared building blocks
   ========================================================= */

function useConfirm() {
  const [confirm, setConfirm] = useState(null);

  const dialog = (
    <ConfirmDialog
      open={Boolean(confirm)}
      title={confirm?.title}
      message={confirm?.message}
      confirmLabel={confirm?.confirmLabel}
      onConfirm={confirm?.onConfirm}
      onCancel={() => setConfirm(null)}
    />
  );

  return [setConfirm, dialog];
}

function ErrorLine({ message }) {
  if (!message) return null;

  return (
    <p className="setup-error" role="alert">
      {message}
    </p>
  );
}

function EmptyState({ icon: Icon, title, hint, actionLabel, onAction }) {
  return (
    <div className="setup-empty">
      <Icon size={26} aria-hidden="true" />
      <b>{title}</b>
      <span className="mu">{hint}</span>
      {actionLabel && (
        <button type="button" className="btn sm" onClick={onAction}>
          <Plus size={15} aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SectionHeader({ title, hint, actionLabel, onAction }) {
  return (
    <div
      className="setup-section-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 20,
      }}
    >
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p className="mu" style={{ margin: "6px 0 0" }}>
          {hint}
        </p>
      </div>

      <button
        type="button"
        className="btn"
        onClick={onAction}
        style={{ flexShrink: 0 }}
      >
        <Plus size={15} aria-hidden="true" />
        {actionLabel}
      </button>
    </div>
  );
}

/**
 * Popup used for every add / edit dialog.
 * `description` can be a string or an array of lines.
 * Set `closeOnBackdrop={false}` for big forms so a stray click
 * doesn't throw away typed data.
 */
function SetupModal({
  open,
  title,
  description,
  onClose,
  maxWidth = 560,
  closeOnBackdrop = true,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const lines = Array.isArray(description)
    ? description
    : description
      ? [description]
      : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--card, #fff)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.20)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          style={{
            padding: "22px 24px 16px",
            borderBottom: "1px solid var(--line, #e5e7eb)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>{title}</h2>

              {lines.map((line, index) => (
                <p
                  key={line}
                  className="mu"
                  style={{
                    margin: index === 0 ? "7px 0 0" : "6px 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            <button
              type="button"
              className="btn sm o"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Popup with a table where several items can be entered at once.
 * The <thead>/<tbody> are passed as children.
 */
function BulkAddModal({
  open,
  title,
  descriptions,
  listTitle,
  readyCount,
  addRowLabel,
  saveLabel,
  maxWidth,
  minWidth,
  error,
  onAddRow,
  onClose,
  onSave,
  children,
}) {
  return (
    <SetupModal
      open={open}
      title={title}
      description={descriptions}
      onClose={onClose}
      maxWidth={maxWidth}
      closeOnBackdrop={false}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>{listTitle}</h3>
        <span className="bd">{readyCount} ready to save</span>
      </div>

      <div
        style={{
          overflowX: "auto",
          marginTop: 16,
          border: "1px solid var(--line)",
          borderRadius: 12,
        }}
      >
        <table style={{ width: "100%", minWidth }}>{children}</table>
      </div>

      <button
        type="button"
        className="btn sm o"
        onClick={onAddRow}
        style={{ marginTop: 16 }}
      >
        <Plus size={14} aria-hidden="true" />
        {addRowLabel}
      </button>

      <ErrorLine message={error} />

      <div
        className="setup-actions"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 24,
        }}
      >
        <button type="button" className="btn o" onClick={onClose}>
          Cancel
        </button>

        <button type="button" className="btn" onClick={onSave}>
          {saveLabel}
        </button>
      </div>
    </SetupModal>
  );
}

function RemoveRowButton({ label, disabled, onClick }) {
  return (
    <button
      type="button"
      className="btn sm o icon-action"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title="Remove row"
    >
      <Trash2 size={14} aria-hidden="true" />
    </button>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span className={`bd ${isActive ? "" : "bd-muted"}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function StatusSelect({ id, value, onChange }) {
  return (
    <select
      id={id}
      value={value ? "active" : "inactive"}
      onChange={(event) => onChange(event.target.value === "active")}
    >
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  );
}

/** Footer used by every single-item add/edit form. */
function FormActions({ onCancel, submitLabel, showPlus = false }) {
  return (
    <div
      className="setup-actions"
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 20,
      }}
    >
      <button className="btn o" type="button" onClick={onCancel}>
        Cancel
      </button>

      <button className="btn" type="submit">
        {showPlus && <Plus size={15} aria-hidden="true" />}
        {submitLabel}
      </button>
    </div>
  );
}

function LocationTypePicker({ locationTypes, selectedIds, onToggle, gap = 8 }) {
  if (locationTypes.length === 0) {
    return <span className="mu">Create location types first.</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap }}>
      {locationTypes.map((type) => {
        const selected = selectedIds.includes(type.id);

        return (
          <button
            key={type.id}
            type="button"
            className={`btn sm ${selected ? "" : "o"}`}
            aria-pressed={selected}
            onClick={() => onToggle(type.id)}
          >
            {type.name}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   Location types
   ========================================================= */

function LocationTypesSection({ notify }) {
  const {
    locationTypes,
    locations,
    addLocationType,
    updateLocationType,
    deleteLocationType,
  } = useOrganization();

  // Edit form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Multi-row add
  const [isAddOpen, setIsAddOpen] = useState(false);
  const bulk = useBulkRows(newLocationTypeRow);

  const [error, setError] = useState("");
  const [setConfirm, confirmDialog] = useConfirm();

  const closeEdit = () => {
    setName("");
    setDescription("");
    setIsActive(true);
    setEditingId(null);
    setError("");
    setIsEditOpen(false);
  };

  const openAdd = () => {
    closeEdit();
    bulk.reset();
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setError("");
    bulk.reset();
  };

  const readyCount = bulk.rows.filter((row) => row.name.trim()).length;

  const saveRows = () => {
    setError("");

    const outcome = runBulkSave({
      rows: bulk.rows,
      getRowError: (row) => (row.name.trim() ? "" : "enter a name."),
      toPayload: (row) => ({
        name: row.name.trim(),
        description: row.description.trim(),
        isActive: row.isActive,
      }),
      addItem: addLocationType,
    });

    if (outcome.savedCount) {
      notify(`${plural(outcome.savedCount, "location type")} added`);
    }

    if (outcome.error) {
      bulk.setRows(outcome.remaining);
      setError(outcome.error);
      return;
    }

    closeAdd();
  };

  const startEdit = (type) => {
    setIsAddOpen(false);
    setEditingId(type.id);
    setName(type.name);
    setDescription(type.description || "");
    setIsActive(type.isActive !== false);
    setError("");
    setIsEditOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = updateLocationType(editingId, {
      name,
      description,
      isActive,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notify("Location type updated");
    closeEdit();
  };

  const toggleStatus = (type) => {
    const result = updateLocationType(type.id, {
      name: type.name,
      description: type.description || "",
      isActive: type.isActive === false,
    });

    notify(
      result.ok
        ? type.isActive === false
          ? "Location type activated"
          : "Location type deactivated"
        : result.error,
    );
  };

  const requestDelete = (type) => {
    const usage = locations.filter(
      (location) => location.locationTypeId === type.id,
    ).length;

    if (usage) {
      setError(
        `Cannot delete “${type.name}”: ${plural(usage, "location")} still use it.`,
      );
      return;
    }

    setError("");
    setConfirm({
      title: "Delete location type?",
      message: `“${type.name}” will no longer be available when creating locations.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        const result = deleteLocationType(type.id);

        notify(result.ok ? "Location type deleted" : result.error);
        setConfirm(null);
        if (editingId === type.id) closeEdit();
      },
    });
  };

  return (
    <div className="card setup-panel">
      <SectionHeader
        title="Location Types"
        hint="A location type describes what kind of place a location is — for example Province, District, Area, Ward or Zone. You decide which types exist."
        actionLabel="Add Location Type"
        onAction={openAdd}
      />

      {!isAddOpen && !isEditOpen && <ErrorLine message={error} />}

      <BulkAddModal
        open={isAddOpen}
        title="Add Location Type"
        descriptions={[
          "Create location types for your organization.",
          "Add one or more location types at once.",
        ]}
        listTitle="Location Types to add"
        readyCount={readyCount}
        addRowLabel="Add another location type"
        saveLabel="Save Location Types"
        maxWidth={860}
        minWidth={640}
        error={error}
        onAddRow={bulk.add}
        onClose={closeAdd}
        onSave={saveRows}
      >
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {bulk.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="text"
                  aria-label="Location type name"
                  value={row.name}
                  placeholder="Example: Province"
                  onChange={(event) =>
                    bulk.update(row.id, { name: event.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <input
                  type="text"
                  aria-label="Location type description"
                  value={row.description}
                  placeholder="Enter a short description"
                  onChange={(event) =>
                    bulk.update(row.id, { description: event.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <StatusSelect
                  value={row.isActive}
                  onChange={(value) => bulk.update(row.id, { isActive: value })}
                />
              </td>

              <td>
                <RemoveRowButton
                  label="Remove location type row"
                  disabled={bulk.rows.length === 1}
                  onClick={() => bulk.remove(row.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </BulkAddModal>

      <SetupModal
        open={isEditOpen}
        title="Edit Location Type"
        description="Update the details of this location type."
        onClose={closeEdit}
      >
        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-field">
            <label htmlFor="location-type-name">Name</label>
            <input
              id="location-type-name"
              type="text"
              value={name}
              placeholder="Example: Province"
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="setup-field">
            <label htmlFor="location-type-description">Description</label>
            <input
              id="location-type-description"
              type="text"
              value={description}
              placeholder="Enter a short description"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="location-type-status">Status</label>
            <StatusSelect
              id="location-type-status"
              value={isActive}
              onChange={setIsActive}
            />
          </div>

          <ErrorLine message={error} />
          <FormActions onCancel={closeEdit} submitLabel="Save Changes" />
        </form>
      </SetupModal>

      {locationTypes.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No location types have been created yet."
          hint="Create your first location type — nothing is pre-filled."
          actionLabel="Add Location Type"
          onAction={openAdd}
        />
      ) : (
        <div className="card tw setup-table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Locations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locationTypes.map((type) => (
                <tr key={type.id}>
                  <td>
                    <b>{type.name}</b>
                  </td>
                  <td className="mu">{type.description || "—"}</td>
                  <td>
                    <StatusBadge isActive={type.isActive !== false} />
                  </td>
                  <td>
                    {
                      locations.filter(
                        (location) => location.locationTypeId === type.id,
                      ).length
                    }
                  </td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="btn sm o"
                      onClick={() => startEdit(type)}
                    >
                      <Pencil size={13} aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn sm o"
                      onClick={() => toggleStatus(type)}
                    >
                      <Power size={13} aria-hidden="true" />
                      {type.isActive === false ? "Activate" : "Deactivate"}
                    </button>
                    <button
                      type="button"
                      className="btn sm o icon-action"
                      aria-label={`Delete ${type.name}`}
                      onClick={() => requestDelete(type)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

/* =========================================================
   Locations (hierarchy built from parentId)
   ========================================================= */

function LocationNode({ location, depth, query, onEdit, onToggle, onDelete }) {
  const { selectors } = useOrganization();
  const [open, setOpen] = useState(true);

  const type = selectors.getLocationTypeById(location.locationTypeId);
  const children = selectors.getChildLocations(location.id);
  const assignmentCount = selectors.getAssignmentsAtLocation(
    location.id,
  ).length;

  const matchesQuery = (node) => {
    if (!query) return true;
    const typeName =
      selectors.getLocationTypeById(node.locationTypeId)?.name || "";
    const needle = query.toLowerCase();

    return (
      node.name.toLowerCase().includes(needle) ||
      typeName.toLowerCase().includes(needle)
    );
  };

  const subtreeMatches = (node) =>
    matchesQuery(node) ||
    selectors.getChildLocations(node.id).some((child) => subtreeMatches(child));

  if (query && !subtreeMatches(location)) return null;

  const expanded = query ? true : open;

  return (
    <div className="loc-node" data-depth={depth}>
      <div className="loc-row">
        {children.length > 0 ? (
          <button
            type="button"
            className="loc-toggle"
            aria-label={expanded ? "Collapse" : "Expand"}
            aria-expanded={expanded}
            onClick={() => setOpen((value) => !value)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="loc-toggle loc-toggle-leaf" aria-hidden="true">
            ·
          </span>
        )}

        <span className="loc-name">{location.name}</span>
        <span className="setup-chip">{type?.name || "No type"}</span>
        <StatusBadge isActive={location.isActive !== false} />

        <span className="loc-meta">
          {plural(children.length, "child", "children")} ·{" "}
          {plural(assignmentCount, "assignment")}
        </span>

        <span className="loc-actions">
          <button
            type="button"
            className="btn sm o"
            onClick={() => onEdit(location)}
          >
            <Pencil size={13} aria-hidden="true" /> Edit
          </button>
          <button
            type="button"
            className="btn sm o"
            onClick={() => onToggle(location)}
          >
            <Power size={13} aria-hidden="true" />
            {location.isActive === false ? "Activate" : "Deactivate"}
          </button>
          <button
            type="button"
            className="btn sm o icon-action"
            aria-label={`Delete ${location.name}`}
            onClick={() => onDelete(location)}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </span>
      </div>

      {expanded && children.length > 0 && (
        <div className="loc-children">
          {children.map((child) => (
            <LocationNode
              key={child.id}
              location={child}
              depth={depth + 1}
              query={query}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LocationsSection({ notify }) {
  const {
    locationTypes,
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
    selectors,
  } = useOrganization();

  // Edit form
  const [name, setName] = useState("");
  const [locationTypeId, setLocationTypeId] = useState("");
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Multi-row add
  const [isAddOpen, setIsAddOpen] = useState(false);
  const bulk = useBulkRows(newLocationRow);

  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [setConfirm, confirmDialog] = useConfirm();

  /* Every existing location, shown with its full path. */
  const allParentOptions = useMemo(
    () =>
      locations
        .map((location) => ({
          id: location.id,
          label: selectors.getLocationPathString(location.id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [locations, selectors],
  );

  /* When editing, exclude the location itself and its descendants. */
  const editParentOptions = useMemo(() => {
    if (!editingId) return allParentOptions;

    return locations
      .filter(
        (location) =>
          location.id !== editingId &&
          !selectors.isDescendantOf(location.id, editingId),
      )
      .map((location) => ({
        id: location.id,
        label: selectors.getLocationPathString(location.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [locations, editingId, selectors, allParentOptions]);

  const rootLocations = useMemo(
    () =>
      selectors
        .getRootLocations()
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [selectors, locations],
  );

  const trimmedQuery = query.trim();

  const hasMatches = useMemo(() => {
    if (!trimmedQuery) return true;
    const needle = trimmedQuery.toLowerCase();

    const walk = (node) =>
      node.name.toLowerCase().includes(needle) ||
      (selectors.getLocationTypeById(node.locationTypeId)?.name || "")
        .toLowerCase()
        .includes(needle) ||
      selectors.getChildLocations(node.id).some(walk);

    return rootLocations.some(walk);
  }, [trimmedQuery, rootLocations, selectors]);

  const closeEdit = () => {
    setName("");
    setLocationTypeId("");
    setParentId("");
    setIsActive(true);
    setEditingId(null);
    setError("");
    setIsEditOpen(false);
  };

  const openAdd = () => {
    closeEdit();
    bulk.reset();
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setError("");
    bulk.reset();
  };

  const getRowError = (row) => {
    if (!row.name.trim()) return "enter a location name.";
    if (!row.locationTypeId) return "select a location type.";
    return "";
  };

  const readyCount = bulk.rows.filter((row) => !getRowError(row)).length;

  const saveRows = () => {
    setError("");

    const outcome = runBulkSave({
      rows: bulk.rows,
      getRowError,
      toPayload: (row) => ({
        name: row.name.trim(),
        locationTypeId: row.locationTypeId,
        parentId: row.parentId,
        isActive: row.isActive,
      }),
      addItem: addLocation,
    });

    if (outcome.savedCount) {
      notify(`${plural(outcome.savedCount, "location")} added`);
    }

    if (outcome.error) {
      bulk.setRows(outcome.remaining);
      setError(outcome.error);
      return;
    }

    closeAdd();
  };

  const startEdit = (location) => {
    setIsAddOpen(false);
    setEditingId(location.id);
    setName(location.name);
    setLocationTypeId(location.locationTypeId || "");
    setParentId(location.parentId || "");
    setIsActive(location.isActive !== false);
    setError("");
    setIsEditOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = updateLocation(editingId, {
      name,
      locationTypeId,
      parentId,
      isActive,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notify("Location updated");
    closeEdit();
  };

  const toggleStatus = (location) => {
    const result = updateLocation(location.id, {
      name: location.name,
      locationTypeId: location.locationTypeId,
      parentId: location.parentId,
      isActive: location.isActive === false,
    });

    notify(
      result.ok
        ? location.isActive === false
          ? "Location activated"
          : "Location deactivated"
        : result.error,
    );
  };

  const requestDelete = (location) => {
    const childCount = selectors.getChildLocations(location.id).length;
    const assignmentCount = selectors.getAssignmentsAtLocation(
      location.id,
    ).length;

    if (childCount || assignmentCount) {
      setError(
        `Cannot delete “${location.name}”: ${plural(
          childCount,
          "child location",
        )} and ${plural(assignmentCount, "assignment")} still depend on it.`,
      );
      return;
    }

    setError("");
    setConfirm({
      title: "Delete location?",
      message: `“${location.name}” will be removed permanently.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        const result = deleteLocation(location.id);

        notify(result.ok ? "Location deleted" : result.error);
        setConfirm(null);
        if (editingId === location.id) closeEdit();
      },
    });
  };

  return (
    <div className="card setup-panel">
      <SectionHeader
        title="Locations"
        hint="Every actual place of the organization. Pick a location type and, optionally, a parent location — the hierarchy is built from that parent link."
        actionLabel="Add Location"
        onAction={openAdd}
      />

      {!isAddOpen && !isEditOpen && <ErrorLine message={error} />}

      <BulkAddModal
        open={isAddOpen}
        title="Add Location"
        descriptions={[
          "Create locations and optionally connect each one to a parent location.",
          "Add one or more locations at once.",
        ]}
        listTitle="Locations to add"
        readyCount={readyCount}
        addRowLabel="Add another location"
        saveLabel="Save Locations"
        maxWidth={1000}
        minWidth={760}
        error={error}
        onAddRow={bulk.add}
        onClose={closeAdd}
        onSave={saveRows}
      >
        <thead>
          <tr>
            <th>Location Name</th>
            <th>Location Type</th>
            <th>Parent Location</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {bulk.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="text"
                  aria-label="Location name"
                  value={row.name}
                  placeholder="Example: Western Province"
                  onChange={(event) =>
                    bulk.update(row.id, { name: event.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <select
                  aria-label="Location type"
                  value={row.locationTypeId}
                  onChange={(event) =>
                    bulk.update(row.id, { locationTypeId: event.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">
                    {locationTypes.length
                      ? "Select location type"
                      : "No location types created yet"}
                  </option>
                  {locationTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </td>

              <td>
                <select
                  aria-label="Parent location"
                  value={row.parentId}
                  onChange={(event) =>
                    bulk.update(row.id, { parentId: event.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">None (root level)</option>
                  {allParentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>

              <td>
                <StatusSelect
                  value={row.isActive}
                  onChange={(value) => bulk.update(row.id, { isActive: value })}
                />
              </td>

              <td>
                <RemoveRowButton
                  label="Remove location row"
                  disabled={bulk.rows.length === 1}
                  onClick={() => bulk.remove(row.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </BulkAddModal>

      <SetupModal
        open={isEditOpen}
        title="Edit Location"
        description="Update this location and its position in the hierarchy."
        onClose={closeEdit}
      >
        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-field">
            <label htmlFor="location-name">Location Name</label>
            <input
              id="location-name"
              type="text"
              value={name}
              placeholder="Example: Western Province"
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="setup-field">
            <label htmlFor="location-type">Location Type</label>
            <select
              id="location-type"
              value={locationTypeId}
              onChange={(event) => setLocationTypeId(event.target.value)}
            >
              <option value="">
                {locationTypes.length
                  ? "Select location type"
                  : "No location types created yet"}
              </option>

              {locationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setup-field">
            <label htmlFor="location-parent">Parent Location</label>
            <select
              id="location-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">None (root level)</option>

              {editParentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="setup-field">
            <label htmlFor="location-status">Status</label>
            <StatusSelect
              id="location-status"
              value={isActive}
              onChange={setIsActive}
            />
          </div>

          <ErrorLine message={error} />
          <FormActions onCancel={closeEdit} submitLabel="Save Changes" />
        </form>
      </SetupModal>

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations have been created yet."
          hint={
            locationTypes.length
              ? "Add your first location — root locations have no parent."
              : "Create a location type first, then add locations here."
          }
          actionLabel="Add Location"
          onAction={openAdd}
        />
      ) : (
        <>
          <div className="setup-toolbar">
            <div className="searchbar loc-search">
              <Search size={18} aria-hidden="true" />
              <input
                aria-label="Search locations"
                placeholder="Search locations or types…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <span className="bd">{plural(locations.length, "location")}</span>
          </div>

          <div className="loc-tree">
            {rootLocations.map((location) => (
              <LocationNode
                key={location.id}
                location={location}
                depth={0}
                query={trimmedQuery}
                onEdit={startEdit}
                onToggle={toggleStatus}
                onDelete={requestDelete}
              />
            ))}
          </div>

          {!hasMatches && (
            <p className="empty-state setup-empty-inline">
              No locations match “{trimmedQuery}”.
            </p>
          )}
        </>
      )}

      {confirmDialog}
    </div>
  );
}

/* =========================================================
   Positions
   ========================================================= */

function PositionsManager({
  positionTypes,
  positions,
  assignments,
  locationTypes,
  addPosition,
  updatePosition,
  deletePosition,
  notify,
}) {
  // Edit form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [positionTypeId, setPositionTypeId] = useState("");
  const [parentPositionId, setParentPositionId] = useState("");
  const [allowedLocationTypeIds, setAllowedLocationTypeIds] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Multi-row add
  const [isAddOpen, setIsAddOpen] = useState(false);
  const bulk = useBulkRows(newPositionRow);

  const [error, setError] = useState("");
  const [setConfirm, confirmDialog] = useConfirm();

  /* A position cannot be its own parent or sit under its own descendants. */
  const editParentOptions = useMemo(() => {
    if (!editingId) return positions;
    const blocked = getPositionDescendantIds(editingId, positions);
    return positions.filter(
      (position) => position.id !== editingId && !blocked.has(position.id),
    );
  }, [positions, editingId]);

  const closeEdit = () => {
    setName("");
    setDescription("");
    setPositionTypeId("");
    setParentPositionId("");
    setAllowedLocationTypeIds([]);
    setIsActive(true);
    setEditingId(null);
    setError("");
    setIsEditOpen(false);
  };

  const openAdd = () => {
    closeEdit();
    bulk.reset();
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setError("");
    bulk.reset();
  };

  const toggleEditLocationType = (typeId) => {
    setAllowedLocationTypeIds((current) =>
      current.includes(typeId)
        ? current.filter((id) => id !== typeId)
        : [...current, typeId],
    );
  };

  const toggleRowLocationType = (rowId, typeId) => {
    const row = bulk.rows.find((item) => item.id === rowId);
    if (!row) return;

    const selected = row.allowedLocationTypeIds.includes(typeId);

    bulk.update(rowId, {
      allowedLocationTypeIds: selected
        ? row.allowedLocationTypeIds.filter((id) => id !== typeId)
        : [...row.allowedLocationTypeIds, typeId],
    });
  };

  const getRowError = (row) => {
    if (!row.name.trim()) return "enter a position name.";
    if (!row.positionTypeId) return "select a position type.";
    if (!row.allowedLocationTypeIds.length) {
      return "select at least one allowed location type.";
    }
    return "";
  };

  const readyCount = bulk.rows.filter((row) => !getRowError(row)).length;

  const saveRows = () => {
    setError("");

    const outcome = runBulkSave({
      rows: bulk.rows,
      getRowError,
      toPayload: (row) => ({
        name: row.name.trim(),
        description: "",
        isActive: row.isActive,
        positionTypeId: row.positionTypeId,
        parentPositionId: row.parentPositionId || null,
        allowedLocationTypeIds: row.allowedLocationTypeIds,
      }),
      addItem: addPosition,
    });

    if (outcome.savedCount) {
      notify(`${plural(outcome.savedCount, "position")} added`);
    }

    if (outcome.error) {
      bulk.setRows(outcome.remaining);
      setError(outcome.error);
      return;
    }

    closeAdd();
  };

  const startEdit = (position) => {
    setIsAddOpen(false);
    setEditingId(position.id);
    setName(position.name);
    setDescription(position.description || "");
    setPositionTypeId(position.positionTypeId || "");
    setParentPositionId(position.parentPositionId || "");
    setAllowedLocationTypeIds(
      Array.isArray(position.allowedLocationTypeIds)
        ? position.allowedLocationTypeIds
        : [],
    );
    setIsActive(position.isActive !== false);
    setError("");
    setIsEditOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!positionTypeId) {
      setError("Select a position type.");
      return;
    }

    if (!allowedLocationTypeIds.length) {
      setError("Select at least one allowed location type.");
      return;
    }

    const result = updatePosition(editingId, {
      name,
      description,
      isActive,
      positionTypeId,
      parentPositionId: parentPositionId || null,
      allowedLocationTypeIds,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notify("Position updated");
    closeEdit();
  };

  const toggleStatus = (position) => {
    const result = updatePosition(position.id, {
      name: position.name,
      description: position.description || "",
      isActive: position.isActive === false,
      positionTypeId: position.positionTypeId || null,
      parentPositionId: position.parentPositionId || null,
      allowedLocationTypeIds: Array.isArray(position.allowedLocationTypeIds)
        ? position.allowedLocationTypeIds
        : [],
    });

    notify(
      result.ok
        ? position.isActive === false
          ? "Position activated"
          : "Position deactivated"
        : result.error,
    );
  };

  const requestDelete = (position) => {
    const usage = assignments.filter(
      (assignment) => assignment.positionId === position.id,
    ).length;
    const childCount = positions.filter(
      (item) => item.parentPositionId === position.id,
    ).length;

    if (usage || childCount) {
      setError(
        `Cannot delete “${position.name}”: ${plural(
          usage,
          "assignment",
        )} and ${plural(childCount, "child position")} still depend on it.`,
      );
      return;
    }

    setError("");
    setConfirm({
      title: "Delete position?",
      message: `“${position.name}” will be removed permanently.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        const result = deletePosition(position.id);

        notify(result.ok ? "Position deleted" : result.error);
        setConfirm(null);
        if (editingId === position.id) closeEdit();
      },
    });
  };

  return (
    <div className="card setup-panel">
      <SectionHeader
        title="Positions"
        hint="Create positions and define where each position is allowed to exist."
        actionLabel="Add Position"
        onAction={openAdd}
      />

      {!isAddOpen && !isEditOpen && <ErrorLine message={error} />}

      <BulkAddModal
        open={isAddOpen}
        title="Add Position"
        descriptions={[
          "Create positions and define where each position is allowed to exist.",
          "After saving, positions can be connected with people through Assignments.",
        ]}
        listTitle="Positions to add"
        readyCount={readyCount}
        addRowLabel="Add another position"
        saveLabel="Save Positions"
        maxWidth={1200}
        minWidth={950}
        error={error}
        onAddRow={bulk.add}
        onClose={closeAdd}
        onSave={saveRows}
      >
        <thead>
          <tr>
            <th>Position Name</th>
            <th>Position Type</th>
            <th>Parent Position</th>
            <th>Allowed Location Types</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {bulk.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="text"
                  aria-label="Position name"
                  value={row.name}
                  placeholder="Provincial Organizer"
                  onChange={(event) =>
                    bulk.update(row.id, { name: event.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <select
                  aria-label="Position type"
                  value={row.positionTypeId}
                  onChange={(event) =>
                    bulk.update(row.id, { positionTypeId: event.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">Select type</option>
                  {positionTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </td>

              <td>
                <select
                  aria-label="Parent position"
                  value={row.parentPositionId}
                  onChange={(event) =>
                    bulk.update(row.id, { parentPositionId: event.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">No parent position</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </td>

              <td>
                <LocationTypePicker
                  locationTypes={locationTypes}
                  selectedIds={row.allowedLocationTypeIds}
                  onToggle={(typeId) => toggleRowLocationType(row.id, typeId)}
                  gap={6}
                />
              </td>

              <td>
                <StatusSelect
                  value={row.isActive}
                  onChange={(value) => bulk.update(row.id, { isActive: value })}
                />
              </td>

              <td>
                <RemoveRowButton
                  label="Remove position row"
                  disabled={bulk.rows.length === 1}
                  onClick={() => bulk.remove(row.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </BulkAddModal>

      <SetupModal
        open={isEditOpen}
        title="Edit Position"
        description="Update the position details."
        onClose={closeEdit}
      >
        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-field">
            <label htmlFor="position-name">Position Name</label>
            <input
              id="position-name"
              type="text"
              value={name}
              placeholder="Example: District Organizer"
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="setup-field">
            <label htmlFor="position-type">Position Type</label>
            <select
              id="position-type"
              value={positionTypeId}
              onChange={(event) => setPositionTypeId(event.target.value)}
            >
              <option value="">Select position type</option>
              {positionTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setup-field">
            <label htmlFor="parent-position">Parent Position</label>
            <select
              id="parent-position"
              value={parentPositionId}
              onChange={(event) => setParentPositionId(event.target.value)}
            >
              <option value="">No parent position</option>
              {editParentOptions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setup-field">
            <label>Allowed Location Types</label>
            <div style={{ marginTop: 8 }}>
              <LocationTypePicker
                locationTypes={locationTypes}
                selectedIds={allowedLocationTypeIds}
                onToggle={toggleEditLocationType}
              />
            </div>
          </div>

          <div className="setup-field">
            <label htmlFor="position-description">Description</label>
            <input
              id="position-description"
              type="text"
              value={description}
              placeholder="Enter a short description"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="position-status">Status</label>
            <StatusSelect
              id="position-status"
              value={isActive}
              onChange={setIsActive}
            />
          </div>

          <ErrorLine message={error} />
          <FormActions onCancel={closeEdit} submitLabel="Save Changes" />
        </form>
      </SetupModal>

      {positions.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No positions have been created yet."
          hint="Add your first position and choose where it can exist."
          actionLabel="Add Position"
          onAction={openAdd}
        />
      ) : (
        <div className="card tw setup-table-card">
          <table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Type</th>
                <th>Parent</th>
                <th>Allowed Locations</th>
                <th>Status</th>
                <th>Assignments</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {positions.map((position) => {
                const positionType = positionTypes.find(
                  (type) => type.id === position.positionTypeId,
                );
                const parent = positions.find(
                  (item) => item.id === position.parentPositionId,
                );
                const allowedTypes = locationTypes.filter(
                  (type) =>
                    Array.isArray(position.allowedLocationTypeIds) &&
                    position.allowedLocationTypeIds.includes(type.id),
                );
                const assignmentCount = assignments.filter(
                  (assignment) => assignment.positionId === position.id,
                ).length;

                return (
                  <tr key={position.id}>
                    <td>
                      <b>{position.name}</b>
                    </td>
                    <td className="mu">{positionType?.name || "—"}</td>
                    <td className="mu">{parent?.name || "—"}</td>
                    <td>
                      {allowedTypes.length
                        ? allowedTypes.map((type) => type.name).join(", ")
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge isActive={position.isActive !== false} />
                    </td>
                    <td>{assignmentCount}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn sm o"
                        onClick={() => startEdit(position)}
                      >
                        <Pencil size={13} aria-hidden="true" /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn sm o"
                        onClick={() => toggleStatus(position)}
                      >
                        <Power size={13} aria-hidden="true" />
                        {position.isActive === false ? "Activate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        className="btn sm o icon-action"
                        aria-label={`Delete ${position.name}`}
                        onClick={() => requestDelete(position)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

function PositionTypesManager({
  positionTypes,
  positions,
  addPositionType,
  updatePositionType,
  deletePositionType,
  notify,
}) {
  // Edit form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Multi-row add
  const [isAddOpen, setIsAddOpen] = useState(false);
  const bulk = useBulkRows(newPositionTypeRow);

  const [error, setError] = useState("");
  const [setConfirm, confirmDialog] = useConfirm();

  const closeEdit = () => {
    setName("");
    setDescription("");
    setIsActive(true);
    setEditingId(null);
    setError("");
    setIsEditOpen(false);
  };

  const openAdd = () => {
    closeEdit();
    bulk.reset();
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setError("");
    bulk.reset();
  };

  const readyCount = bulk.rows.filter((row) => row.name.trim()).length;

  const saveRows = () => {
    setError("");

    const outcome = runBulkSave({
      rows: bulk.rows,
      getRowError: (row) => (row.name.trim() ? "" : "enter a name."),
      toPayload: (row) => ({
        name: row.name.trim(),
        description: row.description.trim(),
        isActive: row.isActive,
      }),
      addItem: addPositionType,
    });

    if (outcome.savedCount) {
      notify(`${plural(outcome.savedCount, "position type")} added`);
    }

    if (outcome.error) {
      bulk.setRows(outcome.remaining);
      setError(outcome.error);
      return;
    }

    closeAdd();
  };

  const startEdit = (type) => {
    setIsAddOpen(false);
    setEditingId(type.id);
    setName(type.name);
    setDescription(type.description || "");
    setIsActive(type.isActive !== false);
    setError("");
    setIsEditOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = updatePositionType(editingId, {
      name,
      description,
      isActive,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notify("Position type updated");
    closeEdit();
  };

  const requestDelete = (type) => {
    const usage = positions.filter(
      (position) => position.positionTypeId === type.id,
    ).length;

    if (usage) {
      setError(
        `Cannot delete “${type.name}”: ${plural(usage, "position")} still use this type.`,
      );
      return;
    }

    setError("");
    setConfirm({
      title: "Delete position type?",
      message: `“${type.name}” will no longer be available when creating positions.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        const result = deletePositionType(type.id);

        notify(result.ok ? "Position type deleted" : result.error);
        setConfirm(null);
        if (editingId === type.id) closeEdit();
      },
    });
  };

  return (
    <div className="card setup-panel">
      <SectionHeader
        title="Position Types"
        hint="Create reusable categories for positions, such as Organizer, Officer, Coordinator or Representative."
        actionLabel="Add Position Type"
        onAction={openAdd}
      />

      {!isAddOpen && !isEditOpen && <ErrorLine message={error} />}

      <BulkAddModal
        open={isAddOpen}
        title="Add Position Type"
        descriptions={[
          "Create reusable categories for positions.",
          "Add one or more position types at once.",
        ]}
        listTitle="Position Types to add"
        readyCount={readyCount}
        addRowLabel="Add another position type"
        saveLabel="Save Position Types"
        maxWidth={860}
        minWidth={640}
        error={error}
        onAddRow={bulk.add}
        onClose={closeAdd}
        onSave={saveRows}
      >
        <thead>
          <tr>
            <th>Position Type Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {bulk.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="text"
                  aria-label="Position type name"
                  value={row.name}
                  placeholder="Example: Organizer"
                  onChange={(event) =>
                    bulk.update(row.id, { name: event.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <input
                  type="text"
                  aria-label="Position type description"
                  value={row.description}
                  placeholder="Enter a short description"
                  onChange={(event) =>
                    bulk.update(row.id, { description: event.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <StatusSelect
                  value={row.isActive}
                  onChange={(value) => bulk.update(row.id, { isActive: value })}
                />
              </td>

              <td>
                <RemoveRowButton
                  label="Remove position type row"
                  disabled={bulk.rows.length === 1}
                  onClick={() => bulk.remove(row.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </BulkAddModal>

      <SetupModal
        open={isEditOpen}
        title="Edit Position Type"
        description="Update the position type details."
        onClose={closeEdit}
      >
        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-field">
            <label htmlFor="position-type-name">Position Type Name</label>
            <input
              id="position-type-name"
              type="text"
              value={name}
              placeholder="Example: Organizer"
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="setup-field">
            <label htmlFor="position-type-description">Description</label>
            <input
              id="position-type-description"
              type="text"
              value={description}
              placeholder="Enter a short description"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="position-type-status">Status</label>
            <StatusSelect
              id="position-type-status"
              value={isActive}
              onChange={setIsActive}
            />
          </div>

          <ErrorLine message={error} />
          <FormActions onCancel={closeEdit} submitLabel="Save Changes" />
        </form>
      </SetupModal>

      {positionTypes.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No position types have been created yet."
          hint="Create a position type first, then use it when adding positions."
          actionLabel="Add Position Type"
          onAction={openAdd}
        />
      ) : (
        <div className="card tw setup-table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Positions</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {positionTypes.map((type) => (
                <tr key={type.id}>
                  <td>
                    <b>{type.name}</b>
                  </td>
                  <td className="mu">{type.description || "—"}</td>
                  <td>
                    <StatusBadge isActive={type.isActive !== false} />
                  </td>
                  <td>
                    {
                      positions.filter(
                        (position) => position.positionTypeId === type.id,
                      ).length
                    }
                  </td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="btn sm o"
                      onClick={() => startEdit(type)}
                    >
                      <Pencil size={13} aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn sm o icon-action"
                      aria-label={`Delete ${type.name}`}
                      onClick={() => requestDelete(type)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

function PositionsSection({ notify }) {
  const {
    positionTypes,
    positions,
    assignments,
    locationTypes,
    addPositionType,
    updatePositionType,
    deletePositionType,
    addPosition,
    updatePosition,
    deletePosition,
  } = useOrganization();

  const [activeSubTab, setActiveSubTab] = useState("positions");

  return (
    <div>
      <div className="setup-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`btn sm ${activeSubTab === "positions" ? "" : "o"}`}
          onClick={() => setActiveSubTab("positions")}
        >
          Positions
        </button>

        <button
          type="button"
          className={`btn sm ${activeSubTab === "types" ? "" : "o"}`}
          onClick={() => setActiveSubTab("types")}
        >
          Position Types
        </button>
      </div>

      {activeSubTab === "types" ? (
        <PositionTypesManager
          positionTypes={positionTypes}
          positions={positions}
          addPositionType={addPositionType}
          updatePositionType={updatePositionType}
          deletePositionType={deletePositionType}
          notify={notify}
        />
      ) : (
        <PositionsManager
          positionTypes={positionTypes}
          positions={positions}
          assignments={assignments}
          locationTypes={locationTypes}
          addPosition={addPosition}
          updatePosition={updatePosition}
          deletePosition={deletePosition}
          notify={notify}
        />
      )}
    </div>
  );
}

/* =========================================================
   Organization Setup Page
   ========================================================= */

const TABS = [
  { key: "locationTypes", label: "Location Types", icon: Layers },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "positions", label: "Positions", icon: Award },
];

export default function OrganizationSetup({ notify = () => {} }) {
  const [tab, setTab] = useState("locationTypes");

  return (
    <>
      <div className="tag">Administration</div>

      <div
        className="setup-header"
        style={{ justifyContent: "center", textAlign: "center" }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1>Set Up Organization</h1>

          <p className="mu lead">
            Define the structure of your organization by creating location
            types, locations and positions.
          </p>
        </div>
      </div>

      <div
        className="setup-tabs"
        role="tablist"
        aria-label="Organization setup sections"
        style={{ justifyContent: "center", gap: 10, marginBottom: 24 }}
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = tab === key;

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`setup-tab ${isActive ? "on" : ""}`}
              onClick={() => setTab(key)}
              style={{
                background: isActive ? "#16a34a" : "transparent",
                color: isActive ? "#ffffff" : "var(--text)",
                border: isActive
                  ? "1px solid #16a34a"
                  : "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 18px",
                fontWeight: isActive ? 700 : 500,
                boxShadow: isActive
                  ? "0 4px 12px rgba(22, 163, 74, 0.20)"
                  : "none",
                transition: "all 0.2s ease",
              }}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "locationTypes" && <LocationTypesSection notify={notify} />}
      {tab === "locations" && <LocationsSection notify={notify} />}
      {tab === "positions" && <PositionsSection notify={notify} />}
    </>
  );
}