import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	LOCATION_TYPES,
	LOCATIONS,
	POSITIONS,
	PEOPLE,
	ASSIGNMENTS,
	createSelectors,
} from "../data";

/*
 * Central organization data layer (frontend demo only).
 *
 * A mutable store ref holds the current records; React state mirrors it
 * for rendering. Every action validates against the store ref (always
 * fresh, even when several actions run in the same event) and then
 * writes both.
 *
 * The application starts EMPTY — the user creates every location type,
 * location, position, person and assignment from the UI.
 *
 * Later each action can be swapped for a REST call without touching
 * the pages. Nothing here talks to a backend, database or API.
 */

const OrganizationContext = createContext(null);

const ok = () => ({ ok: true });
const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

const nextId = (prefix, items) => {
	const highest = items.reduce((max, item) => {
		const match = String(item.id).match(new RegExp(`^${prefix}-(\\d+)$`));
		const value = match ? Number(match[1]) : Number.NaN;
		return Number.isFinite(value) ? Math.max(max, value) : max;
	}, 0);

	return `${prefix}-${highest + 1}`;
};

const clean = (value) => String(value ?? "").trim();

const isBlank = (value) => clean(value) === "";

const isRootParent = (value) =>
	value === null || value === undefined || value === "";

const now = () => new Date().toISOString();

const today = () => new Date().toISOString().slice(0, 10);

const isActiveFlag = (value, fallback = true) =>
	value === undefined || value === null ? fallback : Boolean(value);

const findDuplicate = (items, { value, scopeKey, scopeId, ignoreId }) => {
	const target = clean(value).toLowerCase();

	return items.some(
		(item) =>
			item.id !== ignoreId &&
			clean(item.name).toLowerCase() === target &&
			(scopeKey ? item[scopeKey] === scopeId : true),
	);
};

