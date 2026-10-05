/*
 * Bridge between the generic (user-created) location system and the
 * Sri Lanka map visualization.
 *
 * The map is a VISUALIZATION of the organization, never the source of
 * truth. A location simply "corresponds" to a map area when its name
 * matches a province label painted on the GeoJSON (for example a
 * location called "Western Province" lights up the Western region).
 *
 * Nothing here is organizational data — the labels come from the
 * existing GeoJSON file that drives the map artwork.
 */

import sriLankaProvinces from "./sriLankaProvincesGeo.js";

const stripProvince = (value = "") =>
	String(value)
		.toLowerCase()
		.replace(/\s*province$/i, "")
		.replace(/\s+/g, " ")
		.trim();

/* Display labels used by the map, e.g. "Western", "North Western". */
export const MAP_PROVINCE_LABELS = (sriLankaProvinces.features || [])
	.map((feature) => String(feature?.properties?.province_name || "").trim())
	.filter(Boolean);

/* Returns the map label a location name corresponds to, or null. */
export const matchMapProvinceLabel = (name) => {
	const key = stripProvince(name);
	if (!key) return null;

	return (
		MAP_PROVINCE_LABELS.find((label) => stripProvince(label) === key) ||
		null
	);
};

/*
 * Colors the map by counting people whose assignment paths touch a
 * map-supported area. Keys must be the map's own display labels.
 */
export const buildProvinceMemberCounts = (people = [], selectors = {}) => {
	const counts = {};
	const getAssignmentsForPerson = selectors.getAssignmentsForPerson?.bind(selectors);
	const getLocationPathNames = selectors.getLocationPathNames?.bind(selectors);

	if (!getAssignmentsForPerson || !getLocationPathNames) {
		return counts;
	}

	people.forEach((person) => {
		const labels = new Set();

		getAssignmentsForPerson(person.id).forEach((assignment) => {
			getLocationPathNames(assignment.locationId).forEach((name) => {
				const label = matchMapProvinceLabel(name);
				if (label) labels.add(label);
			});
		});

		labels.forEach((label) => {
			counts[label] = (counts[label] || 0) + 1;
		});
	});

	return counts;
};
