/*
 * Pure selector helpers over the normalized organization data.
 *
 * Every function takes plain data (or is bound through
 * createSelectors) so the same helpers can be reused once the
 * local demo state is replaced by API responses later.
 *
 * Data shape:
 *   locationType: { id, name, description, isActive }
 *   location:      { id, name, locationTypeId, parentId, isActive }
 *   position:      { id, name, description, isActive }
 *   person:        { id, name, phone, email, status, createdAt, updatedAt }
 *   assignment:    { id, personId, positionId, locationId, startDate, endDate, isActive }
 */

export const normalizeKey = (value = "") =>
	String(value)
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

export const getInitials = (name = "") =>
	String(name)
		.replace(/\(.*\)/, "")
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0])
		.join("")
		.toUpperCase();

const isRootParent = (value) =>
	value === null || value === undefined || value === "";

export const createSelectors = (data) => {
	const {
		locationTypes = [],
		locations = [],
		positions = [],
		people = [],
		assignments = [],
	} = data || {};

	/* ---------------- Basic lookups ---------------- */

	const getLocationTypeById = (id) =>
		locationTypes.find((type) => type.id === id) || null;

	const getLocationById = (id) =>
		locations.find((location) => location.id === id) || null;

	const getPositionById = (id) =>
		positions.find((position) => position.id === id) || null;

	const getPersonById = (id) =>
		people.find((person) => person.id === id) || null;

	/* ---------------- Location hierarchy ---------------- */

	const getChildLocations = (parentId) =>
		locations.filter((location) =>
			isRootParent(parentId)
				? isRootParent(location.parentId)
				: location.parentId === parentId,
		);

	const getRootLocations = () => getChildLocations(null);

	const getLocationsByType = (locationTypeId) =>
		locations.filter(
			(location) => location.locationTypeId === locationTypeId,
		);

	/*
	 * Root -> leaf chain for one location, built only from parentId.
	 * A "seen" guard keeps broken/cyclic data from looping forever.
	 */
	const getLocationPath = (locationId) => {
		const path = [];
		const seen = new Set();
		let current = getLocationById(locationId);

		while (current && !seen.has(current.id)) {
			seen.add(current.id);
			path.unshift(current);
			current = isRootParent(current.parentId)
				? null
				: getLocationById(current.parentId);
		}

		return path;
	};

	const getLocationPathNames = (locationId) =>
		getLocationPath(locationId).map((location) => location.name);

	const getLocationPathString = (locationId, separator = " / ") =>
		getLocationPathNames(locationId).join(separator);

	/* Self + every descendant (iterative, cycle safe). */
	const getLocationSubtreeIds = (locationId) => {
		const result = [];
		const seen = new Set();
		const stack = [locationId];

		while (stack.length) {
			const id = stack.pop();
			if (!id || seen.has(id)) continue;
			seen.add(id);
			result.push(id);

			getChildLocations(id).forEach((child) => stack.push(child.id));
		}

		return result;
	};

	const isDescendantOf = (candidateId, ancestorId) => {
		if (!candidateId || !ancestorId) return false;
		return getLocationSubtreeIds(ancestorId).includes(candidateId);
	};

	/* ---------------- Assignments ---------------- */

	const getAssignmentsForPerson = (personId) =>
		assignments.filter((assignment) => assignment.personId === personId);

	const getActiveAssignmentsForPerson = (personId) =>
		getAssignmentsForPerson(personId).filter(
			(assignment) => assignment.isActive !== false,
		);

	const getPersonPrimaryAssignment = (person) => {
		if (!person) return null;

		const list = getAssignmentsForPerson(person.id);

		return (
			list.find((assignment) => assignment.isActive !== false) ||
			list[0] ||
			null
		);
	};

	const getAssignmentsAtLocation = (
		locationId,
		{ includeDescendants = false } = {},
	) => {
		if (includeDescendants) {
			const ids = new Set(getLocationSubtreeIds(locationId));
			return assignments.filter((assignment) =>
				ids.has(assignment.locationId),
			);
		}

		return assignments.filter(
			(assignment) => assignment.locationId === locationId,
		);
	};

	const getPeopleAtLocation = (locationId, options) => {
		const ids = new Set(
			getAssignmentsAtLocation(locationId, options).map(
				(assignment) => assignment.personId,
			),
		);

		return people.filter((person) => ids.has(person.id));
	};

	/* Flattened view used by tables, the drawer and the hierarchy. */
	const getAssignmentView = (assignment) => {
		const person = getPersonById(assignment.personId);
		const position = getPositionById(assignment.positionId);
		const location = getLocationById(assignment.locationId);
		const pathNames = location
			? getLocationPathNames(location.id)
			: [];

		return {
			assignment,
			person,
			position,
			location,
			personName: person?.name || "—",
			positionName: position?.name || "—",
			locationName: location?.name || "—",
			pathNames,
			pathString: pathNames.join(" / "),
		};
	};

	/* ---------------- Person display helpers ---------------- */

	/*
	 * Resolves every display name a person needs from the
	 * relational ids stored on their assignment records.
	 */
	const getPersonLocation = (person) => {
		const primary = getPersonPrimaryAssignment(person);
		const position = primary ? getPositionById(primary.positionId) : null;
		const location = primary
			? getLocationById(primary.locationId)
			: null;
		const pathNames = location
			? getLocationPathNames(location.id)
			: [];

		return {
			assignment: primary,
			positionId: position?.id || null,
			locationId: location?.id || null,
			positionName: position?.name || "",
			locationName: location?.name || "",
			locationTypeName: location
				? getLocationTypeById(location.locationTypeId)?.name || ""
				: "",
			pathNames,
			pathString: pathNames.join(" / "),
		};
	};

	/* Flat search text used by the People directory and hierarchy filters. */
	const getPersonSearchText = (person) => {
		const own = getPersonLocation(person);

		const assignmentText = getAssignmentsForPerson(person?.id).flatMap(
			(assignment) => {
				const view = getAssignmentView(assignment);
				return [
					view.positionName,
					view.locationName,
					view.pathString,
					getLocationById(assignment.locationId)
						? getLocationTypeById(
								getLocationById(assignment.locationId)
									.locationTypeId,
							)?.name
						: "",
				];
			},
		);

		return [
			person?.name,
			person?.phone,
			person?.email,
			person?.status,
			own.positionName,
			own.pathString,
			...assignmentText,
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
	};

	return {
		getLocationTypeById,
		getLocationById,
		getPositionById,
		getPersonById,
		getChildLocations,
		getRootLocations,
		getLocationsByType,
		getLocationPath,
		getLocationPathNames,
		getLocationPathString,
		getLocationSubtreeIds,
		isDescendantOf,
		getAssignmentsForPerson,
		getActiveAssignmentsForPerson,
		getPersonPrimaryAssignment,
		getAssignmentsAtLocation,
		getPeopleAtLocation,
		getAssignmentView,
		getPersonLocation,
		getPersonSearchText,
	};
};
