/*
 * End-to-end interaction test (spec item 31) driven through jsdom.
 * Builds the real app with Vite, mounts it in jsdom and clicks through:
 *   location types -> locations -> positions -> people -> assignments
 *   -> page displays -> edits -> delete validation -> fresh state.
 * Run with: node scripts/ui-run.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.join(root, "node_modules", ".ui-smoke");

/* ------------------------------------------------------------------ build */

await build({
	configFile: false,
	root,
	logLevel: "error",
	plugins: [react()],
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
	build: {
		lib: {
			entry: path.join(here, "ui-entry.jsx"),
			formats: ["es"],
			fileName: () => "ui.mjs",
		},
		outDir,
		emptyOutDir: true,
		minify: false,
		cssCodeSplit: false,
		rollupOptions: { output: {} },
	},
});

const bundlePath = path.join(outDir, "ui.mjs");
let bundle = fs.readFileSync(bundlePath, "utf8");
bundle = bundle.replace(/^import\s+"[^"]*\.css";?\s*$/gm, "");
fs.writeFileSync(bundlePath, bundle);

/* ------------------------------------------------------------------ jsdom */

const virtualConsole = new VirtualConsole();
const domErrors = [];
virtualConsole.on("jsdomError", (error) => {
	const message = String(error?.message ?? error);
	if (!/Not implemented|Could not parse CSS/i.test(message)) {
		domErrors.push(message);
	}
});

const dom = new JSDOM(
	`<!doctype html><html><body><div id="root"></div></body></html>`,
	{
		url: "http://localhost/",
		pretendToBeVisual: true,
		runScripts: "outside-only",
		virtualConsole,
	},
);

const g = globalThis;
g.window = dom.window;
g.document = dom.window.document;
try {
	Object.defineProperty(g, "navigator", {
		value: dom.window.navigator,
		configurable: true,
		writable: true,
	});
} catch {
	/* Node exposes a read-only navigator; jsdom's is equivalent enough. */
}
for (const key of [
	"HTMLElement",
	"HTMLInputElement",
	"HTMLSelectElement",
	"HTMLTextAreaElement",
	"Element",
	"Node",
	"Event",
	"CustomEvent",
	"MouseEvent",
	"KeyboardEvent",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"localStorage",
	"sessionStorage",
	"FileReader",
	"Image",
]) {
	if (dom.window[key] !== undefined && g[key] === undefined) {
		g[key] = dom.window[key];
	}
}

const mod = await import(pathToFileURL(bundlePath).href);

/* ---------------------------------------------------------------- helpers */

const results = [];
let failed = 0;

const check = (label, condition, extra = "") => {
	if (condition) results.push(`PASS  ${label}`);
	else {
		failed += 1;
		results.push(`FAIL  ${label}${extra ? ` -> ${extra}` : ""}`);
	}
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flush = async (ms = 40) => sleep(ms);

const waitFor = async (fn, timeout = 5000, interval = 100) => {
	const start = Date.now();
	let last = "";
	while (Date.now() - start < timeout) {
		try {
			const value = fn();
			if (value) return value;
			last = String(value);
		} catch (error) {
			last = error.message;
		}
		await sleep(interval);
	}
	return last ? { timeout: last } : false;
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const norm = (text) => text.replace(/\s+/g, " ").trim();

const text = () => norm(document.body.textContent);

const find = (sel, match) =>
	$$(sel).find((el) => norm(el.textContent).includes(match));

const click = async (el) => {
	if (!el) throw new Error("click target not found");
	el.dispatchEvent(
		new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }),
	);
	await flush();
};

const setValue = async (el, value) => {
	const proto =
		el.tagName === "SELECT"
			? dom.window.HTMLSelectElement.prototype
			: dom.window.HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
	el.dispatchEvent(
		new dom.window.Event(el.tagName === "SELECT" ? "change" : "input", {
			bubbles: true,
		}),
	);
	await flush();
};

