import React from "react";
import { ChevronRight, MapPin, Settings2 } from "lucide-react";
import SriLankaMap from "../components/maps/SriLankaMap";
import { useOrganization } from "../context/OrganizationContext";
import { getInitials } from "../data/selectors";
import { buildProvinceMemberCounts, matchMapProvinceLabel } from "../data/mapLabels";

function MapPanel({ selectedProvince, counts, onProvince }) {
	return (
		<div className="card map-card">
			<SriLankaMap
				selectedProvince={selectedProvince}
				counts={counts}
				onProvince={onProvince}
			/>
		</div>
	);
}

function Breadcrumbs({ chain, goMap }) {
	return (
		<nav className="crumbs" aria-label="Map location">
			<button onClick={() => goMap()}>Organization</button>
			{chain.map((location, index) => (
				<React.Fragment key={location.id}>
					<ChevronRight size={14} />
					{index === chain.length - 1 ? (
						<span>{location.name}</span>
					) : (
						<button onClick={() => goMap(location.id)}>{location.name}</button>
					)}
				</React.Fragment>
			))}
		</nav>
	);
}

function PersonCard({ assignment, setSelectedPersonId }) {
	const { selectors } = useOrganization();
	const view = selectors.getAssignmentView(assignment);

	if (!view.person) return null;

	return (
		<button
			className="pc"
			onClick={() => setSelectedPersonId(view.person.id)}
		>
			<div className="av">
				{view.person.photo ? (
					<img src={view.person.photo} alt={view.person.name} />
				) : (
					getInitials(view.person.name)
				)}
			</div>
			<div>
				<b>{view.person.name}</b>
				<small>
					{view.positionName}
					{view.pathString ? ` · ${view.pathString}` : ""}
				</small>
			</div>
		</button>
	);
}

function RootView({ goMap, goSetup }) {
	const { locations, selectors } = useOrganization();

	const rootLocations = selectors.getRootLocations();

	if (!locations.length) {
		return (
			<>
				<div className="tag">Sri Lanka</div>
				<h1>No locations yet</h1>
				<p className="empty-state setup-empty-inline">
					No locations have been configured yet. Create location types and
					locations in Organization Setup to explore the map.
				</p>
				{goSetup && (
					<button type="button" className="btn" onClick={goSetup}>
						<Settings2 size={15} aria-hidden="true" />
						Open Organization Setup
					</button>
				)}
			</>
		);
	}

	return (
		<>
			<Breadcrumbs chain={[]} goMap={goMap} />
			<div className="tag">Sri Lanka</div>
			<h1>Select a location</h1>
			<p className="mu lead">
				Click a top-level location, or choose one from the list.
			</p>
			<div className="lst">
				{rootLocations.map((location) => {
					const subtree = selectors.getLocationSubtreeIds(location.id);
					const subtreeLocationCount = locations.filter((item) =>
						subtree.includes(item.id),
					).length;

					return (
						<button
							className="item"
							onClick={() => goMap(location.id)}
							key={location.id}
						>
							<span>{location.name}</span>
							<span className="mu">
								{selectors
									.getAssignmentsAtLocation(location.id, {
										includeDescendants: true,
									}).length}{" "}
								assignments · {subtreeLocationCount} locations
							</span>
						</button>
					);
				})}
			</div>
		</>
	);
}

