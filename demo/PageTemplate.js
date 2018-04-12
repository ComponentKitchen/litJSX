import { jsxToDOMWith } from '../src/litJSX.js';
import Header from './Header.js';
const html = jsxToDOMWith({ Header });

export default function PageTemplate(props) {
  return html`
    <main>
      <Header>${props.title}</Header>
      ${props.children}
    </main>
  `;
}
