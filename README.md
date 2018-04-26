# litJSX

This library provides HTML tagged template literals to process JSX at runtime and then render a final string result. This is suitable for server-side HTML rendering, allowing decomposition of pages into functional components.

This feels like using JSX in React/Preact, but without a compile step. Parsing of JSX is done at runtime, but is only performed once per tagged template literal, and parsing is quite efficient, so runtime performance should be acceptable.


## litJSX template literal

litJSX exports a function `jsxToText` that parses JSX and returns a string representation.

Example:

```js
const jsxToText = require('litJSX.js');

const name = 'world';
jsxToText`<span>Hello, ${world}.</span>` // "<span>Hello, world.</span>"
```

The JSX can contain a single top-level item, or multiple top-level items.


## Components

Components are stateless functional components that take a `props` object as their sole parameter and return either a DOM element or a string:

```js
const jsxToText = require('litJSX.js');

export default function Header(props) {
  return jsxToText`
    <h1>${props.children}</h1>
  `;
}

const title = new Text('Hello');
Header({ children: title })      // <h1>Hello</h1> 
```


## Design-time syntax highlighting

Various editor extensions exist to apply HTML syntax highlighting to tagged template literals. Some of these require that the name of the template literal be `html`. By importing the template literal function as `html`, you can convince your editor extension to apply syntax highlighting to these litJSX template strings.

```js
const { jsxToText: html } = require('litJSX.js');

export default function Header(props) {
  return html`
    <h1>${props.children}</h1>
  `;
}
```


## Binding to components

Components often include subcomponents.

By default, the litJSX template parser looks in the global (window) scope for functions with the indicated component names. E.g., `<Foo/>` will look for a global function called `Foo` and incorporate the result of calling that function into the DOM or string result.

For control over which components are included in the parser's scope, you can use bindable litJSX parser `jsxToTextWith`. This accepts a map of function names to functions, and returns a parser that will use that map in resolving component names to functions.

```js
const jsxToTextWith = require(rom 'litJSX.js');
const html = jsxToTextWith({ Bold, Greet });

function Bold(props) {
  return html`<b>${props.children}</b>`;
}

function Greet(props) {
  return html`
    <span>
      Hello,
      <Bold>${props.name}</Bold>.
    </span>
  `;
}

html`<Greet name="world"/>`     // <span>Hello, <b>world</b>.</span>
```

This allows each JavaScript module to work strictly with the functions it has imported, without fear of name collisions.


## Asynchronous components

The litJSX functions support both synchronous and asynchronous components. If any component in the JSX is asynchronous, the entire tagged template literal will return a `Promise` for the complete result. This lets you create `async` components and `await` the final template result.

```js
const Page = async (props) => {
  // Do any necessary async work, like network requests.
  const contents = await fetch(props.url);
  return contents;
};

const html = jsxToTextWith({ Page });
const text = await html`<Page url="..."/>`;
// text contains contents of page at the indicated URL
```