const submit = async (form) => {
	form.dispatchEvent(
		new dom.window.Event("submit", { bubbles: true, cancelable: true }),
	);
	await flush();
};

const navigate = async (label) => {
	const btn = $$("aside .nav").find((b) => norm(b.textContent).includes(label));
	await click(btn);
};

const tab = async (label) => {
	await click(find(".setup-tab", label));
};

const fillForm = async (fields) => {
	const form = $("form.setup-form");
	if (!form) throw new Error("setup form not found");
	for (const [id, value] of Object.entries(fields)) {
		const el = form.querySelector(`#${id}`);
		if (!el) throw new Error(`field #${id} not found`);
		await setValue(el, value);
	}
	await submit(form);
	return form;
};

const optionValue = (select, label) =>
	[...select.options].find((o) => norm(o.textContent) === label)?.value;

const kpis = () => $$(".kpi b").map((el) => norm(el.textContent));

const errorLine = () => norm($(".setup-error")?.textContent ?? "");

const PNG_DATA_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const makePhotoFile = () => {
	const bytes = Uint8Array.from(
		Buffer.from(PNG_DATA_URL.split(",")[1], "base64"),
	);
	return new dom.window.File([bytes], "photo.png", { type: "image/png" });
};

const pickPhoto = async () => {
	const input = $("#person-photo");
	if (!input) return "photo input not found";
	Object.defineProperty(input, "files", {
		value: [makePhotoFile()],
		configurable: true,
	});
	input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
	const picked = await waitFor(() => Boolean($(".photo-preview img")), 3000);
	if (picked === true) return true;
	return `preview missing · files=${input.files?.length} · form-error="${errorLine()}"`;
};

/* ------------------------------------------------------------------- run */

const container = $("#root");
const appRoot = mod.mount(container);
await flush(120);

