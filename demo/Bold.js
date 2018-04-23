import { jsxToDOM } from '../src/litJSX.js';
const html = jsxToDOM;

export default function Bold(props) {
  return html`
    <b>${props.children}</b>
  `;
}
