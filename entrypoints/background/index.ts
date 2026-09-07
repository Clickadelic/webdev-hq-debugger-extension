export default defineBackground(() => {
	function getMenuTitle(messageName: string, fallback: string): string {
		return chrome.i18n.getMessage(messageName, fallback) || fallback;
	}

	function registerContextMenus() {
		chrome.contextMenus.removeAll(() => {
			chrome.contextMenus.create({
				id: "webdev-hq-inject-css",
				title: getMenuTitle("enable_disable_debug_css", "Enable/Disable Debug CSS"),
				type: "normal",
				contexts: ["selection", "page"]
			});

			chrome.contextMenus.create({
				id: "webdev-hq-save-webpage",
				title: getMenuTitle("save_webpage_to_headquarter", "Save webpage to WebDev HQ"),
				type: "normal",
				contexts: ["selection", "page"]
			});
		});
	}

	// ==========================================
	// 1. ZENTRALES INSTALL- / START-EVENT
	// ==========================================
	chrome.runtime.onInstalled.addListener(() => {
		console.log(chrome.i18n.getMessage("console_log_on_installed", "WebDev HQ Chrome-Extension installed."));
		registerContextMenus();
	});

	chrome.runtime.onStartup.addListener(() => {
		registerContextMenus();
	});

	registerContextMenus();

	// ==========================================
	// 4. KONTEXTMENÜ KLICK
	// ==========================================
	chrome.contextMenus.onClicked.addListener((info, tab) => {
		if (info.menuItemId === "webdev-hq-inject-css" && tab?.id) {
			// Wir senden jetzt "toggleStylesheet" statt fest "inject"
			chrome.tabs.sendMessage(tab.id, {
				command: "toggleStylesheet",
				stylesheet: "assets/pesticide.css"
			});
		}
	});

	// ==========================================
	// 5. EXTENSION ICON (ACTION BUTTON) KLICK
	// ==========================================
	chrome.action.onClicked.addListener(tab => {
		if (!tab.id) return;

		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ["meazure-script.js"]
		});

		// Auch hier senden wir jetzt den Toggle-Befehl
		chrome.tabs.sendMessage(tab.id, {
			command: "toggleStylesheet",
			stylesheet: "assets/pesticide.css"
		});
	});
});
