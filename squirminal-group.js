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

  connectedCallback() {
    this.attr = {
      globalCommand: "data-squirminal-global-command",
      doNotRestore: "disable-restore",
      skipGlobals: "skip-global-commands",
    };

    this.selected = false;
    this.classList.add("enhanced");

    this.addEventListener("click", e => {
      let summary = e.target.closest("summary");
      this.activate(summary);
    });

    // Attach global commands
    let globalCommands = document.querySelectorAll("squirm-inal[global][show-button]");
    let skip = new Set((this.getAttribute(this.attr.skipGlobals) || "").split(",").filter(entry => entry));
    for(let cmd of globalCommands) {
      let parentDetails = cmd.closest("details");
      if(!parentDetails) {
        throw new Error("Missing parent <details> for global command.");
      }

      let text = parentDetails.querySelector(":scope summary").innerText;
      let cmdId = cmd.getAttribute("id");

      if(skip.has(cmdId)) {
        continue;
      }

      let details = document.createElement("details");
      details.setAttribute("id", `${this.getAttribute("id")}-${cmdId}`);
      details.setAttribute("data-squirminal-global-command", cmdId);

      let summary = document.createElement("summary");
      summary.innerText = text;
      details.appendChild(summary);

      this.appendChild(details);
    }

    this.restore();

    // if ?reset query parameter is active, then reset all the persisted values.
    SquirminalGroup.resetAll();
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

  transitionTo(form, terminal, fromUserInteraction) {
    if(!form) return;

    form.classList.add("sq-active");

    if(!fromUserInteraction) {
      terminal.pause();
      terminal.skip();
    }

    terminal.onreveal(() => {
      // form.scrollIntoView(false);
      this.scrollIntoView(false);
    });

    terminal.onend(() => {
      let isGlobalCommand = terminal.hasAttribute("global");
      // open the details if it’s not a global command
      if(!isGlobalCommand) {
        let details = form.closest("details");
        if(details) {
          details.open = true;
        }
      }

      form.classList.remove("sq-active");
      form.focusToInput();
    });
  }

  activate(summary, fromUserInteraction = true) {
    if(!summary) {
      return;
    }

    let value = summary.innerText.toLowerCase();
    let form = this.previousElementSibling;
    let details = summary.parentNode;

    if(details) {
      // if a global button, append it and play (but don’t select or move on)
      let globalTargetId = details.getAttribute(this.attr.globalCommand);
      if(globalTargetId) {
        let hasInput = !!form.commandInput;
        let currentInputValue = hasInput ? form.commandInput.value : "";
        let clonedForm = form.clone();
        this.parentNode.insertBefore(clonedForm, form);

        if(hasInput) {
          if(value === "invalid") {
            clonedForm.setValue(currentInputValue);
          } else {
            clonedForm.setValue(summary.innerText);
          }
          clonedForm.blur();
          clonedForm.setInactive();

          form.setValue("");
        }

        let terminal = SquirminalGroup.fetchGlobalCommand(globalTargetId);
        
        this.transitionTo(form, terminal, fromUserInteraction);
        
        // insert before the form
        this.parentNode.insertBefore(terminal, form);

        // Make sure the global details is in view so that it autoplays
        details.scrollIntoView();
        return;
      } else {
        // not a global command
        let terminal = details.querySelector(":scope > squirm-inal");
        details.scrollIntoView();

        if(fromUserInteraction) {
          this.persist(terminal.getAttribute("id"));
        }

        let nextForm = this.findNextForm(form);
        if(nextForm) {
          this.transitionTo(nextForm, terminal, fromUserInteraction);
        }
      }
    }

    if(this.selected) {
      e.preventDefault();
      return;
    }

    // set form input
    if(form) {
      form.setInactive();
      form.setValue(summary.innerText);
    }

    // hides all sibling <summary> elements via CSS
    this.classList.add("readonly");
    this.selected = true;
  }

  get storageKey() {
    if(!this._storageKey) {
      this._storageKey = "squirminal-group-" + this.getAttribute("id");
    }
    return this._storageKey;
  }

  static resetAll() {
    let url = new URL(document.location.href);
    if(!url.searchParams.has("reset")) {
      return;
    }

    for(let j = 0, k = localStorage.length; j<k; j++) {
      let key = localStorage.key(j);
      if(key && key.startsWith("squirminal-group-")) {
        localStorage.removeItem(key);
      }
    }

    // reset your session, redirect to the page.
    url.searchParams.delete("reset");
    window.location.href = url.toString();
  }

  persist(terminalId) {
    localStorage.setItem(this.storageKey, terminalId);
  }

  skipRestore(terminal) {
    let alreadySkipped = false;
    let terminals = document.querySelectorAll("squirm-inal");
    for(let entry of terminals) {
      let skipped = entry.hasAttribute(this.attr.doNotRestore);
      if(skipped) {
        alreadySkipped = true;
      }
      if(terminal === entry) {
        break;
      }
    }

    return alreadySkipped;
  }

  restore() {
    let targetId = this.getPersistedValue();
    if(!targetId) {
      return;
    }

    let terminal = document.getElementById(targetId);
    if(this.skipRestore(terminal)) {
      return;
    }

    let details = terminal.closest("details");
    details.open = true;

    let summary = details.querySelector(":scope > summary");
    this.activate(summary, false);
  }

  getPersistedValue() {
    return localStorage.getItem(this.storageKey);
  }
}

SquirminalGroup.define();