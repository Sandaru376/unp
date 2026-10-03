import React, { useRef, useState } from "react";
import { ArrowLeft, Camera, ImagePlus, Save, ClipboardList, X } from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import { readPersonPhoto } from "../utils/personPhoto";

export default function AddPerson({ notify = () => {}, onDone }) {
  const { addPerson } = useOrganization();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    status: "Active",
    photo: "",
  });
  const [error, setError] = useState("");
  const photoInputRef = useRef(null);

  const setField = (key, value) => {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = addPerson(form);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notify(`✓ ${form.name.trim()} added successfully`);
    onDone?.();
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");

    try {
      const photo = await readPersonPhoto(file);
      setField("photo", photo);
    } catch (photoError) {
      setError(photoError.message);
    }
  };

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

      <div className="card form-card">
        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-field">
            <label htmlFor="person-name">Name</label>
            <input
              id="person-name"
              type="text"
              value={form.name}
              placeholder="Enter full name"
              onChange={(event) => setField("name", event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="person-phone">Phone</label>
            <input
              id="person-phone"
              type="text"
              value={form.phone}
              placeholder="Enter phone number"
              onChange={(event) => setField("phone", event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="person-email">Email</label>
            <input
              id="person-email"
              type="email"
              value={form.email}
              placeholder="Enter email address"
              onChange={(event) => setField("email", event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="person-status">Status</label>
            <select
              id="person-status"
              value={form.status}
              onChange={(event) => setField("status", event.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="setup-field photo-field">
            <label htmlFor="person-photo">Photo</label>

            <div className="photo-row">
              <span className="photo-preview">
                {form.photo ? (
                  <img src={form.photo} alt="" />
                ) : (
                  <ImagePlus size={20} aria-hidden="true" />
                )}
              </span>

              <div className="photo-buttons">
                <input
                  ref={photoInputRef}
                  id="person-photo"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePhoto}
                />

                <button
                  type="button"
                  className="btn sm o"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera size={14} aria-hidden="true" />
                  {form.photo ? "Change photo" : "Upload photo"}
                </button>

                {form.photo && (
                  <button
                    type="button"
                    className="btn sm o"
                    onClick={() => setField("photo", "")}
                  >
                    <X size={14} aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            <small className="mu">
              Optional · JPG, PNG or GIF up to 5 MB.
            </small>
          </div>

          <div className="setup-field setup-actions">
            <button className="btn" type="submit">
              <Save size={16} aria-hidden="true" />
              Save Person
            </button>

            <button className="btn o" type="button" onClick={onDone}>
              <ArrowLeft size={15} aria-hidden="true" />
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
    </>
  );
}
