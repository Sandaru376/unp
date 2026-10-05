import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ClipboardList,
  ClipboardPaste,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { readPersonPhoto } from "../utils/personPhoto";

/* =========================================================
   Helpers
   ========================================================= */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DANGER = "var(--danger, #d93025)";
const GREEN = "var(--primary)";

const emptyPersonRow = (id, seed = {}) => ({
  id,
  name: "",
  phone: "",
  email: "",
  status: "Active",
  photo: "",
  ...seed,
});

const rowHasData = (row) =>
  Boolean(row.name.trim() || row.phone.trim() || row.email.trim() || row.photo);

const plural = (count, singular, pluralForm) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const peopleLabel = (count) => plural(count, "person", "people");

/** Field-level problems for one row. An empty object means the row is valid. */
function validateRow(row) {
  const problems = {};

  if (!row.name.trim()) {
    problems.name = "Enter a name.";
  }

  if (row.email.trim() && !EMAIL_PATTERN.test(row.email.trim())) {
    problems.email = "Enter a valid email address.";
  }

  if (row.phone.trim()) {
    const digits = row.phone.replace(/\D/g, "");
    const hasBadCharacters = /[^\d\s+().-]/.test(row.phone);

    if (hasBadCharacters || digits.length < 7 || digits.length > 15) {
      problems.phone = "Enter a valid phone number.";
    }
  }

  return problems;
}

const getInitials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

/** Turns text copied from a spreadsheet (or typed) into person rows. */
function parsePastedPeople(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .filter((cells, index) => !(index === 0 && cells[0].toLowerCase() === "name"))
    .map(([name = "", second = "", third = ""]) => {
      // "Name, email" without a phone column.
      if (second.includes("@") && !third) {
        return { name, phone: "", email: second };
      }
      return { name, phone: second, email: third };
    })
    .filter((person) => person.name || person.phone || person.email);
}

/* =========================================================
   Page
   ========================================================= */

