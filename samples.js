import DocumentationPage from './DocumentationPage';
import Markdown from './Markdown';
import PageTemplate from './PageTemplate';
import { createParser } from './litJSX.js';

export default class ContentPageLit extends Component {

  render(props) {
    const html = createParser(DocumentationPage, Markdown);
    return html`
      <DocumentationPage request=${props.request} title=${props.title} navigation=${props.navigation}>
        <Markdown markdown=${props.markdown}/>
      </DocumentationPage>
    `;
  }

}


function ContentPage(props) {
  return DocumentationPage({
    request: props.request,
    title: props.title,
    navigation: props.navigation,
    children: [
      Markdown({
        markdown: props.markdown
      })
    ]
  });
}


function Header(props) {
  return html`
    <div class="header contentContainer">
      <img class="headerBackground" src={headerTexture}/>
      <div class="leftGutter"></div>
      <header>
        <a class="logoLink" href="/">
          <img src={`${staticPath}/images/elix.png`}/>
        </a>
        <div class="headerLinks">
          <a id="linkAbout" href="/">HOME</a> &nbsp; / &nbsp;&nbsp;
          <a id="linkAbout" href="/documentation">DOCUMENTATION</a> &nbsp; / &nbsp;&nbsp;
          <a id="linkAbout" href="https://github.com/webcomponents/gold-standard/wiki">GOLD STANDARD</a> &nbsp; / &nbsp;&nbsp;
          <a id="linkAbout" href="https://github.com/elix/elix">GITHUB</a>
        </div>
      </header>
      <div class="rightGutter"></div>
    </div>
  `;
}


function VersionPage(props) {
  const staticPath = `/static/${props.request.app.locals.build}`;
  const html = createParser(PageTemplate);
  return html`
    <PageTemplate
      headerTexture=${`${staticPath}/images/homeTexture.png`}
      request=${props.request}>
      <section class="homeSection0">
        <p>
          Build: ${props.request.app.locals.build}
        </p>
        <p>
          Version: ${props.request.app.locals.version}
        </p>
      </section>
    </PageTemplate>
  `;
}


const versionPageStructure = {
  [functionSymbol]: PageTemplate,
  props: {
    headerTexture: [
      0,
      '/images/homeTexture.png'
    ],
    request: 1,
    content: [
      '<section class="homeSection0"><p>Build: ',
      2,
      '</p><p>Version: ',
      3,
      '</p>'
    ]
  }
};
