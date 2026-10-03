import React, { useEffect, useRef } from "react";
import { X, MapPin, Trash2 } from "lucide-react";
import { getInitials } from "../data/selectors";
import { useOrganization } from "../context/OrganizationContext";

export default function Drawer({
  person,
  onClose,
  goMap,
  onRemove,
  onViewProfile,
}) {
  const { selectors } = useOrganization();

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!person) return undefined;

    const previousFocus = document.activeElement;
    closeBtnRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      // Simple focus trap inside the panel
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [person, onClose]);

  if (!person) return null;

  const primary = selectors.getPersonLocation(person);

  const assignmentViews = selectors
    .getAssignmentsForPerson(person.id)
    .map((assignment) => selectors.getAssignmentView(assignment));

  const mapLocationId = primary.locationId || null;

  return (
    <div
      className="dr"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={onClose}
    >
      <section
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-top">
          <button
            ref={closeBtnRef}
            type="button"
            className="icon-btn"
            aria-label="Close profile"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="profile">
          <div className="av big">
            {person.photo ? (
              <img src={person.photo} alt={person.name} />
            ) : (
              getInitials(person.name)
            )}
          </div>
          <h2 id="drawer-title">{person.name}</h2>
          <b>{primary.positionName || "No assignment yet"}</b>
          <p className="mu">{primary.pathString || "—"}</p>
          <span className="bd">{person.status || "Active"}</span>
        </div>

        <dl className="dl">
          {assignmentViews.length ? (
            assignmentViews.map((view) => (
              <React.Fragment key={view.assignment.id}>
                <dt>{view.positionName}</dt>
                <dd>{view.pathString || "—"}</dd>
              </React.Fragment>
            ))
          ) : (
            <>
              <dt>Assignment</dt>
              <dd>None yet</dd>
            </>
          )}
          {person.phone && (
            <>
              <dt>Phone</dt>
              <dd>{person.phone}</dd>
            </>
          )}
          {person.email && (
            <>
              <dt>Email</dt>
              <dd>{person.email}</dd>
            </>
          )}
          {person.createdAt && (
            <>
              <dt>Added</dt>
              <dd>{String(person.createdAt).slice(0, 10)}</dd>
            </>
          )}
        </dl>

        <div className="drawer-actions">
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              goMap(mapLocationId);
              onClose();
            }}
          >
            <MapPin size={14} aria-hidden="true" />
            View on map
          </button>

          <button
            type="button"
            className="btn sm o"
            onClick={() => onViewProfile?.(person.id)}
          >
            View full profile
          </button>

          <button
            type="button"
            className="btn sm o"
            onClick={onClose}
          >
            Close
          </button>

          {onRemove && (
            <button
              type="button"
              className="btn sm o icon-action drawer-remove"
              aria-label={`Remove ${person.name}`}
              onClick={() => onRemove(person.id)}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