export default function AddPerson({ notify = () => {}, onDone }) {
  const { addPerson } = useOrganization();

  const [rows, setRows] = useState(() => [emptyPersonRow(1)]);
  const [error, setError] = useState("");
  const [serverErrors, setServerErrors] = useState({});
  const [photoErrors, setPhotoErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  const nextRowId = useRef(2);
  const formRef = useRef(null);
  const pendingFocus = useRef(null);
  const photoInputRefs = useRef(new Map());

  /* ---------- derived ---------- */

  const rowProblems = useMemo(
    () => Object.fromEntries(rows.map((row) => [row.id, validateRow(row)])),
    [rows],
  );

  const populatedRows = rows.filter(rowHasData);
  const populatedCount = populatedRows.length;
  const readyCount = populatedRows.filter(
    (row) => !Object.keys(rowProblems[row.id]).length,
  ).length;

  const pastedPeople = useMemo(() => parsePastedPeople(pasteText), [pasteText]);

  /** A field error is shown after the first blur or after a save attempt. */
  const fieldError = (row, field) => {
    if (!rowHasData(row) && !submitted) return "";
    if (!submitted && !touched[`${row.id}:${field}`]) return "";
    return rowProblems[row.id][field] || "";
  };

  /* ---------- focus handling ---------- */

  useEffect(() => {
    if (!pendingFocus.current) return;

    const { rowId, field } = pendingFocus.current;
    pendingFocus.current = null;

    formRef.current
      ?.querySelector(`[data-cell="${rowId}:${field}"]`)
      ?.focus();
  }, [rows]);

  /* ---------- row editing ---------- */

  const clearRowFeedback = (rowId) => {
    setError("");
    setServerErrors((current) => {
      if (!current[rowId]) return current;
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const setRowField = (rowId, key, value) => {
    clearRowFeedback(rowId);
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    );
  };

  const markTouched = (rowId, field) =>
    setTouched((current) => ({ ...current, [`${rowId}:${field}`]: true }));

  const addRow = (focusField = "name") => {
    const id = nextRowId.current;
    nextRowId.current += 1;
    pendingFocus.current = { rowId: id, field: focusField };
    setRows((current) => [...current, emptyPersonRow(id)]);
  };

  const removeRow = (rowId) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
    clearRowFeedback(rowId);
  };

  /** Enter moves down to the same column, creating a row after the last one. */
  const handleCellKeyDown = (event, index, field) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (index === rows.length - 1) {
      addRow(field);
      return;
    }

    formRef.current
      ?.querySelector(`[data-cell="${rows[index + 1].id}:${field}"]`)
      ?.focus();
  };

  /* ---------- photos ---------- */

  const handlePhoto = async (event, rowId) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setPhotoErrors((current) => ({ ...current, [rowId]: "" }));

    try {
      const photo = await readPersonPhoto(file);
      setRowField(rowId, "photo", photo);
    } catch (photoError) {
      setPhotoErrors((current) => ({
        ...current,
        [rowId]: photoError.message,
      }));
    }
  };

  /* ---------- paste from spreadsheet ---------- */

  const closePaste = () => {
    setShowPaste(false);
    setPasteText("");
  };

  const applyPaste = () => {
    if (!pastedPeople.length) return;

    const newRows = pastedPeople.map((person) => {
      const id = nextRowId.current;
      nextRowId.current += 1;
      return emptyPersonRow(id, person);
    });

    // Drop untouched blank rows so pasted people don't land under empty ones.
    setRows((current) => [...current.filter(rowHasData), ...newRows]);
    setError("");
    closePaste();
    notify(`${peopleLabel(newRows.length)} added to the table`);
  };

  /* ---------- save ---------- */

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!populatedRows.length) {
      setError("Enter a name for at least one person.");
      return;
    }

    const firstInvalid = populatedRows.find(
      (row) => Object.keys(rowProblems[row.id]).length,
    );

    if (firstInvalid) {
      const number = rows.findIndex((row) => row.id === firstInvalid.id) + 1;
      const [message] = Object.values(rowProblems[firstInvalid.id]);
      setError(`Row ${number}: ${message}`);

      const [field] = Object.keys(rowProblems[firstInvalid.id]);
      formRef.current
        ?.querySelector(`[data-cell="${firstInvalid.id}:${field}"]`)
        ?.focus();
      return;
    }

    let addedCount = 0;
    const failedRows = [];
    const nextServerErrors = {};

    populatedRows.forEach((row) => {
      const result = addPerson({
        ...row,
        name: row.name.trim(),
        phone: row.phone.trim(),
        email: row.email.trim(),
      });

      if (result.ok) {
        addedCount += 1;
      } else {
        failedRows.push(row);
        nextServerErrors[row.id] = result.error;
      }
    });

    setServerErrors(nextServerErrors);

    if (failedRows.length) {
      setRows(failedRows);
      setError(
        `${peopleLabel(addedCount)} saved. ${plural(
          failedRows.length,
          "row needs",
          "rows need",
        )} attention.`,
      );
      if (addedCount) notify(`${peopleLabel(addedCount)} added`);
      return;
    }

    notify(`✓ ${peopleLabel(addedCount)} added successfully`);
    onDone?.();
  };

  const handleCancel = () => {
    if (populatedCount > 0) {
      setConfirmLeave(true);
      return;
    }

    onDone?.();
  };

  /* ---------- render ---------- */

  const invalidStyle = (hasError) =>
    hasError ? { borderColor: DANGER } : undefined;

  return (
    <>
      <div className="tag">Admin</div>

      <div className="add-members-header">
        <div>
          <h1>Add Person</h1>
          <p className="mu lead">
            A person stores personal information only. Positions and locations
            are connected afterwards on the Assignments page.
          </p>
        </div>
      </div>

      <div className="saved setup-callout">
        <div className="saved-message">
          <ClipboardList size={18} aria-hidden="true" />
          <span>
            After saving, open Assignments to connect each person with a
            position and a location.
          </span>
        </div>
      </div>

      <form
        ref={formRef}
        className="setup-form members-table-card card add-person-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="members-table-toolbar">
          <div>
            <h2>People to add</h2>
            <p className="mu">
              Press Enter to jump to the next row, or paste a list copied from
              a spreadsheet.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="btn sm o"
              onClick={() => setShowPaste((value) => !value)}
              aria-expanded={showPaste}
            >
              <ClipboardPaste size={14} aria-hidden="true" />
              Paste list
            </button>

            <span className="member-count-pill">
              <strong>{readyCount}</strong> of {populatedCount} ready to save
            </span>
          </div>
        </div>

        {showPaste && (
          <div
            style={{
              margin: "0 0 16px",
              padding: 16,
              border: "1px dashed var(--line, #d1d5db)",
              borderRadius: 12,
            }}
          >
            <label htmlFor="person-paste" style={{ fontWeight: 600 }}>
              Paste people
            </label>
            <p className="mu" style={{ margin: "4px 0 10px" }}>
              One person per line. Separate Name, Phone and Email with a tab or
              a comma — copying cells from Excel or Sheets works as is.
            </p>

            <textarea
              id="person-paste"
              rows={5}
              value={pasteText}
              placeholder={"Nimal Perera, 0771234567, nimal@example.com\nSandaru Silva, 0712345678"}
              onChange={(event) => setPasteText(event.target.value)}
              style={{ width: "100%", resize: "vertical" }}
              autoFocus
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 10,
              }}
            >
              <span className="mu">
                {pastedPeople.length
                  ? `${peopleLabel(pastedPeople.length)} found`
                  : "Nothing to add yet"}
              </span>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn sm o" onClick={closePaste}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn sm"
                  disabled={!pastedPeople.length}
                  onClick={applyPaste}
                >
                  <Plus size={14} aria-hidden="true" />
                  Add {pastedPeople.length ? peopleLabel(pastedPeople.length) : "rows"} to table
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="members-table-scroll">
          <table
            className="members-entry-table add-person-entry-table"
            aria-label="People to add"
          >
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: 70 }} />
            </colgroup>

            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Photo</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const inputId = (field) =>
                  row.id === 1
                    ? `person-${field}`
                    : `person-${field}-${row.id}`;

                const nameError =
                  serverErrors[row.id] || fieldError(row, "name");
                const emailError = fieldError(row, "email");
                const phoneError = fieldError(row, "phone");
                const isReady =
                  rowHasData(row) && !Object.keys(rowProblems[row.id]).length;

                return (
                  <tr key={row.id}>
                    <td>
                      <div className="member-table-field">
                        <div className="member-name-cell">
                          {isReady ? (
                            <span
                              title="Ready to save"
                              aria-label="Ready to save"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: GREEN,
                                color: "#fff",
                              }}
                            >
                              <Check size={14} aria-hidden="true" />
                            </span>
                          ) : (
                            <span className="row-number">{index + 1}</span>
                          )}

                          <input
                            className="member-table-input"
                            id={inputId("name")}
                            data-cell={`${row.id}:name`}
                            type="text"
                            value={row.name}
                            placeholder="Full name"
                            autoComplete="off"
                            aria-label={`Name for person ${index + 1}`}
                            aria-invalid={Boolean(nameError)}
                            aria-describedby={
                              nameError ? `${inputId("name")}-error` : undefined
                            }
                            style={invalidStyle(nameError)}
                            onChange={(event) =>
                              setRowField(row.id, "name", event.target.value)
                            }
                            onBlur={() => markTouched(row.id, "name")}
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, index, "name")
                            }
                          />
                        </div>

                        {nameError && (
                          <span
                            className="member-row-error"
                            id={`${inputId("name")}-error`}
                            role="alert"
                          >
                            {nameError}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="member-table-field">
                        <input
                          className="member-table-input"
                          id={inputId("phone")}
                          data-cell={`${row.id}:phone`}
                          type="tel"
                          value={row.phone}
                          placeholder="Phone number"
                          aria-label={`Phone for person ${index + 1}`}
                          aria-invalid={Boolean(phoneError)}
                          style={invalidStyle(phoneError)}
                          onChange={(event) =>
                            setRowField(row.id, "phone", event.target.value)
                          }
                          onBlur={() => markTouched(row.id, "phone")}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "phone")
                          }
                        />
                        {phoneError && (
                          <span className="member-row-error" role="alert">
                            {phoneError}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="member-table-field">
                        <input
                          className="member-table-input"
                          id={inputId("email")}
                          data-cell={`${row.id}:email`}
                          type="email"
                          value={row.email}
                          placeholder="Email address"
                          aria-label={`Email for person ${index + 1}`}
                          aria-invalid={Boolean(emailError)}
                          style={invalidStyle(emailError)}
                          onChange={(event) =>
                            setRowField(row.id, "email", event.target.value)
                          }
                          onBlur={() => markTouched(row.id, "email")}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "email")
                          }
                        />
                        {emailError && (
                          <span className="member-row-error" role="alert">
                            {emailError}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <select
                        className="member-table-select"
                        id={inputId("status")}
                        value={row.status}
                        aria-label={`Status for person ${index + 1}`}
                        onChange={(event) =>
                          setRowField(row.id, "status", event.target.value)
                        }
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>

                    <td>
                      <div className="member-table-field">
                        <div className="member-photo-cell">
                          <input
                            ref={(node) => {
                              if (node) photoInputRefs.current.set(row.id, node);
                              else photoInputRefs.current.delete(row.id);
                            }}
                            id={inputId("photo")}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(event) => handlePhoto(event, row.id)}
                          />

                          <button
                            type="button"
                            className="photo-preview member-photo-preview"
                            aria-label={`${row.photo ? "Change" : "Upload"} photo for person ${index + 1}`}
                            title={`${row.photo ? "Change" : "Upload"} photo`}
                            onClick={() =>
                              photoInputRefs.current.get(row.id)?.click()
                            }
                            style={{ cursor: "pointer", padding: 0 }}
                          >
                            {row.photo ? (
                              <img src={row.photo} alt="" />
                            ) : getInitials(row.name) ? (
                              <b style={{ fontSize: 12 }}>
                                {getInitials(row.name)}
                              </b>
                            ) : (
                              <ImagePlus size={16} aria-hidden="true" />
                            )}
                          </button>

                          {row.photo ? (
                            <button
                              type="button"
                              className="member-photo-button"
                              aria-label={`Remove photo for person ${index + 1}`}
                              title="Remove photo"
                              onClick={() => setRowField(row.id, "photo", "")}
                            >
                              <X size={15} aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="member-photo-button"
                              aria-label={`Upload photo for person ${index + 1}`}
                              title="Upload photo"
                              onClick={() =>
                                photoInputRefs.current.get(row.id)?.click()
                              }
                            >
                              <Camera size={15} aria-hidden="true" />
                            </button>
                          )}
                        </div>

                        {photoErrors[row.id] && (
                          <span className="member-row-error" role="alert">
                            {photoErrors[row.id]}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="member-delete-btn"
                        aria-label={`Remove person row ${index + 1}`}
                        title="Remove row"
                        disabled={rows.length === 1}
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="members-table-footer">
          <button
            className="add-row-button"
            type="button"
            onClick={() => addRow()}
          >
            <Plus size={16} aria-hidden="true" />
            Add another person
          </button>

          <div className="members-save-area">
            {error && (
              <p className="setup-error" role="alert">
                {error}
              </p>
            )}

            <button className="btn save-members-btn" type="submit">
              <Save size={16} aria-hidden="true" />
              Save {readyCount > 1 ? `${readyCount} People` : "Person"}
            </button>

            <button className="btn o" type="button" onClick={handleCancel}>
              <ArrowLeft size={15} aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmLeave}
        title="Discard these people?"
        message={`${peopleLabel(populatedCount)} you entered haven't been saved and will be lost.`}
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmLeave(false);
          onDone?.();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </>
  );
}