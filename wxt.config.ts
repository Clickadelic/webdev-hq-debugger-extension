import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react", "@wxt-dev/i18n/module"],
	vite: () => ({
		define: {
			"import.meta.env.WXT_HOMEPAGE_URL": JSON.stringify(process.env.WXT_HOMEPAGE_URL)
		}
	}),
	manifest: {
		default_locale: "en",
		icons: {
			16: "icon/16.png",
			32: "icon/32.png",
			48: "icon/48.png",
			128: "icon/128.png"
		},
		permissions: [
			"activeTab",
			"bookmarks",
			"contextMenus",
			"cookies",
			"downloads",
			"history",
			"management",
			"tabs",
			"tabGroups",
			"topSites",
			"storage",
			"sidePanel",
			"scripting",
			"system.cpu",
			"system.memory",
			"system.storage"
		],
		side_panel: {
			default_path: "entrypoints/sidepanel/index.html"
		},
		content_scripts: [
			{
				js: ["content-scripts/content.js"],
				matches: ["*://*/*"]
			}
		],
		host_permissions: ["*://*/*"],
		background: {
			service_worker: "background.js"
		},
		web_accessible_resources: [
			{
				resources: ["pesticide.css", "meazure-style.css"],
				matches: ["<all_urls>"]
			}
		]
	}
});
