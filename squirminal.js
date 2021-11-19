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
    };
  }

  connectedCallback() {
    // quit early when reduced motion
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    this.paused = true;
    this.originalText = this.innerText.trim();
    this.queue = this.originalText.split("");

    this.init();

    if(this.hasAttribute(this.attr.autoplay)) {
      this._whenVisible(this, (isVisible) => {
        if(isVisible) {
          this.play();
        }
      });
    }
  }

  init() {
    // add classes
    this.classList.toggle(this.classes.showCursor, this.hasAttribute(this.attr.cursor));

    // clear it out
    this.innerHTML = "";

    // Play/pause button
    if(this.hasAttribute(this.attr.buttons)) {
      let playBtn = document.createElement("button");
      playBtn.innerText = "Play";
      playBtn.addEventListener("click", e => {
        this.toggle();
      })
      this.appendChild(playBtn);
      this.playButton = playBtn;
  
      // Reset button
      let resetBtn = document.createElement("button");
      resetBtn.innerText = "Reset";
      resetBtn.addEventListener("click", e => {
        this.reset();
      });
      this.appendChild(resetBtn);
      this.resetButton = resetBtn;
    }

    // Add content div
    let content = document.createElement("div");
    content.classList.add(this.classes.content);
    this.appendChild(content);
    this.content = content;
  }

  setButtonText(button, text) {
    if(button && text) {
      button.innerText = text;
    }
  }

  reset() {
    this.paused = true;
    this.setButtonText(this.playButton, "Play");
    this.content.innerHTML = "";
    this.queue = this.originalText.split("");
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
    this.setButtonText(this.playButton, "Play");
  }

  play() {
    this.paused = false;
    if(this.queue.length) {
      this.setButtonText(this.playButton, "Pause");
    }

    requestAnimationFrame(() => this.showMore());
  }

  showMore() {
    if(this.paused) {
      return;
    }

    if(!this.queue.length) {
      this.pause();
      this.dispatchEvent(new CustomEvent("squirminal.finish"));
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

    this.dispatchEvent(new CustomEvent("squirminal.frameadded"));

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
  connectedCallback() {
    this.addForm();

    this.form.addEventListener("submit", e => {
      e.preventDefault();
      this.playTarget();
    });
  }

  playTarget() {
    let value = (this.command.value || "").toLowerCase();
    let valueSuffix = (value ? `-${value}` : "");

    let targetSelector = this.getAttribute("target");    
    let terminal = document.querySelector(targetSelector + valueSuffix);

    let targetFallbackSelector = this.getAttribute("target-fallback");
    if(!terminal && targetFallbackSelector) {
      terminal = document.querySelector(targetFallbackSelector + valueSuffix);
    }

    let targetInvalidSelector = this.getAttribute("target-invalid");
    if(!terminal && value && targetInvalidSelector) {
      terminal = document.querySelector(targetInvalidSelector);
    }

    if(!terminal) {
      return;
    }

    let cloned = terminal.clone();
    if(cloned) {
      this.parentNode.insertBefore(cloned, this);
      cloned.play();
      cloned.addEventListener("squirminal.frameadded", () => {
        this.form.scrollIntoView();
      })
    }
  }

  addForm() {
    let form = document.createElement("form");
    
    let label = document.createElement("label");
    let labelText = this.getAttribute("label");
    if(!labelText) {
      throw new Error("Missing `label` attribute on the <squirm-inal-form> element.");
    }
    label.appendChild(document.createTextNode(labelText));
    form.appendChild(label);

    let command = document.createElement("input");
    label.appendChild(command);
    
    this.appendChild(form);
    
    this.form = form;
    this.command = command;
  }
}

if("customElements" in window) {
  window.customElements.define("squirm-inal", Squirminal);
  window.customElements.define("squirm-inal-form", SquirminalForm);
}
