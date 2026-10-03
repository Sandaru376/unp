import React, { useMemo, useRef, useState } from "react";
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

function SectionHeader({ title, hint, badge }) {
	return (
		<div className="setup-section-header">
			<div>
				<h2>{title}</h2>
				<p className="mu">{hint}</p>
			</div>
			{badge}
		</div>
	);
}

function StatusBadge({ isActive }) {
	return (
		<span className={`bd ${isActive ? "" : "bd-muted"}`}>
			{isActive ? "Active" : "Inactive"}
		</span>
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

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [error, setError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [setConfirm, confirmDialog] = useConfirm();
	const nameRef = useRef(null);

	const resetForm = () => {
		setEditingId(null);
		setName("");
		setDescription("");
		setIsActive(true);
		setError("");
	};

	const focusForm = () => nameRef.current?.focus();

	const handleSubmit = (event) => {
		event.preventDefault();

		const payload = { name, description, isActive };
		const result = editingId
			? updateLocationType(editingId, payload)
			: addLocationType(payload);

		if (!result.ok) {
			setError(result.error);
			return;
		}

		notify(editingId ? "Location type updated" : "Location type added");
		resetForm();
	};

	const startEdit = (type) => {
		setEditingId(type.id);
		setName(type.name);
		setDescription(type.description || "");
		setIsActive(type.isActive !== false);
		setError("");
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
				`Cannot delete “${type.name}”: ${usage} ${
					usage === 1 ? "location" : "locations"
				} still use it.`,
			);
			return;
		}

		setConfirm({
			title: "Delete location type?",
			message: `“${type.name}” will no longer be available when creating locations.`,
			confirmLabel: "Delete",
			onConfirm: () => {
				const result = deleteLocationType(type.id);

				notify(result.ok ? "Location type deleted" : result.error);
				setConfirm(null);
				if (editingId === type.id) resetForm();
			},
		});
	};

	return (
		<div className="card setup-panel">
			<SectionHeader
				title="Location Types"
				hint="A location type describes what kind of place a location is — for example Province, District, Area, Ward or Zone. You decide which types exist."
			/>

			<form className="setup-form" onSubmit={handleSubmit}>
				<div className="setup-field">
					<label htmlFor="location-type-name">Name</label>
					<input
						id="location-type-name"
						ref={nameRef}
						type="text"
						value={name}
						placeholder="Enter location type name"
						onChange={(event) => setName(event.target.value)}
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
					<select
						id="location-type-status"
						value={isActive ? "active" : "inactive"}
						onChange={(event) =>
							setIsActive(event.target.value === "active")
						}
					>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>

				<div className="setup-field setup-actions">
					<button className="btn" type="submit">
						<Plus size={15} aria-hidden="true" />
						{editingId ? "Save Changes" : "Add Location Type"}
					</button>

					{editingId && (
						<button className="btn o" type="button" onClick={resetForm}>
							Cancel
						</button>
					)}
				</div>
			</form>

			<ErrorLine message={error} />

			{locationTypes.length === 0 ? (
				<EmptyState
					icon={Layers}
					title="No location types have been created yet."
					hint="Create your first location type above — nothing is pre-filled."
					actionLabel="Add Location Type"
					onAction={focusForm}
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
										{locations.filter(
											(location) => location.locationTypeId === type.id,
										).length}
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

function LocationNode({
	location,
	depth,
	query,
	onEdit,
	onToggle,
	onDelete,
}) {
	const { selectors } = useOrganization();
	const [open, setOpen] = useState(true);

	const type = selectors.getLocationTypeById(location.locationTypeId);
	const children = selectors.getChildLocations(location.id);
	const assignmentCount = selectors.getAssignmentsAtLocation(location.id).length;

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
		selectors
			.getChildLocations(node.id)
			.some((child) => subtreeMatches(child));

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
					{children.length} {children.length === 1 ? "child" : "children"} ·{" "}
					{assignmentCount} {assignmentCount === 1 ? "assignment" : "assignments"}
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

	const [name, setName] = useState("");
	const [locationTypeId, setLocationTypeId] = useState("");
	const [parentId, setParentId] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [error, setError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [query, setQuery] = useState("");
	const [setConfirm, confirmDialog] = useConfirm();
	const nameRef = useRef(null);

	/* Parent choices exclude the edited location and its own descendants. */
	const parentOptions = useMemo(
		() =>
			locations
				.filter((location) => {
					if (!editingId) return true;
					if (location.id === editingId) return false;
					return !selectors.isDescendantOf(location.id, editingId);
				})
				.map((location) => ({
					id: location.id,
					label: selectors.getLocationPathString(location.id),
				}))
				.sort((a, b) => a.label.localeCompare(b.label)),
		[locations, editingId, selectors],
	);

	const rootLocations = useMemo(
		() =>
			selectors
				.getRootLocations()
				.slice()
				.sort((a, b) => a.name.localeCompare(b.name)),
		[selectors, locations],
	);

	const resetForm = () => {
		setEditingId(null);
		setName("");
		setLocationTypeId("");
		setParentId("");
		setIsActive(true);
		setError("");
	};

	const focusForm = () => nameRef.current?.focus();

	const handleSubmit = (event) => {
		event.preventDefault();

		const payload = { name, locationTypeId, parentId, isActive };
		const result = editingId
			? updateLocation(editingId, payload)
			: addLocation(payload);

		if (!result.ok) {
			setError(result.error);
			return;
		}

		notify(editingId ? "Location updated" : "Location added");
		resetForm();
	};

	const startEdit = (location) => {
		setEditingId(location.id);
		setName(location.name);
		setLocationTypeId(location.locationTypeId || "");
		setParentId(location.parentId || "");
		setIsActive(location.isActive !== false);
		setError("");
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
		const assignmentCount = selectors.getAssignmentsAtLocation(location.id)
			.length;

		if (childCount || assignmentCount) {
			setError(
				`Cannot delete “${location.name}”: ${childCount} child ${
					childCount === 1 ? "location" : "locations"
				} and ${assignmentCount} ${
					assignmentCount === 1 ? "assignment" : "assignments"
				} still depend on it.`,
			);
			return;
		}

		setConfirm({
			title: "Delete location?",
			message: `“${location.name}” will be removed permanently.`,
			confirmLabel: "Delete",
			onConfirm: () => {
				const result = deleteLocation(location.id);

				notify(result.ok ? "Location deleted" : result.error);
				setConfirm(null);
				if (editingId === location.id) resetForm();
			},
		});
	};

	return (
		<div className="card setup-panel">
			<SectionHeader
				title="Locations"
				hint="Every actual place of the organization. Pick a location type and, optionally, a parent location — the hierarchy is built from that parent link."
			/>

			<form className="setup-form" onSubmit={handleSubmit}>
				<div className="setup-field">
					<label htmlFor="location-name">Location Name</label>
					<input
						id="location-name"
						ref={nameRef}
						type="text"
						value={name}
						placeholder="Enter location name"
						onChange={(event) => setName(event.target.value)}
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
						{parentOptions.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				<div className="setup-field">
					<label htmlFor="location-status">Status</label>
					<select
						id="location-status"
						value={isActive ? "active" : "inactive"}
						onChange={(event) =>
							setIsActive(event.target.value === "active")
						}
					>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>

				<div className="setup-field setup-actions">
					<button className="btn" type="submit">
						<Plus size={15} aria-hidden="true" />
						{editingId ? "Save Changes" : "Add Location"}
					</button>

					{editingId && (
						<button className="btn o" type="button" onClick={resetForm}>
							Cancel
						</button>
					)}
				</div>
			</form>

			<ErrorLine message={error} />

			{locations.length === 0 ? (
				<EmptyState
					icon={MapPin}
					title="No locations have been created yet."
					hint={
						locationTypes.length
							? "Add your first location above — root locations have no parent."
							: "Create a location type first, then add locations here."
					}
					actionLabel="Add Location"
					onAction={focusForm}
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
						<span className="bd">
							{locations.length} {locations.length === 1 ? "location" : "locations"}
						</span>
					</div>

					<div className="loc-tree">
						{rootLocations.map((location) => (
							<LocationNode
								key={location.id}
								location={location}
								depth={0}
								query={query.trim()}
								onEdit={startEdit}
								onToggle={toggleStatus}
								onDelete={requestDelete}
							/>
						))}
					</div>

					{query.trim() &&
						!rootLocations.some((root) => {
							const needle = query.trim().toLowerCase();
							const walk = (node) =>
								node.name.toLowerCase().includes(needle) ||
								selectors
									.getChildLocations(node.id)
									.some(walk);
							return walk(root);
						}) && (
						<p className="empty-state setup-empty-inline">
							No locations match “{query.trim()}”.
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

function PositionsSection({ notify }) {
	const { positions, assignments, addPosition, updatePosition, deletePosition } =
		useOrganization();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [error, setError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [setConfirm, confirmDialog] = useConfirm();
	const nameRef = useRef(null);

	const resetForm = () => {
		setEditingId(null);
		setName("");
		setDescription("");
		setIsActive(true);
		setError("");
	};

	const focusForm = () => nameRef.current?.focus();

	const handleSubmit = (event) => {
		event.preventDefault();

		const payload = { name, description, isActive };
		const result = editingId
			? updatePosition(editingId, payload)
			: addPosition(payload);

		if (!result.ok) {
			setError(result.error);
			return;
		}

		notify(editingId ? "Position updated" : "Position added");
		resetForm();
	};

	const startEdit = (position) => {
		setEditingId(position.id);
		setName(position.name);
		setDescription(position.description || "");
		setIsActive(position.isActive !== false);
		setError("");
	};

	const toggleStatus = (position) => {
		const result = updatePosition(position.id, {
			name: position.name,
			description: position.description || "",
			isActive: position.isActive === false,
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

		if (usage) {
			setError(
				`Cannot delete “${position.name}”: ${usage} ${
					usage === 1 ? "assignment" : "assignments"
				} still use it.`,
			);
			return;
		}

		setConfirm({
			title: "Delete position?",
			message: `“${position.name}” will be removed permanently.`,
			confirmLabel: "Delete",
			onConfirm: () => {
				const result = deletePosition(position.id);

				notify(result.ok ? "Position deleted" : result.error);
				setConfirm(null);
				if (editingId === position.id) resetForm();
			},
		});
	};

	return (
		<div className="card setup-panel">
			<SectionHeader
				title="Positions"
				hint="A position describes what a person does — for example Coordinator, Organizer, Worker or Volunteer. Positions are independent from locations."
			/>

			<form className="setup-form" onSubmit={handleSubmit}>
				<div className="setup-field">
					<label htmlFor="position-name">Position Name</label>
					<input
						id="position-name"
						ref={nameRef}
						type="text"
						value={name}
						placeholder="Enter position name"
						onChange={(event) => setName(event.target.value)}
					/>
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
					<select
						id="position-status"
						value={isActive ? "active" : "inactive"}
						onChange={(event) =>
							setIsActive(event.target.value === "active")
						}
					>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>

				<div className="setup-field setup-actions">
					<button className="btn" type="submit">
						<Plus size={15} aria-hidden="true" />
						{editingId ? "Save Changes" : "Add Position"}
					</button>

					{editingId && (
						<button className="btn o" type="button" onClick={resetForm}>
							Cancel
						</button>
					)}
				</div>
			</form>

			<ErrorLine message={error} />

			{positions.length === 0 ? (
				<EmptyState
					icon={Award}
					title="No positions have been created yet."
					hint="Create your first position above — nothing is pre-filled."
					actionLabel="Add Position"
					onAction={focusForm}
				/>
			) : (
				<div className="card tw setup-table-card">
					<table>
						<thead>
							<tr>
								<th>Position</th>
								<th>Description</th>
								<th>Status</th>
								<th>Assignments</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{positions.map((position) => (
								<tr key={position.id}>
									<td>
										<b>{position.name}</b>
									</td>
									<td className="mu">{position.description || "—"}</td>
									<td>
										<StatusBadge isActive={position.isActive !== false} />
									</td>
									<td>
										{assignments.filter(
											(assignment) => assignment.positionId === position.id,
										).length}
									</td>
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
   Page
   ========================================================= */

const TABS = [
	{ key: "locationTypes", label: "Location Types", icon: Layers },
	{ key: "locations", label: "Locations", icon: MapPin },
	{ key: "positions", label: "Positions", icon: Award },
];

export default function OrganizationSetup({ notify = () => {} }) {
	const { locationTypes, locations, positions, people, assignments } =
		useOrganization();

	const [tab, setTab] = useState("locationTypes");

	return (
		<>
			<div className="tag">Administration</div>

			<div className="setup-header">
				<div>
					<h1>Organization Setup</h1>
					<p className="mu lead">
						Build your own structure: location types, locations linked into a
						hierarchy, and positions. The system starts empty — you decide how
						the organization is shaped.
					</p>
				</div>

				<div className="setup-stats">
					<span className="setup-stat">
						<b>{locationTypes.length}</b> Location Types
					</span>
					<span className="setup-stat">
						<b>{locations.length}</b> Locations
					</span>
					<span className="setup-stat">
						<b>{positions.length}</b> Positions
					</span>
					<span className="setup-stat">
						<b>{people.length}</b> People
					</span>
					<span className="setup-stat">
						<b>{assignments.length}</b> Assignments
					</span>
				</div>
			</div>

			<div
				className="setup-tabs"
				role="tablist"
				aria-label="Organization setup sections"
			>
				{TABS.map(({ key, label, icon: Icon }) => (
					<button
						key={key}
						type="button"
						role="tab"
						aria-selected={tab === key}
						className={`setup-tab ${tab === key ? "on" : ""}`}
						onClick={() => setTab(key)}
					>
						<Icon size={16} aria-hidden="true" />
						{label}
					</button>
				))}
			</div>

			{tab === "locationTypes" && (
				<LocationTypesSection notify={notify} />
			)}
			{tab === "locations" && <LocationsSection notify={notify} />}
			{tab === "positions" && <PositionsSection notify={notify} />}
		</>
	);
}
