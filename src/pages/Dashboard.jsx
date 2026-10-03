import React from "react";
import { ArrowUpRight } from "lucide-react";
import SriLankaMap from "../components/maps/SriLankaMap";
import CountUp from "../components/CountUp";
import { useOrganization } from "../context/OrganizationContext";
import { buildProvinceMemberCounts, matchMapProvinceLabel } from "../data/mapLabels";

function Stat({ label, value, detail }) {
	return (
		<div className="card kpi">
			<span className="tag">{label}</span>
			<b><CountUp value={value} /></b>
			{detail && <span className="mu">{detail}</span>}
		</div>
	);
}

export default function Dashboard({ goMap }) {
	const {
		locationTypes,
		locations,
		positions,
		people,
		assignments,
		selectors,
	} = useOrganization();

	/* Map colours are keyed by the labels painted on the GeoJSON. */
	const counts = buildProvinceMemberCounts(people, selectors);

	const rootLocations = selectors.getRootLocations();

	/* Assignments per top-level location (whole subtree). */
	const bars = rootLocations.map((location) => {
		const subtreeIds = selectors.getLocationSubtreeIds(location.id);
		const count = assignments.filter((assignment) =>
			subtreeIds.includes(assignment.locationId),
		).length;

		return { location, count };
	});

	const maxCount = Math.max(1, ...bars.map((bar) => bar.count));

	const goToProvince = (label) => {
		const match = locations.find(
			(location) => matchMapProvinceLabel(location.name) === label,
		);
		goMap(match?.id || null);
	};

	return (
		<>
			<div>
				<div className="tag">Overview</div>
				<h1>Organization Dashboard</h1>
				<p className="mu lead">
					A live snapshot of your organization — every number updates as
					you add records.
				</p>
			</div>

			<div className="grid k5 stats">
				<Stat label="Total People" value={people.length} detail="in the directory" />
				<Stat label="Total Locations" value={locations.length} detail="configured" />
				<Stat label="Location Types" value={locationTypes.length} detail="configured" />
				<Stat label="Total Positions" value={positions.length} detail="configured" />
				<Stat label="Assignments" value={assignments.length} detail="person · position · location" />
			</div>

			<div className="grid two dashboard-grid">
				<section className="card coverage-card">
					<div className="coverage-heading">
						<div>
							<div className="tag">Geographic Coverage</div>
							<h2>Sri Lanka Organization Network</h2>
							<p className="mu">
								Locations whose names match a map region light it up. The map
								visualizes your data — it is never the source of truth.
							</p>
						</div>
						<span className="province-count">{locations.length} Locations</span>
					</div>
					<SriLankaMap counts={counts} onProvince={goToProvince} />
					<button className="text-action" onClick={() => goMap()}>
						Open Map Explorer <ArrowUpRight size={15} aria-hidden="true" />
					</button>
				</section>

				<div className="stack">
					<section className="card recent-card">
						<h2>Recent Assignments</h2>
						<div className="tw">
							<table>
								<thead>
									<tr><th>Person</th><th>Position</th><th>Location</th></tr>
								</thead>
								<tbody>
									{[...assignments].reverse().slice(0, 6).map((assignment) => {
										const view = selectors.getAssignmentView(assignment);

										return (
											<tr key={assignment.id}>
												<td><b>{view.personName}</b></td>
												<td>{view.positionName}</td>
												<td>
													<span className="loc-path" title={view.pathString}>
														{view.pathString || "—"}
													</span>
												</td>
											</tr>
										);
									})}
									{!assignments.length && (
										<tr>
											<td colSpan="3" className="empty-state">
												No assignments have been created yet.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</section>

					<section className="card">
						<h2>Assignments by Top Location</h2>
						{bars.length ? (
							<div className="bars">
								{bars.map(({ location, count }, index) => (
									<button
										className="bar-row"
										key={location.id}
										onClick={() => goMap(location.id)}
										style={{ "--i": index }}
									>
										<span>{location.name}</span>
										<span className="bar-track">
											<span className="bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
										</span>
										<b>{count}</b>
									</button>
								))}
							</div>
						) : (
							<p className="empty-state">
								No locations have been created yet. Add them in
								Organization Setup.
							</p>
						)}
					</section>
				</div>
			</div>
		</>
	);
}
