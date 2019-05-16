# litJSX

This library provides HTML tagged template literals to process JSX at runtime and then render a final string result. This is suitable for server-side HTML rendering, allowing decomposition of pages into functional components.

This feels like using JSX in React/Preact, but without a compile step. Parsing of JSX is done at runtime, but is only performed once per tagged template literal, and parsing is quite efficient, so runtime performance should be acceptable.


## litJSX template literal

litJSX exports a function `jsxToText` that parses JSX and returns a string representation.

Example:

```js
const jsxToText = require('litjsx');

const name = 'world';
jsxToText`<span>Hello, ${name}.</span>` // "<span>Hello, world.</span>"
```

The JSX can contain a single top-level item, or multiple top-level items.


## Components

Components are stateless functional components that take a `props` object as their sole parameter and return a string:

```js
const jsxToText = require('litjsx');

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
const { jsxToText: html } = require('litjsx');

export default function Header(props) {
  return html`
    <h1>${props.children}</h1>
  `;
}
```


## Binding to components

Components often include subcomponents.

By default, the litJSX template parser looks in the `global` scope for functions with the indicated component names. E.g., `<Foo/>` will look for a global function called `Foo` and incorporate the result of calling that function into the DOM or string result.

For control over which components are included in the parser's scope, you can use bindable litJSX parser `jsxToTextWith`. This accepts a map of function names to functions, and returns a template literal that will use that map in resolving component names to functions.

```js
const jsxToTextWith = require('litjsx');
const html = jsxToTextWith({ Bold, Greet }); // Create custom template literal.

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


## Quoting attributes

Unlike standard JSX, litJSX requires you to quote all attributes. That said, you can pass an object via an attribute. Even thought it's quoted, it won't be coerced to a string.

```js
const html = jsxToTextWith({ GreetFirst });

function GreetFirst(props) {
  return html`Hello, ${props.name.first}.`;
}

const name = {
  first: 'Jane',
  last: 'Doe'
};
html`<GreetFirst name="${name}"/>`     // Hello, Jane.
```


## Asynchronous components

The litJSX functions support both synchronous and asynchronous components. If any component in the JSX is asynchronous, the entire tagged template literal returns a `Promise` for the complete result. This lets you create `async` components and `await` the final template result.

```js
async function GreetUser(props) {
  const user = await getUser(props.id); // Some async function to get data
  return html`<p>Hello, ${user.name}.</p>`;
}

const html = jsxToTextWith({ GreetUser });
const userId = 1001; // Jane's user id
const text = await html`<GreetUser id="${userId}"/>`; // Hello, Jane.
```


## Server-side rendering

litJSX is designed for use in server-side rendering of HTML. You can create litJSX components that accept an HTTP request and return a suitable block of HTML that can be sent as a response. E.g., writing a web server in [Express](http://expressjs.com/):

```js
const html = jsxToTextWith({ Greet });

function Greet(props) {
  return html`<p>Hello, ${props.name}</p>`;
}

function GreetPage(request) {
  return html`
    <!DOCTYPE html>
    <html>
      <body>
        <Greet name="${request.params.name}"/>
      </body>
    </html>
  `;
}

// The page at /greet/Jane returns HTML saying "Hello, Jane."
app.get('/greet/:name', (request, response) => {
  const content = GreetPage(request);
  response.set('Content-Type', 'text/html');
  response.send(content);
});
```

Components to render pages will often be asynchronous components (see above) so that they can incorporate the results of database queries and other async work.
