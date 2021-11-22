class Squirminal extends HTMLElement {
  constructor() {
    super();

    this.speed = 1.5; // higher is faster, 3 is about the fastest it can go.
    this.chunkSize = {
      min: 20,
      max: 60
    };

    this.attr = {
      cursor: "cursor",
      autoplay: "autoplay",
      buttons: "buttons",
      clone: "clone",
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

  connectedCallback() {
    // quit early when reduced motion
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let originalText = this.innerText;

    this.init();
    this.setupProps(originalText);

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

  setupProps(text) {
    this.paused = true;
    this.originalText = text.trim();
    this.queue = this.originalText.split("");

    this.toggleButton = this.querySelector(":scope button");
    this.content = this.querySelector(`.${this.classes.content}`);
  }

  reset() {
    this.paused = true;
    this.setButtonText(this.toggleButton, "Play");
    this.queue = this.originalText.split("");
    this.content.innerHTML = "";
  }

  init() {
    // clear it out
    this.innerHTML = "";

    // Play/pause button
    if(this.hasAttribute(this.attr.buttons)) {
      let toggleBtn = document.createElement("button");
      toggleBtn.innerText = "Play";
      toggleBtn.addEventListener("click", e => {
        this.toggle();
      })
      this.appendChild(toggleBtn);
    }

    // Add content div
    let content = document.createElement("div");
    content.classList.add(this.classes.content);
    this.appendChild(content);
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
      entries.forEach(entry => callback(entry.isIntersecting))
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
    if(this.queue.length) {
      this.setButtonText(this.toggleButton, "Pause");
      this.dispatchEvent(new CustomEvent(this.events.start));
    }

    requestAnimationFrame(() => this.showMore());
  }

  showMore() {
    if(this.paused) {
      return;
    }

    if(!this.queue.length) {
      this.pause();
      this.dispatchEvent(new CustomEvent(this.events.end));
    }

    // show a random chunk size between min/max
    let add = [];
    let chunkSize = Math.round(Math.max(this.chunkSize.min, Math.random() * this.chunkSize.max + 1));
    for(let j = 0, k = chunkSize; j<k; j++) {
      let character = this.queue.shift();
      add.push(character);
    }
    
    let strAdded = add.join("");
    this.content.appendChild(document.createTextNode(strAdded));

    this.dispatchEvent(new CustomEvent(this.events.frameAdded));

    // the amount we wait is based on how many non-whitespace characters printed to the screen in this chunk
    let nonwhitespaceCharacters = strAdded.replace(/\s/gi, "");
    let delay = nonwhitespaceCharacters.length * (1/this.speed);
    setTimeout(() => {
      requestAnimationFrame(() => this.showMore());
    }, delay);
  }

  clone() {
    let cloned = this.cloneNode();
    // restore text
    cloned.innerText = this.originalText;
    cloned.removeAttribute(this.attr.clone);
    return cloned;
  }
}

class SquirminalForm extends HTMLElement {
  constructor() {
    super();
    this.attr = {
      autofocus: "autofocus",
      target: "target",
      fallback: "target-fallback",
      invalid: "target-invalid",
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
    label.appendChild(document.createTextNode(labelText));
    form.appendChild(label);

    if(this.hasAttribute(this.attr.target)) {
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

  on(el, name, fn) {
    el.addEventListener(name, fn, {
      passive: true,
    })
  }

  playTarget() {
    let value = (this.commandInput.value || "").toLowerCase();
    let valueSuffix = (value ? `-${value}` : "");
    
    let targetSelector = this.getAttribute(this.attr.target);
    let terminal = document.querySelector(targetSelector + valueSuffix);

    // if a fallback or invalid selector matches, we don’t move to the next question.
    let isFirstChoiceCommand = !!terminal;
    let targetFallbackSelector = this.getAttribute(this.attr.fallback);
    if(!terminal && targetFallbackSelector) {
      terminal = document.querySelector(targetFallbackSelector + valueSuffix);
    }

    let targetInvalidSelector = this.getAttribute(this.attr.invalid);
    if(!terminal && value && targetInvalidSelector) {
      terminal = document.querySelector(targetInvalidSelector);
    }

    if(!terminal) {
      return;
    }

    let cloned = terminal.clone();

    if(cloned) {
      let nextForm = this.findNextForm(this);
      // TODO if no nextForm, we’re at the end.
      nextForm.parentNode.insertBefore(cloned, nextForm);
      cloned.play();

      // blur on the old question
      if(document.activeElement) {
        document.activeElement.blur();
      }

      let nextInput;
      if(isFirstChoiceCommand) {
        nextForm.classList.add("active");

        // Move to next question  
        nextInput = nextForm.querySelector(":scope input");
      } else {
        // Keep the current question active
        let clonedForm = this.clone();
        this.parentNode.insertBefore(clonedForm, nextForm);
        nextInput = clonedForm.querySelector(":scope input");
      }

      // after clone
      this.commandInput.setAttribute("readonly", "readonly");

      if(nextInput || nextForm) {
        cloned.addEventListener("squirminal.frameadded", () => {
          (nextInput || nextForm).scrollIntoView();
        }, {
          passive: true,
        });
      }

      if(nextInput) {
        cloned.addEventListener("squirminal.end", () => {
          // TODO get rid of this
          setTimeout(() => {
            nextInput.focus();
          }, 100);
        }, {
          once: true,
          passive: true,
        });
      }
    }
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
}

if("customElements" in window) {
  window.customElements.define("squirm-inal", Squirminal);
  window.customElements.define("squirm-inal-form", SquirminalForm);
}
