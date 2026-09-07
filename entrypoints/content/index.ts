export default defineContentScript({
	registration: "runtime",
	matches: [],
	cssInjectionMode: "ui",

	async main(ctx) {
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			if (request.command === "toggleStylesheet") {
				const existingLink = document.getElementById("webdev-hq-debug-stylesheet");

				if (existingLink) {
					existingLink.remove();
					console.log("Debug CSS deactivated.");
				} else {
					const link = document.createElement("link");
					link.id = "webdev-hq-debug-stylesheet";
					link.rel = "stylesheet";
					link.href = chrome.runtime.getURL(request.stylesheet);
					document.head.appendChild(link);
					console.log("Debug CSS activated.");
				}
				return false;
			}

			return false;
		});
	}
});
