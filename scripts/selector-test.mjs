/*
 * Pure selector checks for the demo flow described in the task
 * (Location Types -> Locations -> Positions -> People -> Assignments).
 * Run with: node scripts/selector-test.mjs
 */

import {
	createSelectors,
} from "../src/data/selectors.js";
import {
	matchMapProvinceLabel,
	buildProvinceMemberCounts,
} from "../src/data/mapLabels.js";

let passed = 0;
let failed = 0;

const check = (label, condition, extra = "") => {
	if (condition) {
		passed += 1;
		console.log(`PASS  ${label}`);
	} else {
		failed += 1;
		console.log(`FAIL  ${label}${extra ? ` -> ${extra}` : ""}`);
	}
};

const locationTypes = [
	{ id: "loc-type-1", name: "Province", description: "", isActive: true },
	{ id: "loc-type-2", name: "District", description: "", isActive: true },
	{ id: "loc-type-3", name: "Area", description: "", isActive: true },
];

const locations = [
	{ id: "loc-1", name: "Western Province", locationTypeId: "loc-type-1", parentId: null, isActive: true },
	{ id: "loc-2", name: "Colombo", locationTypeId: "loc-type-2", parentId: "loc-1", isActive: true },
	{ id: "loc-3", name: "Kaduwela", locationTypeId: "loc-type-3", parentId: "loc-2", isActive: true },
	{ id: "loc-4", name: "Borella", locationTypeId: "loc-type-3", parentId: "loc-2", isActive: true },
	{ id: "loc-5", name: "Maradana", locationTypeId: "loc-type-3", parentId: "loc-2", isActive: true },
];

const positions = [
	{ id: "pos-1", name: "District Coordinator", description: "", isActive: true },
	{ id: "pos-2", name: "Area Coordinator", description: "", isActive: true },
];

const people = [
	{ id: "person-1", name: "John", phone: "", email: "", status: "Active" },
	{ id: "person-2", name: "David", phone: "", email: "", status: "Active" },
	{ id: "person-3", name: "Peter", phone: "", email: "", status: "Active" },
];

const assignments = [
	{ id: "assignment-1", personId: "person-1", positionId: "pos-1", locationId: "loc-2", startDate: "2026-01-01", endDate: "", isActive: true },
	{ id: "assignment-2", personId: "person-2", positionId: "pos-2", locationId: "loc-3", startDate: "2026-01-01", endDate: "", isActive: true },
	{ id: "assignment-3", personId: "person-3", positionId: "pos-2", locationId: "loc-4", startDate: "2026-01-01", endDate: "", isActive: true },
	{ id: "assignment-4", personId: "person-1", positionId: "pos-2", locationId: "loc-3", startDate: "2026-02-01", endDate: "", isActive: true },
];

const s = createSelectors({
	locationTypes,
	locations,
	positions,
	people,
	assignments,
});

/* 1. Location paths are built only from parentId. */
check(
	"getLocationPathNames(Kaduwela)",
	JSON.stringify(s.getLocationPathNames("loc-3")) ===
		JSON.stringify(["Western Province", "Colombo", "Kaduwela"]),
	JSON.stringify(s.getLocationPathNames("loc-3")),
);

check(
	"getLocationPathString(Borella)",
	s.getLocationPathString("loc-4") === "Western Province / Colombo / Borella",
	s.getLocationPathString("loc-4"),
);

check(
	"root locations",
	s.getRootLocations().length === 1 &&
		s.getRootLocations()[0].id === "loc-1",
);

check(
	"children of Colombo",
	JSON.stringify(s.getChildLocations("loc-2").map((l) => l.name)) ===
		JSON.stringify(["Kaduwela", "Borella", "Maradana"]),
);

check(
	"locations by type (Area)",
	s.getLocationsByType("loc-type-3").length === 3,
);

check(
	"subtree of Western Province covers all 5 locations",
	s.getLocationSubtreeIds("loc-1").length === 5,
);

check(
	"isDescendantOf(Kaduwela, Western Province)",
	s.isDescendantOf("loc-3", "loc-1") === true,
);

check(
	"isDescendantOf(Western Province, Kaduwela) is false",
	s.isDescendantOf("loc-1", "loc-3") === false,
);

/* 2. Multiple assignments per person are kept separately. */
check(
	"John has 2 assignments",
	s.getAssignmentsForPerson("person-1").length === 2,
);

check(
	"primary assignment prefers active first record",
	s.getPersonPrimaryAssignment(people[0]).id === "assignment-1",
);

/* 3. People/assignment lookups. */
check(
	"people at Kaduwela (David and John)",
	s.getPeopleAtLocation("loc-3").length === 2 &&
		s.getPeopleAtLocation("loc-3").some((p) => p.name === "David") &&
		s.getPeopleAtLocation("loc-3").some((p) => p.name === "John"),
	s.getPeopleAtLocation("loc-3").map((p) => p.name).join(","),
);

check(
	"assignments at Colombo include descendants",
	s.getAssignmentsAtLocation("loc-2", { includeDescendants: true }).length === 4,
);

check(
	"direct assignments at Colombo",
	s.getAssignmentsAtLocation("loc-2").length === 1,
);

/* 4. Person display + search text. */
const davidLocation = s.getPersonLocation(people[1]);
check(
	"David resolves position + hierarchy",
	davidLocation.positionName === "Area Coordinator" &&
		davidLocation.pathString === "Western Province / Colombo / Kaduwela",
	JSON.stringify(davidLocation),
);

const johnSearch = s.getPersonSearchText(people[0]);
check(
	"search finds John by position",
	johnSearch.includes("district coordinator"),
	johnSearch,
);
check(
	"search finds John by location hierarchy",
	johnSearch.includes("western province / colombo"),
	johnSearch,
);

const assignmentView = s.getAssignmentView(assignments[1]);
check(
	"assignment view resolves all three sides",
	assignmentView.personName === "David" &&
		assignmentView.positionName === "Area Coordinator" &&
		assignmentView.pathString === "Western Province / Colombo / Kaduwela",
);

/* 5. Map bridge (map is only a visualization). */
check(
	'matchMapProvinceLabel("Western Province")',
	matchMapProvinceLabel("Western Province") === "Western",
);
check(
	'matchMapProvinceLabel("Kaduwela") is null',
	matchMapProvinceLabel("Kaduwela") === null,
);

const counts = buildProvinceMemberCounts(people, s);
check(
	"province member counts key on map labels",
	counts.Western === 3,
	JSON.stringify(counts),
);

/* 6. Empty data never crashes. */
const empty = createSelectors({});
check(
	"empty selectors: root locations",
	empty.getRootLocations().length === 0,
);
check(
	"empty selectors: path names",
	JSON.stringify(empty.getLocationPathNames("missing")) === "[]",
);
check(
	"empty selectors: person search text",
	empty.getPersonSearchText({ id: "x", name: "Nobody" }).includes("nobody"),
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
