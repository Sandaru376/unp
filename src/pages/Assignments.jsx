import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ClipboardList,
  Settings2,
  X,
  Check,
  Copy,
  ChevronDown,
} from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import ConfirmDialog from "../components/ConfirmDialog";

/* =========================================================
   Helpers
   ========================================================= */

const today = () => new Date().toISOString().slice(0, 10);

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const newAssignmentRow = () => ({
  id: crypto.randomUUID(),
  personId: "",
  positionId: "",
  locationId: "",
  startDate: today(),
  endDate: "",
  isActive: true,
});

const emptyForm = () => ({
  personId: "",
  positionId: "",
  locationId: "",
  startDate: today(),
  endDate: "",
  isActive: true,
});

/** Returns what is still missing, e.g. "select a person." — or "" when valid. */
function getAssignmentProblem(item) {
  if (!item.personId) return "select a person.";
  if (!item.positionId) return "select a position.";
  if (!item.locationId) return "select a location.";
  if (item.startDate && item.endDate && item.endDate < item.startDate) {
    return "the end date can't be before the start date.";
  }
  return "";
}

/**
 * Saves rows one by one. Rows that were saved are removed from the list,
 * so if one row fails the user keeps only the rows that still need work.
 */
function runBulkSave({ rows, getRowError, getLabel, toPayload, addItem }) {
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
        error: `Could not add “${getLabel(row)}”: ${result.error}`,
      };
    }

    savedIds.push(row.id);
  }

  return { savedCount: savedIds.length, remaining: [], error: "" };
}

