class Squirminal extends HTMLElement {
  connectedCallback() {
    // reduce motion
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    this.speed = 1.5; // higher is faster, 3 is about the fastest it can go.
    this.chunkSize = {
      min: 20,
      max: 60
    };;
    this.attr = {
      cursor: "cursor",
      autoplay: "autoplay",
    };
    this.classes = {
      showCursor: "squirminal-cursor-show",
      content: "squirminal-content",
    };
    this.events = {
      start: "squirminal.start",
      end: "squirminal.end",
    };

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

    // Add button
    let btn = document.createElement("button");
    btn.innerText = "Play";
    btn.addEventListener("click", e => {
      if(!this.queue.length) {
        this.reset();
      } else {
        this.toggle();
      }
    })
    this.appendChild(btn);
    this.playButton = btn;

    // Add content div
    let content = document.createElement("div");
    content.classList.add(this.classes.content);
    this.appendChild(content);
    this.content = content;
  }

  reset() {
    this.paused = true;
    this.playButton.innerText = "Play";
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
    this.playButton.innerText = "Play";
  }

  play() {
    this.paused = false;
    requestAnimationFrame(() => this.showMore());
  }

  showMore() {
    if(this.paused) {
      return;
    }

    if(!this.queue.length) {
      this.playButton.innerText = "Reset";
      return;
    }

    this.playButton.innerText = "Pause";

    let add = [];
    let chunkSize = Math.round(Math.max(this.chunkSize.min, Math.random() * this.chunkSize.max + 1));
    for(let j = 0, k = chunkSize; j<k; j++) {
      let character = this.queue.shift();
      add.push(character);
    }
    
    let strAdded = add.join("");
    this.content.appendChild(document.createTextNode(strAdded));

    // the amount we wait is based on how many non-whitespace characters printed to the screen in this chunk
    let nonwhitespaceCharacters = strAdded.replace(/\s/gi, "");
    let delay = nonwhitespaceCharacters.length * (1/this.speed);
    setTimeout(() => {
      requestAnimationFrame(() => this.showMore());
    }, delay);
  }
}

if("customElements" in window) {
  window.customElements.define("squirm-inal", Squirminal);
}
