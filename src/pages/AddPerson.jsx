import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Save,
  ClipboardList,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import { readPersonPhoto } from "../utils/personPhoto";

const emptyPersonRow = (id) => ({
  id,
  name: "",
  phone: "",
  email: "",
  status: "Active",
  photo: "",
});

const rowHasData = (row) =>
  Boolean(row.name.trim() || row.phone.trim() || row.email.trim() || row.photo);

export default function AddPerson({ notify = () => {}, onDone }) {
  const { addPerson } = useOrganization();

  const [rows, setRows] = useState(() => [emptyPersonRow(1)]);
  const [error, setError] = useState("");
  const [rowErrors, setRowErrors] = useState({});
  const nextRowId = useRef(2);
  const photoInputRefs = useRef(new Map());

  const setRowField = (rowId, key, value) => {
    setError("");
    setRowErrors((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row,
      ),
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const populatedRows = rows.filter(rowHasData);
    if (!populatedRows.length) {
      setError("Enter a name for at least one person.");
      return;
    }

    let addedCount = 0;
    const failedRows = [];
    const nextErrors = {};

    populatedRows.forEach((row) => {
      const result = addPerson(row);
      if (result.ok) {
        addedCount += 1;
      } else {
        failedRows.push(row);
        nextErrors[row.id] = result.error;
      }
    });

    setRowErrors(nextErrors);
    if (failedRows.length) {
      setRows(failedRows);
      if (addedCount) {
        notify(`${addedCount} ${addedCount === 1 ? "person" : "people"} added`);
      }
      return;
    }

    notify(`✓ ${addedCount} ${addedCount === 1 ? "person" : "people"} added successfully`);
    onDone?.();
  };

  const handlePhoto = async (event, rowId) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");

    try {
      const photo = await readPersonPhoto(file);
      setRowField(rowId, "photo", photo);
    } catch (photoError) {
      setError(photoError.message);
    }
  };

  const addRow = () => {
    const row = emptyPersonRow(nextRowId.current);
    nextRowId.current += 1;
    setRows((current) => [...current, row]);
  };

  const removeRow = (rowId) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
    setRowErrors((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const populatedCount = rows.filter(rowHasData).length;

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
            After saving, open Assignments to connect this person with a
            position and a location.
          </span>
        </div>
      </div>

      <form
        className="setup-form members-table-card card add-person-form"
        onSubmit={handleSubmit}
      >
        <div className="members-table-toolbar">
          <div>
            <h2>People to add</h2>
            <p className="mu">Enter one person per row. Each row can be saved independently.</p>
          </div>
          <span className="member-count-pill">
            <strong>{populatedCount}</strong> ready to save
          </span>
        </div>

        <div className="members-table-scroll">
          <table className="members-entry-table add-person-entry-table" aria-label="People to add">
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

                return (
                  <tr key={row.id}>
                    <td>
                      <div className="member-table-field">
                        <div className="member-name-cell">
                          <span className="row-number">{index + 1}</span>
                          <input
                            className="member-table-input"
                            id={inputId("name")}
                            type="text"
                            value={row.name}
                            placeholder="Full name"
                            aria-label={`Name for person ${index + 1}`}
                            aria-describedby={rowErrors[row.id] ? `${inputId("name")}-error` : undefined}
                            onChange={(event) => setRowField(row.id, "name", event.target.value)}
                          />
                        </div>
                        {rowErrors[row.id] && (
                          <span className="member-row-error" id={`${inputId("name")}-error`} role="alert">
                            {rowErrors[row.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        className="member-table-input"
                        id={inputId("phone")}
                        type="tel"
                        value={row.phone}
                        placeholder="Phone number"
                        aria-label={`Phone for person ${index + 1}`}
                        onChange={(event) => setRowField(row.id, "phone", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="member-table-input"
                        id={inputId("email")}
                        type="email"
                        value={row.email}
                        placeholder="Email address"
                        aria-label={`Email for person ${index + 1}`}
                        onChange={(event) => setRowField(row.id, "email", event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="member-table-select"
                        id={inputId("status")}
                        value={row.status}
                        aria-label={`Status for person ${index + 1}`}
                        onChange={(event) => setRowField(row.id, "status", event.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td>
                      <div className="member-photo-cell">
                        <span className="photo-preview member-photo-preview">
                          {row.photo ? (
                            <img src={row.photo} alt="" />
                          ) : (
                            <ImagePlus size={16} aria-hidden="true" />
                          )}
                        </span>
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
                          className="member-photo-button"
                          aria-label={`${row.photo ? "Change" : "Upload"} photo for person ${index + 1}`}
                          title={`${row.photo ? "Change" : "Upload"} photo`}
                          onClick={() => photoInputRefs.current.get(row.id)?.click()}
                        >
                          <Camera size={15} aria-hidden="true" />
                        </button>
                        {row.photo && (
                          <button
                            type="button"
                            className="member-photo-button"
                            aria-label={`Remove photo for person ${index + 1}`}
                            title="Remove photo"
                            onClick={() => setRowField(row.id, "photo", "")}
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
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
          <button className="add-row-button" type="button" onClick={addRow}>
            <Plus size={16} aria-hidden="true" />
            Add another person
          </button>

          <div className="members-save-area">
            {error && <p className="setup-error" role="alert">{error}</p>}
            <button className="btn save-members-btn" type="submit">
              <Save size={16} aria-hidden="true" />
              Save {populatedCount > 1 ? `${populatedCount} People` : "Person"}
            </button>
            <button className="btn o" type="button" onClick={onDone}>
              <ArrowLeft size={15} aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
