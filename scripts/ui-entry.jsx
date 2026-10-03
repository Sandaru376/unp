/*
 * Entry used by scripts/ui-run.mjs: mounts the real application so a
 * jsdom driven test can click through the whole demo flow.
 */

import React from "react";
import { createRoot } from "react-dom/client";

import App from "../src/App.jsx";
import { OrganizationProvider } from "../src/context/OrganizationContext.jsx";

export function mount(container) {
	const root = createRoot(container);
	root.render(
		<OrganizationProvider>
			<App />
		</OrganizationProvider>,
	);
	return root;
}
