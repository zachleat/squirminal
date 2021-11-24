class Squirminal extends HTMLElement {
  static define(tagName) {
    if("customElements" in window) {
      window.customElements.define(tagName || "squirm-inal", Squirminal);
    }
  }

  constructor() {
    super();

    this.speed = 2.5; // higher is faster, 3 is about the fastest it can go.
    this.chunkSize = {
      min: 40,
      max: 100
    };
    this.flatDepth = 1000;

    this.attr = {
      cursor: "cursor",
      autoplay: "autoplay",
      buttons: "buttons",
      global: "global",
    };
    this.classes = {
      showCursor: "squirminal-cursor-show",
      content: "squirminal-content",
    };
    this.events = {
      start: "squirminal.start",
      end: "squirminal.end",
      frameAdded: "squirminal.frameadded",
    };
  }

  _serializeContent(node, selector = []) {
    if(node.nodeType === 3) {
      let text = node.nodeValue;
      node.nodeValue = "";

      // this represents characters that need to be added to the page.
      return {
        text: text.split(""),
        selector: selector
      };
    }

    let content = [];
    let j = 0;
    for(let child of Array.from(node.childNodes)) {
      content.push(this._serializeContent(child, [...selector, j]));
      j++;
    }

    return content;
  }

  getNode(target, selector) {
    for(let childIndex of selector) {
      target = target.childNodes[childIndex];
    }
    return target;
  }

  addCharacters(target, characterCount = 1) {
    for(let entry of this.serialized) {
      let str = [];
      while(entry.text.length && characterCount-- > 0) {
        str.push(entry.text.shift());
      }

      let targetNode = this.getNode(target, entry.selector);
      targetNode.nodeValue += str.join("");

      if(characterCount === 0) break;
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
    // quit early when reduced motion
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    this.init();

    // TODO this is not ideal because the intersectionRatio is based on the empty terminal, not the
    // final animated version. So it’s tiny when empty and when the IntersectionRatio is 1 it may
    // animate off the bottom of the viewport.
    if(this.hasAttribute(this.attr.autoplay)) {
      this._whenVisible(this, (isVisible) => {
        if(isVisible) {
          this.play();
        }
      });
    }

    if(this.hasAttribute(this.attr.cursor)) {
      this.addEventListener("squirminal.start", () => {
        this.classList.add(this.classes.showCursor);
      });

      this.addEventListener("squirminal.end", () => {
        this.classList.remove(this.classes.showCursor);
      });
    }
  }

  init() {
    this.paused = true;
    this.originalContent = this.cloneNode(true);
    this.serialized = this._serializeContent(this).flat(this.flatDepth);

    // Add content div
    this.content = this.querySelector(`.${this.classes.content}`);
    if(!this.content) {
      let content = document.createElement("div");
      content.classList.add(this.classes.content);
  
      // add non-text that have already been emptied by the serializer
      for(let child of Array.from(this.childNodes)) {
        content.appendChild(child);
      }
      this.appendChild(content);
      this.content = content;
    }

    // Play/pause button
    this.toggleButton = this.querySelector(":scope button");
    if(this.hasAttribute(this.attr.buttons) && !this.toggleButton) {
      let toggleBtn = document.createElement("button");
      toggleBtn.innerText = "Play";
      toggleBtn.addEventListener("click", e => {
        this.toggle();
      })
      this.appendChild(toggleBtn);
      this.toggleButton = toggleBtn;
    }
  }

  onreveal(callback) {
    this.addEventListener(this.events.frameAdded, callback, {
      passive: true,
    });
    this.addEventListener(this.events.end, () => {
      this.removeEventListener(this.events.frameAdded, callback);
    });
  }

  onend(callback) {
    this.addEventListener(this.events.end, callback, {
      passive: true,
      once: true,
    });
  }

  setButtonText(button, text) {
    if(button && text) {
      button.innerText = text;
    }
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
    this.setButtonText(this.toggleButton, "Play");
  }

  play() {
    this.paused = false;
    if(this.hasQueue()) {
      this.setButtonText(this.toggleButton, "Pause");
      this.dispatchEvent(new CustomEvent(this.events.start));
    }

    requestAnimationFrame(() => this.showMore());
  }

  showMore() {
    if(this.paused) {
      return;
    }

    if(!this.hasQueue()) {
      this.pause();
      this.dispatchEvent(new CustomEvent(this.events.end));
    }

    // show a random chunk size between min/max
    let chunkSize = Math.round(Math.max(this.chunkSize.min, Math.random() * this.chunkSize.max + 1));
    this.addCharacters(this.content, chunkSize);

    this.dispatchEvent(new CustomEvent(this.events.frameAdded));

    // the amount we wait is based on how many non-whitespace characters printed to the screen in this chunk
    let delay = chunkSize * (1/this.speed);
    if(delay > 16) {
      setTimeout(() => {
        requestAnimationFrame(() => this.showMore());
      }, delay);
    } else {
      requestAnimationFrame(() => this.showMore());
    }
  }

  isGlobalCommand() {
    return this.hasAttribute(this.attr.global);
  }

  clone() {
    let cloned = this.cloneNode();
    // restart from scratch
    cloned.innerHTML = this.originalContent.innerHTML;
    return cloned;
  }
}

class SquirminalForm extends HTMLElement {
  static define(tagName) {
    if("customElements" in window) {
      window.customElements.define(tagName || "squirm-inal-form", SquirminalForm);
    }
  }

  constructor() {
    super();

    this.attr = {
      autofocus: "autofocus",
      target: "target",
    };
  }

  connectedCallback() {
    this.setupProps();

    if(!this.form) {
      this.addForm();
    }

    if(this.commandInput && this.hasAttribute(this.attr.autofocus)) {
      this.commandInput.focus();
    }

    this.form.addEventListener("submit", e => {
      e.preventDefault();
      this.playTarget();
    });
  }
  
  addForm() {
    let form = document.createElement("form");
    this.form = form;

    let label = document.createElement("label");
    let labelText = this.getAttribute("label");
    if(!labelText) {
      throw new Error("Missing `label` attribute on the <squirm-inal-form> element.");
    }

    let hasTarget = this.hasAttribute(this.attr.target);

    if(hasTarget) {
      let labelSpan = document.createElement("span");
      labelSpan.appendChild(document.createTextNode(labelText));
      label.appendChild(labelSpan);
    } else {
      label.appendChild(document.createTextNode(labelText));
    }
    form.appendChild(label);

    if(hasTarget) {
      let command = document.createElement("input");
      this.commandInput = command;

      label.appendChild(command);
    }
    
    this.appendChild(form);
  }

  setupProps() {
    this.form = this.querySelector(":scope form");
    this.commandInput = this.querySelector(":scope input");
  }

  clone() {
    let cloned = this.cloneNode();
    cloned.setupProps();
    return cloned;
  }

  blur() {
    if(document.activeElement) {
      document.activeElement.blur();
    }
  }

  focusToInput() {
    if(this.commandInput) {
      this.commandInput.focus();
    }
  }

  setValue(value = "") {
    this.commandInput.value = value.toLowerCase();
  }
  setReadonly() {
    this.commandInput.setAttribute("readonly", "");
  }

  clickButton(terminal) {
    let details = terminal.closest("details");
    let summary = details.querySelector(":scope > summary");
    summary.click();
  }

  normalizeAlias(value) {
    let aliases = {
      yes: "y",
      no: "n",
      "?": "help",
    };

    if(aliases[value]) {
      return aliases[value];
    }
    return value;
  }

  playTarget() {
    let value = this.normalizeAlias((this.commandInput.value || "").toLowerCase());
    let valueSuffix = `-${value || "default"}`;

    let targetSelector = this.getAttribute(this.attr.target);
    let terminal = document.querySelector(`#${targetSelector}${valueSuffix}`);
    
    if(!terminal && value) {
      terminal = document.querySelector(`#${targetSelector}-invalid`);
    }

    if(terminal) {
      this.clickButton(terminal);
    }
  }
}

class SquirminalGroup extends HTMLElement {
  static define(tagName) {
    if("customElements" in window) {
      window.customElements.define(tagName || "squirm-inal-group", SquirminalGroup);
    }
  }

  static fetchGlobalCommand(id) {
    let cmd = document.getElementById(id);
    if(!cmd) {
      throw new Error("Could not find `id` for global command:" + id)
    }

    let terminal = cmd.clone();
    terminal.removeAttribute("id");
    terminal.removeAttribute("show-button");
    terminal.setAttribute("autoplay", "");
    return terminal;
  }

  findNextForm(sourceForm) {
    let forms = document.querySelectorAll("squirm-inal-form");
    let isNext = false;
    for(let form of forms) {
      if(isNext) {
        return form;
      }
      if(form === sourceForm) {
        isNext = true;
      }
    }
  }

  openForm(form) {
    let details = form.closest("details");
    if(details) {
      details.open = true;
    }
  }

  onclick(target) {
    let summary = target.closest("summary");
    if(!summary) {
      return;
    }

    let form = this.previousElementSibling;
    let details = summary.parentNode;

    if(details) {
      // if a global button, append it and play (but don’t select or move on)
      let globalTargetId = details.getAttribute(this.attr.globalCommand);
      if(globalTargetId) {
        let currentInputValue = form.commandInput.value;
        let clonedForm = form.clone();
        this.parentNode.insertBefore(clonedForm, form);
        if(summary.innerText.toLowerCase() === "invalid") {
          clonedForm.setValue(currentInputValue);
        } else {
          clonedForm.setValue(summary.innerText);
        }
        clonedForm.blur();
        clonedForm.setReadonly();

        form.setValue("");
        form.focusToInput();

        let terminal = SquirminalGroup.fetchGlobalCommand(globalTargetId);

        terminal.onreveal(() => {
          form.scrollIntoView(false);
        });

        // insert before the form
        this.parentNode.insertBefore(terminal, form);
        return;
      } else {
        // not a global command
        let terminal = details.querySelector(":scope > squirm-inal")
        let nextForm = this.findNextForm(form);
        if(nextForm) {
          this.openForm(nextForm);
          nextForm.focusToInput();
  
          terminal.onreveal(() => {
            nextForm.scrollIntoView(false);
          });
        }
      }
    }

    if(this.selected) {
      e.preventDefault();
      return;
    }

    // set form input
    if(form) {
      form.setReadonly();
      form.setValue(summary.innerText);
    }

    // hides all sibling <summary> elements via CSS
    this.classList.add("readonly");
    this.selected = true;
  }

  connectedCallback() {
    this.attr = {
      globalCommand: "data-squirminal-global-command",
    };

    this.selected = false;
    this.classList.add("enhanced");

    this.addEventListener("click", e => {
      this.onclick(e.target);
    });

    // Attach global commands
    let globalCommands = document.querySelectorAll("squirm-inal[global][show-button]");
    for(let cmd of globalCommands) {
      let parentDetails = cmd.closest("details");
      if(!parentDetails) {
        throw new Error("Missing parent <details> for global command.");
      }

      let text = parentDetails.querySelector(":scope summary").innerText;
      let cmdId = cmd.getAttribute("id");
      let details = document.createElement("details");
      details.setAttribute("id", `${this.getAttribute("id")}-${cmdId}`);
      details.setAttribute("data-squirminal-global-command", cmdId);

      let summary = document.createElement("summary");
      summary.innerText = text;
      details.appendChild(summary);

      this.appendChild(details);
    }
  }
}

Squirminal.define();
SquirminalForm.define();
SquirminalGroup.define();
