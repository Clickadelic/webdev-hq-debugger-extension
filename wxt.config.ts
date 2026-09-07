import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		default_locale: "en",
		permissions: ["contextMenus", "cookies", "downloads", "history", "management", "tabs", "tabGroups", "topSites", "storage", "sidePanel", "scripting"],
		host_permissions: ["https://webdev-hq.com/*"],
		background: {
			service_worker: "background.js"
		}
	}
});
