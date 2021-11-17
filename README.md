# Squirminal

The squirminal is a fake antique terminal web component 

* [Demo](https://squirminal.zachleat.dev/)


<!--
## Installation

```
npm install @zachleat/squirminal
```
-->

## Usage

```html
<link rel="stylesheet" href="squirminal.css">
<squirm-inal>
[2021-11-17T23:41:07.790Z]  "GET /favicon.ico" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
[2021-11-17T23:41:07.791Z]  "GET /favicon.ico" Error (404): "Not found"
[2021-11-17T23:41:41.895Z]  "GET /demo.html" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:94.0) Gecko/20100101 Firefox/94.0"
</squirm-inal>
<script type="module" src="squirminal.js"></script>
```

## Features

* Works with `prefers-reduced-motion`
* Works without JavaScript (shows content)
* Blinking cursor via `<squirm-inal cursor>`
* Autoplay via `<squirm-inal autoplay>`
* Play/pause/reset button
* TODO: keyboard activation

## Credits

* [MIT](./LICENSE)
