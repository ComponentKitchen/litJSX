import { jsxToDOMWith } from '../src/litJSX.js';
import PageTemplate from './PageTemplate.js';
import Bold from './Bold.js';
const html = jsxToDOMWith({ Bold, PageTemplate });

export default function HomePage(props) {
  return html`
    <PageTemplate title="${props.title}">
      Hello, <Bold>world</Bold>!
    </PageTemplate>
  `;
}
