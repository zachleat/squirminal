
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
      setTimeout(() => this.commandInput.focus());
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

SquirminalForm.define();