function LocationView({ location, goMap, setSelectedPersonId, goSetup }) {
	const { locations, positions, selectors } = useOrganization();

	const path = selectors.getLocationPath(location.id);
	const chain = path.slice(0, -1);
	const type = selectors.getLocationTypeById(location.locationTypeId);

	const children = selectors.getChildLocations(location.id);
	const subtreeIds = selectors.getLocationSubtreeIds(location.id);

	const subtreePeople = new Set(
		selectors
			.getAssignmentsAtLocation(location.id, {
				includeDescendants: true,
			})
			.map((assignment) => assignment.personId),
	).size;

	const directAssignments = selectors.getAssignmentsAtLocation(location.id);
	const positionsUsed = new Set(
		directAssignments.map((assignment) => assignment.positionId),
	).size;

	/* Group the people at this location by position. */
	const groups = positions
		.map((position) => ({
			position,
			assignments: directAssignments.filter(
				(assignment) => assignment.positionId === position.id,
			),
		}))
		.filter((group) => group.assignments.length);

	const unlisted = directAssignments.filter(
		(assignment) => !positions.some((p) => p.id === assignment.positionId),
	);

	return (
		<>
			<Breadcrumbs chain={path} goMap={goMap} />
			<div className="tag">
				{type?.name || "Location"}
				{chain.length ? ` · ${chain.map((item) => item.name).join(" / ")}` : ""}
			</div>
			<h1>{location.name}</h1>

			<div className="grid k4 map-stats">
				<div className="card kpi">
					<span className="tag">Child Locations</span>
					<b>{children.length}</b>
				</div>
				<div className="card kpi">
					<span className="tag">People</span>
					<b>{subtreePeople}</b>
				</div>
				<div className="card kpi">
					<span className="tag">Assignments</span>
					<b>{directAssignments.length}</b>
				</div>
				<div className="card kpi">
					<span className="tag">Positions</span>
					<b>{positionsUsed}</b>
				</div>
			</div>

			<h2>Child Locations</h2>
			{children.length ? (
				<div className="lst">
					{children.map((child) => {
						const childSubtree = selectors.getLocationSubtreeIds(child.id);
						const childLocationCount = locations.filter((item) =>
							childSubtree.includes(item.id),
						).length;

						return (
							<button
								className="item"
								onClick={() => goMap(child.id)}
								key={child.id}
							>
								<span>{child.name}</span>
								<span className="mu">
									{selectors.getLocationTypeById(child.locationTypeId)?.name ||
										"Location"}{" "}
									· {childLocationCount} locations
								</span>
							</button>
						);
					})}
				</div>
			) : (
				<p className="empty-state setup-empty-inline">
					No child locations have been added here yet.
				</p>
			)}

			<h2 className="section-title">People at this location</h2>
			{directAssignments.length ? (
				groups.map((group) => (
					<section key={group.position.id}>
						<div className="tag role">{group.position.name}</div>
						<div className="row">
							{group.assignments.map((assignment) => (
								<PersonCard
									key={assignment.id}
									assignment={assignment}
									setSelectedPersonId={setSelectedPersonId}
								/>
							))}
						</div>
					</section>
				))
			) : (
				<p className="empty-state setup-empty-inline">
					No assignments exist at this location yet.
				</p>
			)}

			{unlisted.length > 0 && (
				<section>
					<div className="tag role">Other</div>
					<div className="row">
						{unlisted.map((assignment) => (
							<PersonCard
								key={assignment.id}
								assignment={assignment}
								setSelectedPersonId={setSelectedPersonId}
							/>
						))}
					</div>
				</section>
			)}

			{subtreeIds.length === 1 && !directAssignments.length && goSetup && (
				<p className="mu setup-empty-inline">
					Assign people to this location from the Assignments page.
				</p>
			)}
		</>
	);
}

export default function MapExplorer({
	nav,
	goMap,
	setSelectedPersonId,
	goSetup,
}) {
	const { locations, people, selectors } = useOrganization();

	const locationId = nav?.locationId || null;
	const location = locationId
		? selectors.getLocationById(locationId)
		: null;

	/* Keep the map highlighted for whichever map area the path touches. */
	const selectedLabel = location
		? selectors
				.getLocationPathNames(location.id)
				.map((name) => matchMapProvinceLabel(name))
				.find(Boolean) || null
		: null;

	const counts = buildProvinceMemberCounts(people, selectors);

	const handleProvinceClick = (label) => {
		const match = locations.find(
			(item) => matchMapProvinceLabel(item.name) === label,
		);

		goMap(match?.id || null);
	};

	const content = location ? (
		<LocationView
			location={location}
			goMap={goMap}
			setSelectedPersonId={setSelectedPersonId}
			goSetup={goSetup}
		/>
	) : (
		<RootView goMap={goMap} goSetup={goSetup} />
	);

	// The map lives OUTSIDE the changing content, so it stays mounted
	// (no re-animation) while you drill down through the hierarchy.
	return (
		<div className="grid map-layout">
			<MapPanel
				selectedProvince={selectedLabel}
				counts={counts}
				onProvince={handleProvinceClick}
			/>
			<div className="map-side" key={locationId || "root"}>
				{content}
			</div>
		</div>
	);
}
