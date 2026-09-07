export default defineContentScript({
	matches: ["*://*/*"],

	async main(ctx) {
		const RULERS_CONTAINER_ID = "webdev-hq-rulers-container";
		const RULERS_STYLE_ID = "webdev-hq-rulers-stylesheet";
		const RULER_SIZE = 20; // px thickness of the ruler bars
		const TICK_MINOR = 10;
		const TICK_MAJOR = 50;
		const TICK_LABEL = 100;

		let cleanup: (() => void) | null = null;

		const drawRulers = (top: HTMLCanvasElement, left: HTMLCanvasElement) => {
			const dpr = window.devicePixelRatio || 1;
			const width = window.innerWidth;
			const height = window.innerHeight;

			// ---- top (horizontal) ruler ----
			top.width = width * dpr;
			top.height = RULER_SIZE * dpr;
			top.style.width = `${width}px`;
			top.style.height = `${RULER_SIZE}px`;
			const tctx = top.getContext("2d");
			if (tctx) {
				tctx.scale(dpr, dpr);
				tctx.fillStyle = "#1e1e1e";
				tctx.fillRect(0, 0, width, RULER_SIZE);
				tctx.strokeStyle = "#888";
				tctx.fillStyle = "#ccc";
				tctx.font = "9px sans-serif";
				tctx.textBaseline = "top";
				for (let x = 0; x <= width; x += TICK_MINOR) {
					const isMajor = x % TICK_MAJOR === 0;
					const isLabel = x % TICK_LABEL === 0;
					const len = isLabel ? 12 : isMajor ? 8 : 4;
					tctx.beginPath();
					tctx.moveTo(x + 0.5, RULER_SIZE);
					tctx.lineTo(x + 0.5, RULER_SIZE - len);
					tctx.stroke();
					if (isLabel && x > 0) {
						tctx.fillText(String(x), x + 2, 1);
					}
				}
			}

			// ---- left (vertical) ruler ----
			left.width = RULER_SIZE * dpr;
			left.height = height * dpr;
			left.style.width = `${RULER_SIZE}px`;
			left.style.height = `${height}px`;
			const lctx = left.getContext("2d");
			if (lctx) {
				lctx.scale(dpr, dpr);
				lctx.fillStyle = "#1e1e1e";
				lctx.fillRect(0, 0, RULER_SIZE, height);
				lctx.strokeStyle = "#888";
				lctx.fillStyle = "#ccc";
				lctx.font = "9px sans-serif";
				lctx.textBaseline = "top";
				for (let y = 0; y <= height; y += TICK_MINOR) {
					const isMajor = y % TICK_MAJOR === 0;
					const isLabel = y % TICK_LABEL === 0;
					const len = isLabel ? 12 : isMajor ? 8 : 4;
					lctx.beginPath();
					lctx.moveTo(RULER_SIZE, y + 0.5);
					lctx.lineTo(RULER_SIZE - len, y + 0.5);
					lctx.stroke();
					if (isLabel && y > 0) {
						lctx.save();
						lctx.translate(2, y + 2);
						lctx.rotate(-Math.PI / 2);
						lctx.fillText(String(y), 0, 0);
						lctx.restore();
					}
				}
			}
		};

		const toggleRulers = () => {
			const existing = document.getElementById(RULERS_CONTAINER_ID);
			if (existing) {
				existing.remove();
				document.getElementById(RULERS_STYLE_ID)?.remove();
				cleanup?.();
				cleanup = null;
				console.log("Rulers deactivated.");
				return;
			}

			if (!document.getElementById(RULERS_STYLE_ID)) {
				const link = document.createElement("link");
				link.id = RULERS_STYLE_ID;
				link.rel = "stylesheet";
				link.href = chrome.runtime.getURL("meazure-style.css");
				document.head.appendChild(link);
			}

			const container = document.createElement("div");
			container.id = RULERS_CONTAINER_ID;

			const topRuler = document.createElement("canvas");
			topRuler.id = "webdev-hq-top-ruler";
			topRuler.className = "webdev-hq-rulers-horizontal";
			container.appendChild(topRuler);

			const leftRuler = document.createElement("canvas");
			leftRuler.id = "webdev-hq-left-ruler";
			leftRuler.className = "webdev-hq-rulers-vertical";
			container.appendChild(leftRuler);

			// corner box where the two rulers meet
			const corner = document.createElement("div");
			corner.className = "webdev-hq-rulers-corner";
			container.appendChild(corner);

			// crosshair lines
			const crossX = document.createElement("div");
			crossX.className = "webdev-hq-crosshair webdev-hq-crosshair-x";
			container.appendChild(crossX);
			const crossY = document.createElement("div");
			crossY.className = "webdev-hq-crosshair webdev-hq-crosshair-y";
			container.appendChild(crossY);

			// coordinate readout
			const readout = document.createElement("div");
			readout.className = "webdev-hq-readout";
			container.appendChild(readout);

			// measurement box + dimension label
			const measureBox = document.createElement("div");
			measureBox.className = "webdev-hq-measure-box";
			container.appendChild(measureBox);
			const measureLabel = document.createElement("div");
			measureLabel.className = "webdev-hq-measure-label";
			container.appendChild(measureLabel);

			// loupe (magnifying glass)
			const loupe = document.createElement("canvas");
			loupe.className = "webdev-hq-loupe";
			container.appendChild(loupe);
			const loupeCtx = loupe.getContext("2d");
			const LOUPE_SIZE = 140;
			const LOUPE_ZOOM = 3;
			const lctxDpr = window.devicePixelRatio || 1;
			loupe.width = LOUPE_SIZE * lctxDpr;
			loupe.height = LOUPE_SIZE * lctxDpr;
			loupe.style.width = `${LOUPE_SIZE}px`;
			loupe.style.height = `${LOUPE_SIZE}px`;

			let pageShot: HTMLImageElement | null = null;
			let shotReady = false;
			let shotScaleX = 1;
			let shotScaleY = 1;

			const capturePage = () => {
				shotReady = false;
				chrome.runtime.sendMessage({ command: "captureVisibleTab" }, response => {
					if (!response || response.error || !response.dataUrl) {
						shotReady = false;
						return;
					}
					const img = new Image();
					img.onload = () => {
						pageShot = img;
						shotScaleX = img.naturalWidth / window.innerWidth;
						shotScaleY = img.naturalHeight / window.innerHeight;
						shotReady = true;
					};
					img.src = response.dataUrl;
				});
			};

			const drawLoupe = (x: number, y: number) => {
				if (!loupeCtx) return;
				loupeCtx.setTransform(lctxDpr, 0, 0, lctxDpr, 0, 0);
				loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
				// circular clip
				loupeCtx.save();
				loupeCtx.beginPath();
				loupeCtx.arc(LOUPE_SIZE / 2, LOUPE_SIZE / 2, LOUPE_SIZE / 2, 0, Math.PI * 2);
				loupeCtx.clip();

				if (shotReady && pageShot) {
					const srcSize = LOUPE_SIZE / LOUPE_ZOOM;
					const sx = x * shotScaleX - srcSize / 2;
					const sy = y * shotScaleY - srcSize / 2;
					loupeCtx.imageSmoothingEnabled = false;
					loupeCtx.drawImage(pageShot, sx, sy, srcSize, srcSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
				} else {
					loupeCtx.fillStyle = "#222";
					loupeCtx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
					loupeCtx.fillStyle = "#aaa";
					loupeCtx.font = "11px sans-serif";
					loupeCtx.textAlign = "center";
					loupeCtx.fillText("capture unavailable", LOUPE_SIZE / 2, LOUPE_SIZE / 2);
				}

				// crosshair inside loupe
				loupeCtx.strokeStyle = "rgba(255,59,48,0.9)";
				loupeCtx.lineWidth = 1;
				loupeCtx.beginPath();
				loupeCtx.moveTo(LOUPE_SIZE / 2, 0);
				loupeCtx.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE);
				loupeCtx.moveTo(0, LOUPE_SIZE / 2);
				loupeCtx.lineTo(LOUPE_SIZE, LOUPE_SIZE / 2);
				loupeCtx.stroke();
				loupeCtx.restore();
			};

			document.body.appendChild(container);

			const redraw = () => drawRulers(topRuler, leftRuler);
			redraw();
			capturePage();

			let dragStart: { x: number; y: number } | null = null;

			const updateMeasure = (cx: number, cy: number) => {
				if (!dragStart) return;
				const x = Math.min(dragStart.x, cx);
				const y = Math.min(dragStart.y, cy);
				const w = Math.abs(cx - dragStart.x);
				const h = Math.abs(cy - dragStart.y);
				measureBox.style.display = "block";
				measureBox.style.left = `${x}px`;
				measureBox.style.top = `${y}px`;
				measureBox.style.width = `${w}px`;
				measureBox.style.height = `${h}px`;
				measureLabel.style.display = "block";
				measureLabel.textContent = `${w} × ${h}`;
				// keep label inside viewport
				let lx = x + w + 8;
				let ly = y + h + 8;
				if (lx + 90 > window.innerWidth) lx = x + w - 90 - 8;
				if (ly + 22 > window.innerHeight) ly = y + h - 22 - 8;
				if (lx < RULER_SIZE) lx = x + 4;
				if (ly < RULER_SIZE) ly = y + 4;
				measureLabel.style.left = `${lx}px`;
				measureLabel.style.top = `${ly}px`;
			};

			const onMouseMove = (e: MouseEvent) => {
				const x = e.clientX;
				const y = e.clientY;
				crossX.style.top = `${y}px`;
				crossY.style.left = `${x}px`;
				if (dragStart) {
					updateMeasure(x, y);
					readout.textContent = `w: ${Math.abs(x - dragStart.x)}  h: ${Math.abs(y - dragStart.y)}`;
				} else {
					readout.textContent = `x: ${x}  y: ${y}`;
				}
				const pad = 12;
				let rx = x + pad;
				let ry = y + pad;
				if (rx + 90 > window.innerWidth) rx = x - 90 - pad;
				if (ry + 24 > window.innerHeight) ry = y - 24 - pad;
				readout.style.left = `${rx}px`;
				readout.style.top = `${ry}px`;

				// position loupe opposite the readout, keep in viewport
				const lpad = 18;
				let lx = x + lpad;
				let ly = y + lpad;
				if (lx + LOUPE_SIZE > window.innerWidth) lx = x - LOUPE_SIZE - lpad;
				if (ly + LOUPE_SIZE > window.innerHeight) ly = y - LOUPE_SIZE - lpad;
				loupe.style.left = `${lx}px`;
				loupe.style.top = `${ly}px`;
				drawLoupe(x, y);
			};

			const onMouseDown = (e: MouseEvent) => {
				if (e.button !== 0) return;
				dragStart = { x: e.clientX, y: e.clientY };
				measureBox.style.display = "none";
				measureLabel.style.display = "none";
			};

			const onMouseUp = () => {
				dragStart = null;
			};

			const onResize = () => redraw();

			container.style.pointerEvents = "none";
			window.addEventListener("mousedown", onMouseDown, true);
			window.addEventListener("mousemove", onMouseMove, true);
			window.addEventListener("mouseup", onMouseUp, true);
			window.addEventListener("resize", onResize);

			cleanup = () => {
				window.removeEventListener("mousedown", onMouseDown, true);
				window.removeEventListener("mousemove", onMouseMove, true);
				window.removeEventListener("mouseup", onMouseUp, true);
				window.removeEventListener("resize", onResize);
			};

			console.log("Rulers activated.");
		};

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

			if (request.command === "toggleRulers") {
				toggleRulers();
				return false;
			}

			return false;
		});
	}
});
