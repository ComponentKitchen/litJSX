import { jsxToDOM } from '../src/litJSX.js';
const html = jsxToDOM;

export default function Header(props) {
  return html`
    <h1>${props.children}</h1>
  `;
}
