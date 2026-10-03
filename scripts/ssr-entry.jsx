/*
 * Server-side render smoke test: renders every page with an EMPTY
 * organization store to prove nothing crashes and the expected
 * empty states are shown.
 * Run with: node scripts/ssr-run.mjs
 */

import React from "react";
import { renderToString } from "react-dom/server";

import App from "../src/App.jsx";
import { OrganizationProvider } from "../src/context/OrganizationContext.jsx";
import Dashboard from "../src/pages/Dashboard.jsx";
import MapExplorer from "../src/pages/MapExplorer.jsx";
import People from "../src/pages/People.jsx";
import AddPerson from "../src/pages/AddPerson.jsx";
import Assignments from "../src/pages/Assignments.jsx";
import OrganizationSetup from "../src/pages/OrganizationSetup.jsx";
import PoliticalHierarchy from "../src/pages/PoliticalHierarchy.jsx";
import PersonProfile from "../src/pages/PersonProfile.jsx";
import Drawer from "../src/components/Drawer.jsx";

const noop = () => {};

const wrap = (element) =>
	renderToString(<OrganizationProvider>{element}</OrganizationProvider>);

export function runSmoke() {
	const results = [];
	let failed = 0;

	const check = (label, condition, extra = "") => {
		if (condition) {
			results.push(`PASS  ${label}`);
		} else {
			failed += 1;
			results.push(`FAIL  ${label}${extra ? ` -> ${extra}` : ""}`);
		}
	};

	const render = (label, element) => {
		try {
			const html = wrap(element);
			check(`${label} renders`, typeof html === "string" && html.length > 0);
			return html;
		} catch (error) {
			failed += 1;
			results.push(`FAIL  ${label} threw -> ${error.message}`);
			return "";
		}
	};

	/* ---------- Full app (initial dashboard view) ---------- */
	const appHtml = render("App", <App />);
	check("dashboard shows Total People", appHtml.includes("Total People"));
	check(
		"dashboard shows all five stats",
		appHtml.includes("Total Locations") &&
			appHtml.includes("Location Types") &&
			appHtml.includes("Total Positions") &&
			appHtml.includes("Assignments"),
	);
	check(
		"dashboard empty assignments table",
		appHtml.includes("No assignments have been created yet."),
	);

	/* ---------- Individual pages ---------- */
	const dashboardHtml = render(
		"Dashboard",
		<Dashboard goMap={noop} />,
	);
	check(
		"dashboard bar chart empty state",
		dashboardHtml.includes(
			"No locations have been created yet. Add them in",
		),
	);

	const mapRootHtml = render(
		"MapExplorer (root)",
		<MapExplorer
			nav={{}}
			goMap={noop}
			setSelectedPersonId={noop}
			goSetup={noop}
		/>,
	);
	check(
		"map empty state",
		mapRootHtml.includes("No locations have been configured yet."),
	);

	const mapDrillHtml = render(
		"MapExplorer (unknown location)",
		<MapExplorer
			nav={{ locationId: "loc-999" }}
			goMap={noop}
			setSelectedPersonId={noop}
			goSetup={noop}
		/>,
	);
	check(
		"map falls back to root for unknown location",
		mapDrillHtml.includes("No locations have been configured yet."),
	);

	const peopleHtml = render(
		"People",
		<People
			people={[]}
			query=""
			setQuery={noop}
			onAdd={noop}
			setSelectedPersonId={noop}
			removePerson={noop}
		/>,
	);
	check(
		"people empty state",
		peopleHtml.includes("No people have been added yet."),
	);

	render("AddPerson", <AddPerson notify={noop} onDone={noop} />);

	const assignmentsHtml = render(
		"Assignments",
		<Assignments notify={noop} goSetup={noop} />,
	);
	check(
		"assignments empty state",
		assignmentsHtml.includes("No assignments have been created yet."),
	);

	const setupHtml = render(
		"OrganizationSetup",
		<OrganizationSetup notify={noop} />,
	);
	check(
		"location types empty state",
		setupHtml.includes("No location types have been created yet."),
	);

	
	check(
		"hierarchy empty state",
		hierarchyHtml.includes("No locations have been created yet."),
	);

	const profileMissingHtml = render(
		"PersonProfile (missing person)",
		<PersonProfile person={undefined} onBack={noop} />,
	);
	check(
		"profile missing state",
		profileMissingHtml.includes("Person not found"),
	);

	const profileHtml = render(
		"PersonProfile (person without assignments)",
		<PersonProfile
			person={{
				id: "person-1",
				name: "John",
				phone: "",
				email: "",
				status: "Active",
			}}
			onBack={noop}
		/>,
	);
	check(
		"profile shows no-assignment states",
		profileHtml.includes("No assignment yet") &&
			profileHtml.includes("No assignments yet"),
	);

	const drawerHtml = render(
		"Drawer (open)",
		<Drawer
			person={{ id: "person-1", name: "John", status: "Active" }}
			onClose={noop}
			goMap={noop}
			onRemove={noop}
			onViewProfile={noop}
		/>,
	);
	check("drawer shows no-assignment fallback", drawerHtml.includes("None yet"));

	const drawerClosed = wrap(
		<Drawer person={null} onClose={noop} goMap={noop} />,
	);
	check("drawer closed renders nothing", drawerClosed.trim().length === 0);

	return { results, failed };
}
