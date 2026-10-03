import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Camera,
  ClipboardList,
  CalendarDays,
  Users,
  X,
} from "lucide-react";

import { useOrganization } from "../context/OrganizationContext";
import { readPersonPhoto } from "../utils/personPhoto";

/* =========================================================
   HELPERS
   ========================================================= */

function getInitials(name = "") {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/* =========================================================
   PERSON PROFILE
   ========================================================= */

export default function PersonProfile({ person, onBack }) {
  const { selectors, updatePerson } = useOrganization();

  const photoInputRef = useRef(null);
  const [photoError, setPhotoError] = useState("");

  if (!person) {
    return (
      <div className="person-profile-page">
        <div className="person-profile-empty">
          <Users size={42} />

          <h2>Person not found</h2>

          <p>The selected person could not be found.</p>

          <button type="button" className="btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>
    );
  }

  const primary = selectors.getPersonLocation(person);

  const assignmentViews = selectors
    .getAssignmentsForPerson(person.id)
    .map((assignment) => selectors.getAssignmentView(assignment));

  const positionCount = new Set(
    assignmentViews.map((view) => view.assignment.positionId),
  ).size;

  const locationCount = new Set(
    assignmentViews.map((view) => view.assignment.locationId),
  ).size;

  const activeCount = assignmentViews.filter(
    (view) => view.assignment.isActive !== false,
  ).length;

  const avatarSrc = person.photo || person.image;

  const changePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setPhotoError("");

    try {
      const photo = await readPersonPhoto(file);
      updatePerson(person.id, { ...person, photo });
    } catch (photoError) {
      setPhotoError(photoError.message);
    }
  };

  const removePhoto = () => {
    setPhotoError("");
    updatePerson(person.id, { ...person, photo: "" });
  };

  return (
    <>
      <div className="person-profile-page">
        {/* BACK */}
        <button type="button" className="person-profile-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        {/* PROFILE HEADER */}
        <section className="person-profile-hero">
          <div className="person-profile-avatar-wrapper">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={person.name}
                className="person-profile-avatar"
              />
            ) : (
              <div className="person-profile-avatar person-profile-avatar-initials">
                {getInitials(person.name)}
              </div>
            )}

            <span
              className={`person-profile-status-dot ${
                person.status?.toLowerCase() === "active" ? "active" : ""
              }`}
            />

            <button
              type="button"
              className="person-profile-photo-btn"
              aria-label={avatarSrc ? "Change photo" : "Add photo"}
              onClick={() => photoInputRef.current?.click()}
            >
              <Camera size={14} aria-hidden="true" />
            </button>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={changePhoto}
            />
          </div>

          <div className="person-profile-hero-content">
            <div className="person-profile-eyebrow">PERSON PROFILE</div>

            <h1>{person.name}</h1>

            <div className="person-profile-position">
              {primary.positionName || "No assignment yet"}
            </div>

            <div className="person-profile-location">
              <MapPin size={15} />

              <span>
                {primary.pathNames.length
                  ? primary.pathNames.join(" · ")
                  : "No location assigned"}
              </span>
            </div>

            <div className="person-profile-status">
              <span className="person-profile-status-dot-small" />

              {person.status || "Active"}
            </div>

            <div className="person-profile-photo-actions">
              <button
                type="button"
                className="btn sm o"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera size={14} aria-hidden="true" />
                {avatarSrc ? "Change photo" : "Add photo"}
              </button>

              {avatarSrc && (
                <button
                  type="button"
                  className="btn sm o"
                  onClick={removePhoto}
                >
                  <X size={14} aria-hidden="true" />
                  Remove photo
                </button>
              )}
            </div>

            {photoError && (
              <p className="setup-error" role="alert">
                {photoError}
              </p>
            )}
          </div>
        </section>

        {/* QUICK STATISTICS */}
        <section className="person-profile-stats">
          <div className="person-profile-stat">
            <div className="person-profile-stat-icon">
              <ClipboardList size={19} />
            </div>

            <div>
              <span>Total Assignments</span>
              <strong>{assignmentViews.length}</strong>
            </div>
          </div>

          <div className="person-profile-stat">
            <div className="person-profile-stat-icon">
              <CalendarDays size={19} />
            </div>

            <div>
              <span>Active Assignments</span>
              <strong>{activeCount}</strong>
            </div>
          </div>

          <div className="person-profile-stat">
            <div className="person-profile-stat-icon">
              <Building2 size={19} />
            </div>

            <div>
              <span>Positions Held</span>
              <strong>{positionCount}</strong>
            </div>
          </div>

          <div className="person-profile-stat">
            <div className="person-profile-stat-icon">
              <MapPin size={19} />
            </div>

            <div>
              <span>Locations</span>
              <strong>{locationCount}</strong>
            </div>
          </div>
        </section>

        {/* PERSONAL INFORMATION */}
        <section className="person-profile-card">
          <div className="person-profile-section-heading">
            <div className="person-profile-section-icon">
              <Users size={18} />
            </div>

            <div>
              <h2>Personal Information</h2>
              <p>Contact details and status</p>
            </div>
          </div>

          <div className="person-profile-details-grid">
            <div className="person-profile-detail">
              <span>Name</span>
              <strong>{person.name}</strong>
            </div>

            <div className="person-profile-detail">
              <span>Phone</span>
              <strong>{person.phone || "—"}</strong>
            </div>

            <div className="person-profile-detail">
              <span>Email</span>
              <strong>{person.email || "—"}</strong>
            </div>

            <div className="person-profile-detail">
              <span>Status</span>
              <strong>{person.status || "Active"}</strong>
            </div>

            <div className="person-profile-detail">
              <span>Added</span>
              <strong>
                {person.createdAt ? String(person.createdAt).slice(0, 10) : "—"}
              </strong>
            </div>

            <div className="person-profile-detail">
              <span>Last Updated</span>
              <strong>
                {person.updatedAt ? String(person.updatedAt).slice(0, 10) : "—"}
              </strong>
            </div>
          </div>
        </section>

        {/* ASSIGNMENTS */}
        <section className="person-profile-card">
          <div className="person-profile-section-heading">
            <div className="person-profile-section-icon">
              <ClipboardList size={18} />
            </div>

            <div>
              <h2>Assignments</h2>
              <p>Position, location and dates for each assignment</p>
            </div>
          </div>

          {assignmentViews.length === 0 ? (
            <div className="person-profile-empty-small">
              No assignments yet. Create one on the Assignments page.
            </div>
          ) : (
            <div className="person-profile-table-wrapper">
              <table className="person-profile-election-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Location</th>
                    <th>Location Hierarchy</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {assignmentViews.map((view) => (
                    <tr key={view.assignment.id}>
                      <td>
                        <strong>{view.positionName}</strong>
                      </td>

                      <td>{view.locationName}</td>

                      <td>
                        <small>{view.pathString || "—"}</small>
                      </td>

                      <td>{view.assignment.startDate || "—"}</td>

                      <td>{view.assignment.endDate || "—"}</td>

                      <td>
                        <span
                          className={`bd ${
                            view.assignment.isActive === false ? "bd-muted" : ""
                          }`}
                        >
                          {view.assignment.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ASSIGNMENT TIMELINE */}
        <section className="person-profile-card">
          <div className="person-profile-section-heading">
            <div className="person-profile-section-icon">
              <CalendarDays size={18} />
            </div>

            <div>
              <h2>Assignment Timeline</h2>
              <p>Organization and position history</p>
            </div>
          </div>

          {assignmentViews.length === 0 ? (
            <div className="person-profile-empty-small">
              No assignment history available.
            </div>
          ) : (
            <div className="person-profile-timeline">
              {assignmentViews.map((view) => (
                <div
                  className="person-profile-timeline-item"
                  key={`timeline-${view.assignment.id}`}
                >
                  <div className="person-profile-timeline-dot" />

                  <div className="person-profile-timeline-content">
                    <span className="person-profile-timeline-year">
                      {view.assignment.startDate || "—"}
                      {view.assignment.endDate
                        ? ` → ${view.assignment.endDate}`
                        : ""}
                    </span>

                    <h3>{view.positionName}</h3>

                    <p>{view.pathString || view.locationName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <div className="person-profile-footer">
          <button type="button" className="btn o" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>

          <span>
            {assignmentViews.length
              ? `Assignment records: ${assignmentViews.length}`
              : "No assignment records"}
          </span>
        </div>
      </div>
    </>
  );
}
