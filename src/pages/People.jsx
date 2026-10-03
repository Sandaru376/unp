import React from "react";
import { Search, Trash2, UserPlus } from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";

export default function People({
	people,
	query,
	setQuery,
	onAdd,
	setSelectedPersonId,
	removePerson,
}) {
	const { selectors } = useOrganization();

	const normalizedQuery = query.trim().toLowerCase();

	const filtered = people.filter((person) =>
		selectors.getPersonSearchText(person).includes(normalizedQuery),
	);

	return (
		<>
			<div className="tag">Directory</div>
			<h1>People</h1>
			<p className="mu lead">
				Everyone in the organization. Position and location come from
				their assignments.
			</p>

			<div className="searchbar">
				<Search size={18} aria-hidden="true" />
				<input
					aria-label="Search people"
					placeholder="Search name, position, location, hierarchy or status…"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<button className="btn" onClick={onAdd}>
					+ Add Person
				</button>
			</div>

			<div className="card tw">
				<table>
					<thead>
						<tr>
							<th>Person</th>
							<th>Position</th>
							<th>Location</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((person) => {
							const location = selectors.getPersonLocation(person);
							const assignmentCount = selectors.getAssignmentsForPerson(
								person.id,
							).length;

							return (
								<tr key={person.id}>
									<td>
										{person.photo && (
											<img
												className="row-photo"
												src={person.photo}
												alt=""
											/>
										)}
										<b>{person.name}</b>
										{person.email && (
											<span className="loc-path">{person.email}</span>
										)}
									</td>
									<td>
										{location.positionName || "–"}
										{assignmentCount > 1 && (
											<span className="loc-path">
												+{assignmentCount - 1} more assignment
												{assignmentCount - 1 > 1 ? "s" : ""}
											</span>
										)}
									</td>
									<td>
										{location.locationName ? (
											<>
												<b>{location.locationName}</b>
												{location.pathNames.length > 1 && (
													<span className="loc-path" title={location.pathString}>
														{location.pathString}
													</span>
												)}
											</>
										) : (
											"–"
										)}
									</td>
									<td>
										<span className="bd">{person.status || "Active"}</span>
									</td>
									<td className="table-actions">
										<button
											className="btn sm o"
											onClick={() => setSelectedPersonId(person.id)}
										>
											View
										</button>
										<button
											className="btn sm o icon-action"
											aria-label={`Remove ${person.name}`}
											onClick={() => removePerson(person.id)}
										>
											<Trash2 size={14} />
										</button>
									</td>
								</tr>
							);
						})}

						{!filtered.length && (
							<tr>
								<td colSpan="5" className="empty-state">
									<div className="setup-empty">
										<UserPlus size={26} aria-hidden="true" />
										<b>
											{people.length
												? "No matching people."
												: "No people have been added yet."}
										</b>
										<span className="mu">
											{people.length
												? "Try a different search."
												: "Add your first person to get started."}
										</span>
										{!people.length && (
											<button type="button" className="btn sm" onClick={onAdd}>
												<UserPlus size={15} aria-hidden="true" />
												Add Person
											</button>
										)}
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</>
	);
}
