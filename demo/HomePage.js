import { jsxToDOMWith } from '../src/litJSX.js';
import PageTemplate from './PageTemplate.js';
const html = jsxToDOMWith({ PageTemplate });

export default function HomePage(props) {
  return html`
    <PageTemplate title="${props.title}">
      Hello, <b>world</b>!
    </PageTemplate>
  `;
}