export function OrganizationProvider({ children }) {
	const storeRef = useRef({
		locationTypes: LOCATION_TYPES,
		locations: LOCATIONS,
		positions: POSITIONS,
		people: PEOPLE,
		assignments: ASSIGNMENTS,
	});

	const [locationTypes, setLocationTypes] = useState(
		storeRef.current.locationTypes,
	);
	const [locations, setLocations] = useState(storeRef.current.locations);
	const [positions, setPositions] = useState(storeRef.current.positions);
	const [people, setPeople] = useState(storeRef.current.people);
	const [assignments, setAssignments] = useState(
		storeRef.current.assignments,
	);

	const write = useCallback((key, value) => {
		storeRef.current[key] = value;

		switch (key) {
			case "locationTypes":
				setLocationTypes(value);
				break;
			case "locations":
				setLocations(value);
				break;
			case "positions":
				setPositions(value);
				break;
			case "people":
				setPeople(value);
				break;
			case "assignments":
				setAssignments(value);
				break;
			default:
				break;
		}

		return value;
	}, []);

	const selectors = useMemo(
		() =>
			createSelectors({
				locationTypes,
				locations,
				positions,
				people,
				assignments,
			}),
		[locationTypes, locations, positions, people, assignments],
	);

	/* ---------------- Location types ---------------- */

	const addLocationType = useCallback(
		({ name, description = "", isActive = true }) => {
			const current = storeRef.current.locationTypes;
			const typeName = clean(name);

			if (!typeName) return fail("Location type name is required.");
			if (findDuplicate(current, { value: typeName })) {
				return fail("That location type already exists.");
			}

			write("locationTypes", [
				...current,
				{
					id: nextId("loc-type", current),
					name: typeName,
					description: clean(description),
					isActive: isActiveFlag(isActive),
				},
			]);

			return ok();
		},
		[write],
	);

	const updateLocationType = useCallback(
		(id, { name, description = "", isActive = true }) => {
			const current = storeRef.current.locationTypes;
			const typeName = clean(name);

			if (!typeName) return fail("Location type name is required.");
			if (findDuplicate(current, { value: typeName, ignoreId: id })) {
				return fail("That location type already exists.");
			}

			write(
				"locationTypes",
				current.map((type) =>
					type.id === id
						? {
								...type,
								name: typeName,
								description: clean(description),
								isActive: isActiveFlag(isActive),
						  }
						: type,
				),
			);

			return ok();
		},
		[write],
	);

	const deleteLocationType = useCallback(
		(id) => {
			const usage = storeRef.current.locations.filter(
				(location) => location.locationTypeId === id,
			).length;

			if (usage) {
				return fail(
					`Cannot delete: ${usage} ${
						usage === 1 ? "location" : "locations"
					} still use this location type.`,
				);
			}

			write(
				"locationTypes",
				storeRef.current.locationTypes.filter(
					(type) => type.id !== id,
				),
			);

			return ok();
		},
		[write],
	);

	/* ---------------- Locations ---------------- */

	const validateLocation = ({ id = null, name, locationTypeId, parentId }) => {
		const { locations: allLocations, locationTypes: allTypes } =
			storeRef.current;
		const locationName = clean(name);

		if (!locationName) return { error: "Location name is required." };

		if (!allTypes.some((type) => type.id === locationTypeId)) {
			return { error: "Select a location type." };
		}

		if (!isRootParent(parentId)) {
			const parent = allLocations.find(
				(item) => item.id === parentId,
			);

			if (!parent) return { error: "Select a valid parent location." };

			if (id && (parent.id === id || isChildOf(allLocations, parent.id, id))) {
				return { error: "A location cannot be its own descendant." };
			}
		}

		return { locationName };
	};

	const addLocation = useCallback(
		({ name, locationTypeId, parentId = null, isActive = true }) => {
			const current = storeRef.current.locations;
			const { error, locationName } = validateLocation({
				name,
				locationTypeId,
				parentId,
			});

			if (error) return fail(error);

			if (
				findDuplicate(current, {
					value: locationName,
					scopeKey: "parentId",
					scopeId: isRootParent(parentId) ? null : parentId,
				})
			) {
				return fail("That location already exists under this parent.");
			}

			write("locations", [
				...current,
				{
					id: nextId("loc", current),
					name: locationName,
					locationTypeId,
					parentId: isRootParent(parentId) ? null : parentId,
					isActive: isActiveFlag(isActive),
				},
			]);

			return ok();
		},
		[write],
	);

	const updateLocation = useCallback(
		(id, { name, locationTypeId, parentId = null, isActive = true }) => {
			const current = storeRef.current.locations;
			const { error, locationName } = validateLocation({
				id,
				name,
				locationTypeId,
				parentId,
			});

			if (error) return fail(error);

			if (
				findDuplicate(current, {
					value: locationName,
					scopeKey: "parentId",
					scopeId: isRootParent(parentId) ? null : parentId,
					ignoreId: id,
				})
			) {
				return fail("That location already exists under this parent.");
			}

			write(
				"locations",
				current.map((location) =>
					location.id === id
						? {
								...location,
								name: locationName,
								locationTypeId,
								parentId: isRootParent(parentId) ? null : parentId,
								isActive: isActiveFlag(isActive),
						  }
						: location,
				),
			);

			return ok();
		},
		[write],
	);

	const deleteLocation = useCallback(
		(id) => {
			const { locations: allLocations, assignments: allAssignments } =
				storeRef.current;

			const childCount = allLocations.filter(
				(location) => location.parentId === id,
			).length;
			const assignmentCount = allAssignments.filter(
				(assignment) => assignment.locationId === id,
			).length;

			if (childCount || assignmentCount) {
				return fail(
					`Cannot delete: ${childCount} child ${
						childCount === 1 ? "location" : "locations"
					} and ${assignmentCount} ${
						assignmentCount === 1 ? "assignment" : "assignments"
					} still depend on it.`,
				);
			}

			write(
				"locations",
				storeRef.current.locations.filter(
					(location) => location.id !== id,
				),
			);

			return ok();
		},
		[write],
	);

	/* ---------------- Positions ---------------- */

	const addPosition = useCallback(
		({ name, description = "", isActive = true }) => {
			const current = storeRef.current.positions;
			const positionName = clean(name);

			if (!positionName) return fail("Position name is required.");
			if (findDuplicate(current, { value: positionName })) {
				return fail("That position already exists.");
			}

			write("positions", [
				...current,
				{
					id: nextId("pos", current),
					name: positionName,
					description: clean(description),
					isActive: isActiveFlag(isActive),
				},
			]);

			return ok();
		},
		[write],
	);

	const updatePosition = useCallback(
		(id, { name, description = "", isActive = true }) => {
			const current = storeRef.current.positions;
			const positionName = clean(name);

			if (!positionName) return fail("Position name is required.");
			if (findDuplicate(current, { value: positionName, ignoreId: id })) {
				return fail("That position already exists.");
			}

			write(
				"positions",
				current.map((position) =>
					position.id === id
						? {
								...position,
								name: positionName,
								description: clean(description),
								isActive: isActiveFlag(isActive),
						  }
						: position,
				),
			);

			return ok();
		},
		[write],
	);

	const deletePosition = useCallback(
		(id) => {
			const usage = storeRef.current.assignments.filter(
				(assignment) => assignment.positionId === id,
			).length;

			if (usage) {
				return fail(
					`Cannot delete: ${usage} ${
						usage === 1 ? "assignment" : "assignments"
					} still use this position.`,
				);
			}

			write(
				"positions",
				storeRef.current.positions.filter(
					(position) => position.id !== id,
				),
			);

			return ok();
		},
		[write],
	);

	/* ---------------- People ---------------- */

	const addPerson = useCallback(
		({
			name,
			phone = "",
			email = "",
			status = "Active",
			photo = "",
		}) => {
			const current = storeRef.current.people;
			const personName = clean(name);
			const personEmail = clean(email);

			if (!personName) return fail("Person name is required.");

			if (
				personEmail &&
				current.some(
					(person) =>
						clean(person.email).toLowerCase() ===
						personEmail.toLowerCase(),
				)
			) {
				return fail("That email is already used by another person.");
			}

			const timestamp = now();

			write("people", [
				...current,
				{
					id: nextId("person", current),
					name: personName,
					phone: clean(phone),
					email: personEmail,
					status: status || "Active",
					photo: clean(photo),
					createdAt: timestamp,
					updatedAt: timestamp,
				},
			]);

			return ok();
		},
		[write],
	);

	const updatePerson = useCallback(
		(id, { name, phone = "", email = "", status = "Active", photo }) => {
			const current = storeRef.current.people;
			const personName = clean(name);
			const personEmail = clean(email);

			if (!personName) return fail("Person name is required.");

			if (
				personEmail &&
				current.some(
					(person) =>
						person.id !== id &&
						clean(person.email).toLowerCase() ===
						personEmail.toLowerCase(),
				)
			) {
				return fail("That email is already used by another person.");
			}

			write(
				"people",
				current.map((person) =>
					person.id === id
						? {
								...person,
								name: personName,
								phone: clean(phone),
								email: personEmail,
								status: status || "Active",
								photo:
									photo === undefined
										? person.photo || ""
										: clean(photo),
								updatedAt: now(),
						  }
						: person,
				),
			);

			return ok();
		},
		[write],
	);

	/*
	 * Deleting a person also removes their assignments.
	 * If assignments exist, confirmation is required first:
	 * the UI re-calls with { force: true }.
	 */
	const deletePerson = useCallback(
		(id, { force = false } = {}) => {
			const { people: current, assignments: allAssignments } =
				storeRef.current;

			const assignmentCount = allAssignments.filter(
				(assignment) => assignment.personId === id,
			).length;

			if (assignmentCount && !force) {
				return fail(
					`“${
						current.find((person) => person.id === id)?.name || "This person"
					}” has ${assignmentCount} ${
						assignmentCount === 1 ? "assignment" : "assignments"
					}. Deleting will remove them too.`,
					{ confirm: true },
				);
			}

			write(
				"people",
				current.filter((person) => person.id !== id),
			);
			write(
				"assignments",
				allAssignments.filter(
					(assignment) => assignment.personId !== id,
				),
			);

			return ok();
		},
		[write],
	);

	/* ---------------- Assignments ---------------- */

	const validateAssignment = ({
		id = null,
		personId,
		positionId,
		locationId,
		startDate,
		endDate = "",
	}) => {
		const { people: allPeople, positions: allPositions, locations: allLocations } =
			storeRef.current;

		if (!allPeople.some((person) => person.id === personId)) {
			return { error: "Select a person." };
		}
		if (!allPositions.some((position) => position.id === positionId)) {
			return { error: "Select a position." };
		}
		if (!allLocations.some((location) => location.id === locationId)) {
			return { error: "Select a location." };
		}
		if (isBlank(startDate)) {
			return { error: "Start date is required." };
		}
		if (!isBlank(endDate) && clean(endDate) < clean(startDate)) {
			return { error: "End date must be on or after the start date." };
		}

		return {};
	};

	const addAssignment = useCallback(
		({
			personId,
			positionId,
			locationId,
			startDate,
			endDate = "",
			isActive = true,
		}) => {
			const current = storeRef.current.assignments;
			const { error } = validateAssignment({
				personId,
				positionId,
				locationId,
				startDate,
				endDate,
			});

			if (error) return fail(error);

			write("assignments", [
				...current,
				{
					id: nextId("assignment", current),
					personId,
					positionId,
					locationId,
					startDate: clean(startDate),
					endDate: clean(endDate),
					isActive: isActiveFlag(isActive),
				},
			]);

			return ok();
		},
		[write],
	);

	const updateAssignment = useCallback(
		(
			id,
			{
				personId,
				positionId,
				locationId,
				startDate,
				endDate = "",
				isActive = true,
			},
		) => {
			const current = storeRef.current.assignments;
			const { error } = validateAssignment({
				id,
				personId,
				positionId,
				locationId,
				startDate,
				endDate,
			});

			if (error) return fail(error);

			write(
				"assignments",
				current.map((assignment) =>
					assignment.id === id
						? {
								...assignment,
								personId,
								positionId,
								locationId,
								startDate: clean(startDate),
								endDate: clean(endDate),
								isActive: isActiveFlag(isActive),
						  }
						: assignment,
				),
			);

			return ok();
		},
		[write],
	);

	const deleteAssignment = useCallback(
		(id) => {
			write(
				"assignments",
				storeRef.current.assignments.filter(
					(assignment) => assignment.id !== id,
				),
			);

			return ok();
		},
		[write],
	);

	const value = useMemo(
		() => ({
			locationTypes,
			locations,
			positions,
			people,
			assignments,
			selectors,
			addLocationType,
			updateLocationType,
			deleteLocationType,
			addLocation,
			updateLocation,
			deleteLocation,
			addPosition,
			updatePosition,
			deletePosition,
			addPerson,
			updatePerson,
			deletePerson,
			addAssignment,
			updateAssignment,
			deleteAssignment,
		}),
		[
			locationTypes,
			locations,
			positions,
			people,
			assignments,
			selectors,
			addLocationType,
			updateLocationType,
			deleteLocationType,
			addLocation,
			updateLocation,
			deleteLocation,
			addPosition,
			updatePosition,
			deletePosition,
			addPerson,
			updatePerson,
			deletePerson,
			addAssignment,
			updateAssignment,
			deleteAssignment,
		],
	);

	return (
		<OrganizationContext.Provider value={value}>
			{children}
		</OrganizationContext.Provider>
	);
}

/* True when `childId` sits anywhere below `ancestorId`. */
function isChildOf(allLocations, childId, ancestorId) {
	const seen = new Set();
	const stack = [ancestorId];

	while (stack.length) {
		const id = stack.pop();
		if (!id || seen.has(id)) continue;
		seen.add(id);

		for (const location of allLocations) {
			if (location.parentId === id) {
				if (location.id === childId) return true;
				stack.push(location.id);
			}
		}
	}

	return false;
}

export function useOrganization() {
	const context = useContext(OrganizationContext);

	if (!context) {
		throw new Error(
			"useOrganization must be used inside an OrganizationProvider",
		);
	}

	return context;
}
