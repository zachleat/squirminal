class Squirminal extends HTMLElement {
  constructor() {
    super();

    this.speed = 1.5; // higher is faster, 3 is about the fastest it can go.
    this.chunkSize = {
      min: 20,
      max: 60
    };
    this.flatDepth = 1000;

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

    let tag = node.tagName.toLowerCase();

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

    this.originalContent = this.cloneNode(true);
    this.serialized = this._serializeContent(this).flat(this.flatDepth);

    this.init();
    this.setupProps();

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

  setupProps() {
    this.paused = true;

    this.toggleButton = this.querySelector(":scope button");
    this.content = this.querySelector(`.${this.classes.content}`);
  }

  init() {
    // Add content div
    let content = document.createElement("div");
    content.classList.add(this.classes.content);

    // add non-text that have already been emptied by the serializer
    for(let child of Array.from(this.childNodes)) {
      content.appendChild(child);
    }
    this.appendChild(content);

    // Play/pause button
    if(this.hasAttribute(this.attr.buttons)) {
      let toggleBtn = document.createElement("button");
      toggleBtn.innerText = "Play";
      toggleBtn.addEventListener("click", e => {
        this.toggle();
      })
      this.appendChild(toggleBtn);
    }
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
    setTimeout(() => {
      requestAnimationFrame(() => this.showMore());
    }, delay);
  }

  clone() {
    let cloned = this.cloneNode();
    // restart from scratch
    cloned.innerHTML = this.originalContent.innerHTML;
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
    let labelSpan = document.createElement("span");
    labelSpan.appendChild(document.createTextNode(labelText));
    label.appendChild(labelSpan);
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
