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
				id: "webdev-hq-toggle-rulers",
				title: getMenuTitle("toggle_rulers", "Toggle rulers"),
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
		if (!tab?.id) return;

		if (info.menuItemId === "webdev-hq-inject-css") {
			chrome.tabs.sendMessage(tab.id, {
				command: "toggleStylesheet",
				stylesheet: "pesticide.css"
			});
		}

		if (info.menuItemId === "webdev-hq-toggle-rulers") {
			chrome.tabs.sendMessage(tab.id, {
				command: "toggleRulers"
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

		chrome.tabs.sendMessage(tab.id, {
			command: "toggleRulers"
		});
	});

	// Capture the visible tab so the content script can render a loupe.
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message?.command === "captureVisibleTab") {
			const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
			chrome.tabs.captureVisibleTab(windowId, { format: "png" }, dataUrl => {
				if (chrome.runtime.lastError) {
					sendResponse({ error: chrome.runtime.lastError.message });
				} else {
					sendResponse({ dataUrl });
				}
			});
			return true; // async response
		}
		return false;
	});
});
