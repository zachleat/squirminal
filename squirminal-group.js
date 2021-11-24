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

        // TODO make this better
        terminal.onstart(() => {
          // TODO hide group’s summary buttons
          // form.style.display = "none";
        });
        terminal.onend(() => {
          // TODO show group’s summary buttons
          // form.style.display = "block";
        });
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
  
          // TODO make this better
          terminal.onstart(() => {
            // TODO hide group’s summary buttons
            // nextForm.style.display = "none";
          });
          terminal.onend(() => {
            // TODO show group’s summary buttons
            // nextForm.style.display = "block";
          });
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

SquirminalGroup.define();