/** Rows state for multi-row tables. add / reset / duplicate return the new row. */
function useBulkRows(createRow) {
  const [rows, setRows] = useState(() => [createRow()]);

  return {
    rows,
    setRows,
    reset: () => {
      const row = createRow();
      setRows([row]);
      return row;
    },
    add: () => {
      const row = createRow();
      setRows((current) => [...current, row]);
      return row;
    },
    duplicate: (rowId) => {
      const copy = { id: crypto.randomUUID() };
      setRows((current) => {
        const index = current.findIndex((row) => row.id === rowId);
        if (index === -1) return current;
        const next = [...current];
        next.splice(index + 1, 0, { ...current[index], ...copy });
        return next;
      });
      return copy;
    },
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

function ErrorLine({ message }) {
  if (!message) return null;

  return (
    <p className="setup-error" role="alert">
      {message}
    </p>
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

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      className="btn sm o icon-action"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/**
 * Popup used for every add / edit dialog.
 * `description` can be a string or an array of lines.
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

/** Popup with a table where several items can be entered at once. */
function BulkAddModal({
  open,
  title,
  descriptions,
  listTitle,
  readyCount,
  totalCount,
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
        <span className="bd">
          {readyCount} of {totalCount} ready to save
        </span>
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

/* =========================================================
   SearchSelect — searchable dropdown that floats above
   scrolling tables and popups (rendered in a portal)
   ========================================================= */

function Highlight({ text, query }) {
  const needle = query.trim().toLowerCase();
  if (!needle) return text;

  const index = text.toLowerCase().indexOf(needle);
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark
        style={{
          background: "rgba(22, 163, 74, 0.22)",
          color: "inherit",
          borderRadius: 3,
          padding: "0 1px",
        }}
      >
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

/**
 * options: [{ value, label, hint?, badge?, display? }]
 *  - label   main text
 *  - hint    small grey line under the label (e.g. parent path)
 *  - badge   small chip on the right (e.g. location type)
 *  - display text shown in the closed input (defaults to label)
 */
function SearchSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyPlaceholder = "Nothing created yet",
  ariaLabel,
  autoFocus = false,
  minListWidth = 260,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);

  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return options;

    return options.filter((option) => {
      const haystack =
        `${option.label} ${option.hint || ""} ${option.badge || ""}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 200 && rect.top > spaceBelow;
    const width = Math.max(rect.width, minListWidth);

    setPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      maxHeight: Math.max(120, Math.min(300, (openUp ? rect.top : spaceBelow) - 16)),
    });
  }, [minListWidth]);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Keep the highlighted option visible while using the arrow keys.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen, filtered]);

  const open = () => {
    if (isOpen || !options.length) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setQuery("");
    setActiveIndex(Math.max(selectedIndex, 0));
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  const choose = (option) => {
    onChange(option.value);
    close();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      // Close only the dropdown, not the popup behind it.
      if (isOpen) {
        event.stopPropagation();
        close();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) return open();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) return open();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      if (filtered[activeIndex]) choose(filtered[activeIndex]);
    } else if (event.key === "Tab") {
      close();
    }
  };

  const listId = `${id}-options`;
  const inputText = isOpen ? query : selected?.display || selected?.label || "";

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <Search
        size={14}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={
          isOpen && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={!options.length}
        title={selected?.display || selected?.label || undefined}
        placeholder={options.length ? placeholder : emptyPlaceholder}
        value={inputText}
        onFocus={open}
        onClick={open}
        onBlur={close}
        onChange={(event) => {
          if (!isOpen) setIsOpen(true);
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          paddingLeft: 30,
          paddingRight: selected ? 56 : 30,
          textOverflow: "ellipsis",
        }}
      />

      <span
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {selected && (
          <button
            type="button"
            aria-label="Clear selection"
            title="Clear"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange("")}
            style={{
              display: "flex",
              border: 0,
              padding: 2,
              borderRadius: 6,
              background: "transparent",
              color: "inherit",
              opacity: 0.6,
              cursor: "pointer",
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{ opacity: 0.5, pointerEvents: "none" }}
        />
      </span>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            onMouseDown={(event) => event.preventDefault()}
            style={{
              position: "fixed",
              zIndex: 1100,
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
              overflowY: "auto",
              padding: 6,
              background: "var(--card, #fff)",
              color: "var(--text, inherit)",
              border: "1px solid var(--line, #e5e7eb)",
              borderRadius: 12,
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.22)",
            }}
          >
            {filtered.length ? (
              filtered.map((option, index) => {
                const isActive = index === activeIndex;
                const isSelected = option.value === value;

                return (
                  <div
                    key={option.value}
                    id={`${id}-option-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(22, 163, 74, 0.12)"
                        : "transparent",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontWeight: isSelected ? 700 : 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Highlight text={option.label} query={query} />
                      </span>

                      {option.hint && (
                        <span
                          className="mu"
                          style={{
                            display: "block",
                            fontSize: 12,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Highlight text={option.hint} query={query} />
                        </span>
                      )}
                    </span>

                    {option.badge && (
                      <span className="bd bd-muted" style={{ flexShrink: 0 }}>
                        {option.badge}
                      </span>
                    )}

                    {isSelected && (
                      <Check
                        size={15}
                        aria-hidden="true"
                        style={{ color: "var(--primary)", flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="mu" role="status" style={{ padding: "12px 10px" }}>
                No results for “{query.trim()}”.
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* =========================================================
   Assignments page
   ========================================================= */

export default function Assignments({ notify = () => {}, goSetup }) {
  const {
    people,
    positions,
    positionTypes = [],
    locations,
    assignments,
    selectors,
    addAssignment,
    updateAssignment,
    deleteAssignment,
  } = useOrganization();

  // Edit popup
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Multi-row add popup
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [focusRowId, setFocusRowId] = useState(null);
  const bulk = useBulkRows(newAssignmentRow);

  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(null);

  /* ---------- options for the searchable dropdowns ---------- */

  const personOptions = useMemo(
    () =>
      people
        .map((person) => ({ value: person.id, label: person.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [people],
  );

  const positionOptions = useMemo(
    () =>
      positions
        .map((position) => ({
          value: position.id,
          label: position.name,
          badge:
            positionTypes.find((type) => type.id === position.positionTypeId)
              ?.name || undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [positions, positionTypes],
  );

  /* Location options show the full path so the hierarchy is obvious. */
  const locationOptions = useMemo(
    () =>
      locations
        .map((location) => {
          const path = selectors.getLocationPathString(location.id);
          const parentPath = path.split(" / ").slice(0, -1).join(" / ");
          const typeName = selectors.getLocationTypeById(
            location.locationTypeId,
          )?.name;

          return {
            value: location.id,
            label: location.name,
            hint: parentPath || undefined,
            display: path,
            badge:
              location.isActive === false
                ? `${typeName ? `${typeName} · ` : ""}Inactive`
                : typeName,
            sortKey: path,
          };
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
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

  const missing = {
    people: people.length === 0,
    positions: positions.length === 0,
    locations: locations.length === 0,
  };

  /* ---------- edit popup ---------- */

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const openEdit = (assignment) => {
    setIsAddOpen(false);
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
    setIsEditOpen(true);
  };

  const setField = (key, value) => {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    const problem = getAssignmentProblem(form);

    if (problem) {
      setError(`Please ${problem}`);
      return;
    }

    const result = updateAssignment(editingId, form);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notify("Assignment updated");
    closeEdit();
  };

  /* ---------- multi-row add popup ---------- */

  const openAdd = () => {
    closeEdit();
    bulk.reset();
    setFocusRowId(null);
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setError("");
    setFocusRowId(null);
    bulk.reset();
  };

  const addRow = () => setFocusRowId(bulk.add().id);
  const duplicateRow = (rowId) => setFocusRowId(bulk.duplicate(rowId).id);

  const readyCount = bulk.rows.filter(
    (row) => !getAssignmentProblem(row),
  ).length;

  const getRowLabel = (row) => {
    const person = people.find((item) => item.id === row.personId)?.name;
    const position = positions.find((item) => item.id === row.positionId)?.name;
    return [person, position].filter(Boolean).join(" → ") || "assignment";
  };

  const saveRows = () => {
    setError("");

    const outcome = runBulkSave({
      rows: bulk.rows,
      getRowError: getAssignmentProblem,
      getLabel: getRowLabel,
      toPayload: (row) => ({
        personId: row.personId,
        positionId: row.positionId,
        locationId: row.locationId,
        startDate: row.startDate,
        endDate: row.endDate,
        isActive: row.isActive,
      }),
      addItem: addAssignment,
    });

    if (outcome.savedCount) {
      notify(`${plural(outcome.savedCount, "assignment")} created`);
    }

    if (outcome.error) {
      bulk.setRows(outcome.remaining);
      setError(outcome.error);
      return;
    }

    closeAdd();
  };

  /* ---------- delete ---------- */

  const requestDelete = (view) => {
    setConfirm({
      title: "Delete assignment?",
      message: `${view.personName} will no longer be ${view.positionName} at ${view.pathString || view.locationName}.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        deleteAssignment(view.assignment.id);
        setConfirm(null);
        notify("Assignment deleted");
        if (editingId === view.assignment.id) closeEdit();
      },
    });
  };

  return (
    <>
     

      <div className="setup-header">
        <div>
          <h1>Assignments</h1>
          
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

     

      {/* ---------- Create assignments (multi-row popup) ---------- */}
      <BulkAddModal
        open={isAddOpen}
        title="Create Assignment"
        descriptions={[
          "Connect people to positions and locations.",
          "Add one or more assignments at once.",
        ]}
        listTitle="Assignments to add"
        readyCount={readyCount}
        totalCount={bulk.rows.length}
        addRowLabel="Add another assignment"
        saveLabel="Save Assignments"
        maxWidth={1320}
        minWidth={1180}
        error={error}
        onAddRow={addRow}
        onClose={closeAdd}
        onSave={saveRows}
      >
        <colgroup>
          <col style={{ width: 52 }} />
          <col style={{ width: 200 }} />
          <col style={{ width: 220 }} />
          <col style={{ width: 300 }} />
          <col style={{ width: 150 }} />
          <col style={{ width: 150 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 96 }} />
        </colgroup>

        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>#</th>
            <th>Person</th>
            <th>Position</th>
            <th>Location</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {bulk.rows.map((row, index) => {
            const isReady = !getAssignmentProblem(row);

            return (
              <tr key={row.id}>
                <td style={{ textAlign: "center" }}>
                  {isReady ? (
                    <span
                      title="Ready to save"
                      aria-label="Ready to save"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "var(--primary)",
                        color: "#fff",
                      }}
                    >
                      <Check size={13} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="mu">{index + 1}</span>
                  )}
                </td>

                <td>
                  <SearchSelect
                    id={`bulk-person-${row.id}`}
                    ariaLabel={`Person for row ${index + 1}`}
                    options={personOptions}
                    value={row.personId}
                    autoFocus={row.id === focusRowId}
                    placeholder="Search person…"
                    emptyPlaceholder="No people created yet"
                    onChange={(value) => bulk.update(row.id, { personId: value })}
                  />
                </td>

                <td>
                  <SearchSelect
                    id={`bulk-position-${row.id}`}
                    ariaLabel={`Position for row ${index + 1}`}
                    options={positionOptions}
                    value={row.positionId}
                    placeholder="Search position…"
                    emptyPlaceholder="No positions created yet"
                    onChange={(value) =>
                      bulk.update(row.id, { positionId: value })
                    }
                  />
                </td>

                <td>
                  <SearchSelect
                    id={`bulk-location-${row.id}`}
                    ariaLabel={`Location for row ${index + 1}`}
                    options={locationOptions}
                    value={row.locationId}
                    placeholder="Search location…"
                    emptyPlaceholder="No locations created yet"
                    minListWidth={340}
                    onChange={(value) =>
                      bulk.update(row.id, { locationId: value })
                    }
                  />
                </td>

                <td>
                  <input
                    type="date"
                    aria-label={`Start date for row ${index + 1}`}
                    value={row.startDate}
                    onChange={(event) =>
                      bulk.update(row.id, { startDate: event.target.value })
                    }
                  />
                </td>

                <td>
                  <input
                    type="date"
                    aria-label={`End date for row ${index + 1}`}
                    value={row.endDate}
                    min={row.startDate || undefined}
                    onChange={(event) =>
                      bulk.update(row.id, { endDate: event.target.value })
                    }
                  />
                </td>

                <td>
                  <StatusSelect
                    value={row.isActive}
                    onChange={(value) =>
                      bulk.update(row.id, { isActive: value })
                    }
                  />
                </td>

                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <IconButton
                      label="Duplicate row"
                      onClick={() => duplicateRow(row.id)}
                    >
                      <Copy size={14} aria-hidden="true" />
                    </IconButton>

                    <IconButton
                      label="Remove row"
                      disabled={bulk.rows.length === 1}
                      onClick={() => bulk.remove(row.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </BulkAddModal>

      {/* ---------- Edit assignment (single popup) ---------- */}
      <SetupModal
        open={isEditOpen}
        title="Edit Assignment"
        description="Only the location id is stored — the path you see is calculated from the hierarchy."
        onClose={closeEdit}
      >
        <form className="setup-form" onSubmit={handleEditSubmit}>
          <div className="setup-field">
            <label htmlFor="assignment-person">Person</label>
            <SearchSelect
              id="assignment-person"
              options={personOptions}
              value={form.personId}
              placeholder="Search people…"
              emptyPlaceholder="No people created yet"
              onChange={(value) => setField("personId", value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="assignment-position">Position</label>
            <SearchSelect
              id="assignment-position"
              options={positionOptions}
              value={form.positionId}
              placeholder="Search positions…"
              emptyPlaceholder="No positions created yet"
              onChange={(value) => setField("positionId", value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="assignment-location">Location</label>
            <SearchSelect
              id="assignment-location"
              options={locationOptions}
              value={form.locationId}
              placeholder="Search locations…"
              emptyPlaceholder="No locations created yet"
              minListWidth={340}
              onChange={(value) => setField("locationId", value)}
            />
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
              min={form.startDate || undefined}
              onChange={(event) => setField("endDate", event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="assignment-status">Status</label>
            <StatusSelect
              id="assignment-status"
              value={form.isActive}
              onChange={(value) => setField("isActive", value)}
            />
          </div>

          <ErrorLine message={error} />

          <div
            className="setup-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button className="btn o" type="button" onClick={closeEdit}>
              Cancel
            </button>

            <button className="btn" type="submit">
              Save Changes
            </button>
          </div>
        </form>
      </SetupModal>

      <div className="assignments-toolbar">
  <div className="assignments-search">
    <Search size={17} aria-hidden="true" />

    <input
      aria-label="Search assignments"
      placeholder="Search person, position or location…"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
    />
  </div>

  <button type="button" className="btn" onClick={openAdd}>
    <Plus size={15} aria-hidden="true" />
    Create Assignment
  </button>
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
                  <span
                    className={`bd ${
                      view.assignment.isActive === false ? "bd-muted" : ""
                    }`}
                  >
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
                    {!assignments.length && (
                      <button type="button" className="btn sm" onClick={openAdd}>
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