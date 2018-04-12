# litJSX

This considers the possibility of using HTML tagged template literals to process JSX at runtime, then render template values to generate either DOM or string result. This is suitable for server-side HTML rendering, allowing decomposition of pages into functional components.

This feels like using JSX in React/Preact, but without a compile step. Parsing of JSX is done at runtime, but is only performed once per tagged template literal, and parsing is quite efficient, so runtime performance should be acceptable.

["Hello, world" demo](https://cdn.rawgit.com/ComponentKitchen/litJSX/26a7c0aa/index.html) (discussed below in "Binding to components")

[Page template demo](https://rawgit.com/ComponentKitchen/litJSX/master/demo/index.html)


## litJSX template literal flavors

litJSX includes two template literals:

* `jsxToDom` parses JSX and returns a DOM element.
* `jsxToText` parses JSX and returns a string representation.

Example:

```js
import { jsxToText } from 'litJSX.js';

const name = 'world';
jsxToText`<span>Hello, ${world}.</span>` // "<span>Hello, world.</span>"
```


## Components

Components are stateless functional components that take a `props` object as their sole parameter and return either a DOM element or a string:

```js
import { jsxToDOM } from 'litJSX.js';

export default function Header(props) {
  return jsxToDOM`
    <h1>${props.children}</h1>
  `;
}

const title = new Text('Hello');
Header({ children: title })      // <h1>Hello</h1> 
```


## Design-time syntax highlighting

Various editor extensions exist to apply HTML syntax highlighting to tagged template literals. Some of these require that the name of the template literal be `html`. By importing the desired flavor of litJSX (`jsxToDom` or `jsxToText`) as `html`, you can convince your editor extension to apply syntax highlighting to these litJSX template strings.

```js
import { jsxToDOM as html } from 'litJSX.js';

export default function Header(props) {
  return html`
    <h1>${props.children}</h1>
  `;
}
```


## Binding to components

Components often include subcomponents.

By default, the litJSX template parser looks in the global (window) scope for functions with the indicated component names. E.g., `<Foo/>` will look for a global function called `Foo` and incorporate the result of calling that function into the DOM or string result.

For control over which components are included in the parser's scope, you can use bindable litJSX parsers called `jsxToDOMWith` and `jsxToTextWith`. These both accept a map of function names to functions, and return a parser that will use that map in resolving component names to functions.

```js
import { jsxToDOMWith } from 'litJSX.js';
const html = jsxToDOMWith({ Bold, Greet });

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

html`<Greet name="world"/>`       //<span>Hello, <b>world</b>.</span>
```

This allows each JavaScript module to work strictly with the functions it has imported, without fear of name collisions.
