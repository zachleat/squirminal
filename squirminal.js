class Squirminal extends HTMLElement {
	static define() {
		if(!("customElements" in window)) {
			return;
		}
		// tagName was removed (it didn’t work anyway)
		window.customElements.define(this.tagName, Squirminal);
	}

	static tagName = "squirm-inal";

	static attr = {
		cursor: "cursor",
		autoplay: "autoplay",
		buttons: "buttons",
		global: "global",
		dimensions: "dimensions",
		speed: "speed",
	};

	static classes = {
		showCursor: "show-cursor",
		emptyNode: "sq-empty",
		cursor: "sq-cursor",
	};

	static css = `
${Squirminal.tagName} {
	--sq-cursor: #30c8c9;
	display: block;
}
${Squirminal.tagName} .${Squirminal.classes.emptyNode} {
	display: none;
}
${Squirminal.tagName}.${Squirminal.classes.showCursor}.${Squirminal.classes.cursor}:after,
${Squirminal.tagName}.${Squirminal.classes.showCursor} .${Squirminal.classes.cursor}:after {
	content: "";
	display: inline-block;
	width: 0.7em;
	height: 1.2em;
	margin-left: 0.2em;
	background-color: var(--sq-cursor);
	vertical-align: text-bottom;
	animation: squirminal-blink 1s infinite steps(2, start);
}
@keyframes squirminal-blink {
	0% {
		background-color: var(--sq-cursor);
	}
	100% {
		background-color: transparent;
	}
}`

	static defaultSpeed = 2; // higher is faster, 10 is about the fastest it can go.

	static chunkSize = {
		min: 5,
		max: 30
	};

	static flatDepth = 1000;

	static events = {
		start: "squirminal.start",
		end: "squirminal.end",
		frameAdded: "squirminal.frameadded",
	};

	static _needsCss = true;

	_serializeContent(node, selector = [], shouldTrim = false) {
		if(node.nodeType === 3) {
			let text = node.nodeValue;
			if(shouldTrim) {
				text = text.trim();
			}
			node.nodeValue = "";

			// this represents characters that need to be added to the page.
			return {
				text: text.split(""),
				selector,
			};
		} else if(node.nodeType === 1) {
			if(node.tagName.toLowerCase() !== Squirminal.tagName) {
				node.classList.add(Squirminal.classes.emptyNode);
			}
			if(!node.innerText) {
				return {
					text: false,
					selector,
				}
			}
		}

		let content = [];
		let j = 0;

		for(let child of Array.from(node.childNodes)) {
			content.push(this._serializeContent(child, [...selector, j], shouldTrim));
			j++;
		}

		return content;
	}

	static getNode(target, selector) {
		for(let childIndex of selector) {
			target = target.childNodes[childIndex];
		}
		return target;
	}

	static removeEmpty(node) {
		while(node) {
			if(node.classList) {
				node.classList.remove(this.classes.emptyNode);
			}
			if(node.parentNode?.tagName.toLowerCase() === this.tagName) {
				break;
			}
			node = node.parentNode;
		}
	}

	static removeAllEmptyChildren(node) {
		node.querySelectorAll(`:scope .${this.classes.emptyNode}`).forEach(el => el.classList.remove(this.classes.emptyNode));
	}

	swapCursor(node) {
		if(!node || !node.classList) {
			return;
		}
		if(this._lastCursor) {
			this._lastCursor.classList.remove(Squirminal.classes.cursor);
		}
		node.classList.add(Squirminal.classes.cursor);
		this._lastCursor = node;
	}

	addCharacters(target, characterCount = 1) {
		for(let entry of this.serialized) {
			let str = [];
			while(entry.text && entry.text.length > 0 && characterCount-- > 0) {
				str.push(entry.text.shift());
			}

			let targetNode = Squirminal.getNode(target, entry.selector);
			if(entry.text !== false) {
				targetNode.nodeValue += str.join("");
			}
			if(entry.text && entry.text.length > 0) {
				this.swapCursor(targetNode.parentNode);
			}
			if(entry.text === false) {
				Squirminal.removeAllEmptyChildren(targetNode);
			}
			Squirminal.removeEmpty(targetNode);

			if(characterCount < 0) {
				break;
			}
		}
	}

	hasQueue() {
		for(let entry of this.serialized) {
			if(entry.text.length > 0) {
				return true;
			}
		}
		return false;
	}

	connectedCallback() {
		if (!("replaceSync" in CSSStyleSheet.prototype)) {
			return;
		}

		Squirminal._addCss();

		if(this.hasAttribute(Squirminal.attr.dimensions)) {
			this.style.minHeight = `${this.offsetHeight}px`;
		}

		this.init();

		// TODO this is not ideal because the intersectionRatio is based on the empty terminal, not the
		// final animated version. So it’s tiny when empty and when the IntersectionRatio is 1 it may
		// animate off the bottom of the viewport.
		if(this.hasAttribute(Squirminal.attr.autoplay)) {
			this._whenVisible(this, (isVisible) => {
				if(isVisible) {
					this.play();
				}
			});
		}

		if(this.hasAttribute(Squirminal.attr.cursor)) {
			// show until finished
			if(this.getAttribute(Squirminal.attr.cursor) === "manual") {
				this.classList.add(Squirminal.classes.showCursor);
				this.swapCursor(this);
			}

			this.addEventListener("squirminal.start", () => {
				this.classList.add(Squirminal.classes.showCursor);
			});

			this.addEventListener("squirminal.end", () => {
				this.classList.remove(Squirminal.classes.showCursor);
			});
		}


		let href = this.getAttribute("href");
		if(href) {
			this.addEventListener("squirminal.end", () => {
				window.location.href = href;
			});
		}
	}

	static _addCss() {
		if(!Squirminal._needsCss) {
			return;
		}

		Squirminal._needsCss = false;
		let sheet = new CSSStyleSheet();
		sheet.replaceSync(Squirminal.css);
		document.adoptedStyleSheets.push(sheet);
	}

	init() {
		this.paused = true;
		this.originalContent = this.cloneNode(true);

		let isCursorManual = this.getAttribute(Squirminal.attr.cursor) === "manual";
		this.serialized = this._serializeContent(this, [], isCursorManual).flat(Squirminal.flatDepth);

		// add non-text that have already been emptied by the serializer
		for(let child of Array.from(this.childNodes)) {
			this.appendChild(child);
		}

		// Play/pause button
		this.toggleButton = this.querySelector("button[data-sq-toggle]");
		if(this.hasAttribute(Squirminal.attr.buttons) && !this.toggleButton) {
			let toggleBtn = document.createElement("button");
			toggleBtn.innerText = "Play";
			toggleBtn.setAttribute("data-sq-toggle", "");
			toggleBtn.addEventListener("click", e => {
				this.toggle();
			})
			this.appendChild(toggleBtn);
			this.toggleButton = toggleBtn;
		}

		this.skipButton = this.querySelector("button[data-sq-skip]");
		if(this.hasAttribute(Squirminal.attr.buttons) && !this.skipButton) {
			let skipBtn = document.createElement("button");
			skipBtn.innerText = "Skip";
			skipBtn.setAttribute("data-sq-skip", "");
			skipBtn.addEventListener("click", e => {
				this.skip();
			})
			this.appendChild(skipBtn);
			this.skipButton = skipBtn;
		}
	}

	removeButtons() {
		this.toggleButton?.remove();
		this.skipButton?.remove();
	}

	onreveal(callback) {
		this.addEventListener(Squirminal.events.frameAdded, callback, {
			passive: true,
		});
		this.addEventListener(Squirminal.events.end, () => {
			this.removeEventListener(Squirminal.events.frameAdded, callback);
		}, {
			passive: true,
			once: true,
		});
	}

	onstart(callback) {
		this.addEventListener(Squirminal.events.start, callback, {
			passive: true,
			once: true,
		});
	}

	onend(callback) {
		this.addEventListener(Squirminal.events.end, callback, {
			passive: true,
			once: true,
		});
	}

	_whenVisible(el, callback) {
		if(!('IntersectionObserver' in window)) {
			// run by default without intersectionobserver
			callback(undefined);
			return;
		}

		return new IntersectionObserver(entries => {
			entries.forEach(entry => {
				callback(entry.isIntersecting)
			});
		}, {
			threshold: 1
		}).observe(el);
	}

	toggle() {
		if(this.paused) {
			this.play();
		} else {
			this.pause();
		}
	}

	pause() {
		this.paused = true;
	}

	skip() {
		this.play({
			chunkSize: this.originalContent.innerHTML.length,
			delay: 0
		});
	}

	play(overrides = {}) {
		if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			overrides.chunkSize = this.originalContent.innerHTML.length;
			overrides.delay = 0;
		}

		this.paused = false;
		if(this.hasQueue()) {
			this.dispatchEvent(new CustomEvent(Squirminal.events.start));
		}

		this.removeButtons();

		requestAnimationFrame(() => this.showMore(overrides, true));
	}

	showMore(overrides = {}, continuePlaying = false) {
		if(this.paused && !overrides.force) {
			return;
		}

		if(!this.hasQueue()) {
			this.pause();
			this.dispatchEvent(new CustomEvent(Squirminal.events.frameAdded));
			this.dispatchEvent(new CustomEvent(Squirminal.events.end));
			return;
		}

		// show a random chunk size between min/max
		let chunkSize = overrides.chunkSize || Math.round(Math.max(Squirminal.chunkSize.min, Math.random() * Squirminal.chunkSize.max + 1));
		this.addCharacters(this, chunkSize);

		this.dispatchEvent(new CustomEvent(Squirminal.events.frameAdded));

		if(continuePlaying) {
			this.animateNextFrame(chunkSize, overrides);
		}
	}

	animateNextFrame(chunkSize, overrides = {}) {
		let speed = parseFloat(this.getAttribute(Squirminal.attr.speed) || Squirminal.defaultSpeed);
		let normalizedSpeed = speed * .3; // convert from 0-10 to 0-3

		// the amount we wait is based on how many non-whitespace characters printed to the screen in this chunk
		let delay = overrides.delay > -1 ? overrides.delay : chunkSize * (1/normalizedSpeed);
		if(delay > 16) {
			setTimeout(() => {
				requestAnimationFrame(() => this.showMore(overrides, true));
			}, delay);
		} else {
			requestAnimationFrame(() => this.showMore(overrides, true));
		}
	}

	isGlobalCommand() {
		return this.hasAttribute(Squirminal.attr.global);
	}
}

Squirminal.define();