try {
	/* 1. initial dashboard, all counters zero */
	check("app boots to dashboard", text().includes("Organization Dashboard"));
	check(
		"all dashboard counters start at 0",
		kpis().length === 5 && kpis().every((v) => v === "0"),
		kpis().join(","),
	);
	check(
		"map renders with empty data",
		document.querySelectorAll("svg.sri-lanka-map, .sri-lanka-map").length > 0,
	);

	/* 2. create location types */
	await navigate("Organization Setup");
	await tab("Location Types");

	for (const [name, description] of [
		["Province", "Province-level region"],
		["District", "District-level region"],
		["Area", "Area-level region"],
	]) {
		await fillForm({
			"location-type-name": name,
			"location-type-description": description,
		});
		check(`location type "${name}" added`, text().includes(name));
	}

	/* 3. create hierarchical locations */
	await tab("Locations");

	await fillForm({
		"location-name": "Western Province",
		"location-type": optionValue($("#location-type"), "Province"),
	});
	check(
		"root location added",
		!!$(".loc-tree") && $(".loc-tree").textContent.includes("Western Province"),
	);

	await fillForm({
		"location-name": "Colombo",
		"location-type": optionValue($("#location-type"), "District"),
		"location-parent": optionValue($("#location-parent"), "Western Province"),
	});

	for (const name of ["Kaduwela", "Borella"]) {
		await fillForm({
			"location-name": name,
			"location-type": optionValue($("#location-type"), "Area"),
			"location-parent": optionValue(
				$("#location-parent"),
				"Western Province / Colombo",
			),
		});
	}

	check(
		"all four locations exist",
		$$(".loc-row").length >= 4,
		String($$(".loc-row").length),
	);
	check(
		"nested child nodes rendered",
		$$(".loc-node .loc-node").length >= 3,
		String($$(".loc-node").length),
	);

	/* 4. create positions */
	await tab("Positions");
	for (const name of ["District Coordinator", "Area Coordinator"]) {
		await fillForm({ "position-name": name, "position-description": "" });
		check(`position "${name}" added`, text().includes(name));
	}

	/* 5. create people (John gets a photo) */
	const addPerson = async (name, email, withPhoto = false) => {
		await navigate("People");
		if (!$("form.setup-form")) {
			await click(find("button", "+ Add Person"));
			await flush();
		}
		if (withPhoto) {
			const picked = await pickPhoto();
			check("photo preview appears after upload", picked === true, String(picked));
		}
		await fillForm({ "person-name": name, "person-email": email });
	};

	await addPerson("John Doe", "john@example.com", true);
	await addPerson("David Perera", "david@example.com");
	check("people list shows John", text().includes("John Doe"));
	check("people list shows David", text().includes("David Perera"));
	check("John's row shows a photo", Boolean($(".card.tw .row-photo")));

	/* 6. create assignments */
	await navigate("Assignments");
	await click(find("button", "Create Assignment"));
	await flush();
	await fillForm({
		"assignment-person": optionValue($("#assignment-person"), "John Doe"),
		"assignment-position": optionValue(
			$("#assignment-position"),
			"District Coordinator",
		),
		"assignment-location": optionValue(
			$("#assignment-location"),
			"Western Province / Colombo",
		),
	});
	check(
		"John assignment row rendered",
		$(".card.tw")?.textContent.includes("District Coordinator"),
	);

	await click(find("button", "Create Assignment"));
	await flush();
	await fillForm({
		"assignment-person": optionValue($("#assignment-person"), "David Perera"),
		"assignment-position": optionValue(
			$("#assignment-position"),
			"Area Coordinator",
		),
		"assignment-location": optionValue(
			$("#assignment-location"),
			"Western Province / Colombo / Kaduwela",
		),
	});

	const tableText = () => norm($(".card.tw")?.textContent ?? "");
	check(
		"both assignments listed with paths",
		tableText().includes("John Doe") &&
			tableText().includes("David Perera") &&
			tableText().includes("Western Province / Colombo / Kaduwela"),
		tableText().slice(0, 200),
	);

	/* 7. people page shows position + hierarchical location */
	await navigate("People");
	const peopleText = () => norm($(".card.tw")?.textContent ?? "");
	check(
		"John shows position and location",
		peopleText().includes("John Doe") &&
			peopleText().includes("District Coordinator") &&
			peopleText().includes("Western Province / Colombo"),
		peopleText().slice(0, 250),
	);
	check(
		"David shows position and location",
		peopleText().includes("Area Coordinator") &&
			peopleText().includes("Kaduwela"),
		peopleText().slice(0, 250),
	);

	/* 7b. photo shows in the drawer and on the profile */
	await click(find(".card.tw button", "View"));
	await flush();
	check(
		"drawer shows the photo",
		Boolean(document.querySelector(".dr .av img")),
	);
	await click(find(".dr button", "View full profile"));
	await flush(80);
	check(
		"profile shows the photo",
		Boolean(document.querySelector("img.person-profile-avatar")),
	);
	await click(
		find(".person-profile-photo-actions button", "Remove photo"),
	);
	await flush(80);
	check(
		"removing the photo falls back to initials",
		!document.querySelector("img.person-profile-avatar") &&
			Boolean(document.querySelector(".person-profile-avatar-initials")),
	);
	await click($(".person-profile-back"));
	await flush(80);
	check(
		"back to the people list",
		Boolean($(".card.tw")) && !$(".card.tw .row-photo"),
	);

	/* 8. dashboard counts (CountUp animates, so wait) */
	await navigate("Dashboard");
	const counts = await waitFor(() => {
		const k = kpis();
		return k.length === 5 && k.join(",") === "2,4,3,2,2" ? k : false;
	}, 6000);
	check("dashboard counts = 2,4,3,2,2", Array.isArray(counts), String(counts));

	/* 9. hierarchy page drill-down */
	await navigate("Hierarchy");
	check(
		"hierarchy shows province + district headers",
		text().includes("Western Province") && text().includes("Colombo"),
	);
	await click(find(".hierarchy-node-header", "Colombo"));
	await flush();
	check(
		"hierarchy shows Kaduwela after expanding",
		text().includes("Kaduwela"),
	);
	await click(find(".hierarchy-node-header", "Kaduwela"));
	await flush();
	check(
		"hierarchy shows David under Kaduwela",
		text().includes("Area Coordinator") && text().includes("David Perera"),
	);

	/* 10. map drill-down */
	await navigate("Map");
	check(
		"map root lists location type content",
		text().includes("Western Province"),
	);
	await click(find(".lst .item", "Western Province"));
	await flush(80);
	check(
		"map drill-down shows Colombo",
		text().includes("Colombo") && text().includes("Child Locations"),
		text().slice(0, 160),
	);

	/* 11. edit a location */
	await navigate("Organization Setup");
	await tab("Locations");
	const kaduwelaRow = $$(".loc-row").find((r) =>
		norm(r.textContent).includes("Kaduwela"),
	);
	await click([...kaduwelaRow.querySelectorAll("button")].find((b) =>
		norm(b.textContent).includes("Edit"),
	));
	await setValue($("#location-name"), "Kaduwela East");
	await submit($("form.setup-form"));
	check(
		"location renamed",
		$$(".loc-row").some((r) => norm(r.textContent).includes("Kaduwela East")),
	);
	await navigate("People");
	check(
		"people page reflects rename",
		peopleText().includes("Kaduwela East"),
		peopleText().slice(0, 250),
	);

	/* 12. delete validation */
	await navigate("Organization Setup");
	await tab("Location Types");
	await click($('[aria-label="Delete Area"]'));
	check(
		"cannot delete location type with locations",
		errorLine().includes("Cannot delete"),
		errorLine(),
	);
	check(
		"Area type still present",
		!!$('[aria-label="Delete Area"]'),
	);

	await tab("Locations");
	await click($('[aria-label="Delete Colombo"]'));
	check(
		"cannot delete location with children",
		errorLine().includes("Cannot delete"),
		errorLine(),
	);

	await tab("Positions");
	await click($('[aria-label="Delete Area Coordinator"]'));
	check(
		"cannot delete position with assignments",
		errorLine().includes("Cannot delete"),
		errorLine(),
	);
	check(
		"Area Coordinator still present",
		text().includes("Area Coordinator"),
	);

	/* 13. deleting a person with assignments asks for confirmation */
	await navigate("People");
	await click($('[aria-label="Remove David Perera"]'));
	await flush();
	check(
		"person delete shows confirmation",
		!!$(".confirm-dialog") &&
			norm($(".confirm-dialog").textContent).includes("Delete person"),
		$(".confirm-dialog") ? norm($(".confirm-dialog").textContent) : "no dialog",
	);
	await click(find(".confirm-dialog button", "Delete"));
	await flush(80);
	check("person removed after confirming", !text().includes("David Perera"));
	check(
		"his assignment cascaded away",
		$$("tbody tr").length >= 0 && !text().includes("Area Coordinator"),
	);

	/* 14. fresh mount resets to empty (in-memory store) */
	appRoot.unmount();
	await flush(60);
	const fresh = document.createElement("div");
	fresh.id = "root-fresh";
	document.body.appendChild(fresh);
	mod.mount(fresh);
	await flush(150);
	const freshText = () => norm(fresh.textContent);
	check(
		"fresh session starts empty",
		freshText().includes("Organization Dashboard") &&
			[...fresh.querySelectorAll(".kpi b")].every((b) => norm(b.textContent) === "0"),
		[...fresh.querySelectorAll(".kpi b")].map((b) => norm(b.textContent)).join(","),
	);
} catch (error) {
	failed += 1;
	results.push(`FAIL  unexpected error -> ${error.stack ?? error.message}`);
}

if (domErrors.length) {
	failed += 1;
	results.push(`FAIL  jsdom errors -> ${domErrors.join(" | ")}`);
}

results.forEach((line) => console.log(line));
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
