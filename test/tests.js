import {
  jsxToDOM,
  jsxToDOMWith,
  jsxToText,
  jsxToTextWith,
  parse,
  parseJSX,
  renderToDOM,
  renderToText
} from '../src/litJSX.js';


function BoldText(props) {
  return `<b>${props.children}</b>`;
}
window.BoldText = BoldText;


function BoldDOM(props) {
  const element = document.createElement('b');
  element.appendChild(props.children);
  return element;
}
window.BoldDOM = BoldDOM;


describe("litJSX", () => {

  it("parses sequences with single substitution", () => {
    const data = parse([
      `<div>`,
      `</div>`
    ]);
    assert.deepEqual(data, [
      'div',
      {},
      [
        0,
      ]
    ]);
  });

  it("parses sequences with mutliple substitutions", () => {
    const data = parseJSX(`<div>[[[0]]]foo[[[1]]]</div>`);
    assert.deepEqual(data, [
      'div',
      {},
      [
        0,
        'foo',
        1
      ]
    ]);
  });

  it("parses attributes", () => {
    const data = parse([
      `<div class="`,
      `"></div>`
    ]);
    assert.deepEqual(data, [
      'div',
      {
        'class': 0
      },
      []
    ]);
  });

  it("parses embedded component", () => {
    const data = parse([
      `<span>Hello, <BoldText>`,
      `</BoldText>.</span>`
    ]);
    assert.deepEqual(data, [
      'span',
      {},
      [
        'Hello, ',
        [
          BoldText,
          {},
          [
            0
          ]
        ],
        '.'
      ]
    ]);
  });

  it("can render data + values as a string", () => {
    const data = parse([
      `<span>Hello, <BoldText>`,
      `</BoldText>.</span>`
    ]);
    const result = renderToText(data, ['world']);
    assert.equal(result, '<span>Hello, <b>world</b>.</span>');
  });

  it("can render data + values as DOM", () => {
    const data = parse([
      `<span>Hello, <BoldDOM>`,
      `</BoldDOM>.</span>`
    ]);
    const dom = renderToDOM(data, ['world']);
    assert.equal(dom.outerHTML, '<span>Hello, <b>world</b>.</span>');
  });

  it("can render a component with a substitued property as DOM", () => {
    const Name = (props) => new Text(props.name);
    const data = [
      Name,
      {
        name: 0
      },
      []
    ];
    const dom = renderToDOM(data, ['Jane']);
    assert.equal(dom.textContent, 'Jane');
  });

  it("provides tag template literal to render a string", () => {
    const name = 'world';
    const text = jsxToText`<span>Hello, <BoldText>${name}</BoldText>.</span>`;
    assert.equal(text, '<span>Hello, <b>world</b>.</span>');
  });

  it("provides tag template literal to render DOM", () => {
    const name = 'world';
    const dom = jsxToDOM`<span>Hello, <BoldDOM>${name}</BoldDOM>.</span>`;
    assert.equal(dom.outerHTML, '<span>Hello, <b>world</b>.</span>');
  });

  it("can construct a template literal for text that handles specific classes", () => {
    const Italic = (props) => `<i>${props.children}</i>`;
    const html = jsxToTextWith({ Italic });
    const text = html`<Italic>foo</Italic>`;
    assert.equal(text, `<i>foo</i>`);
  });

  it("can construct a template literal for DOM that handles specific classes", () => {
    const Italic = (props) => {
      const element = document.createElement('i');
      element.appendChild(props.children);
      return element;
    };
    const html = jsxToDOMWith({ Italic });
    const dom = html`<Italic>foo</Italic>`;
    assert.equal(dom.outerHTML, `<i>foo</i>`);
  });

  it("can render attributes as text", () => {
    const html = jsxToText;
    const value = 'foo';
    const text = html`<div class="${value}"></div>`;
    assert.equal(text, `<div class="foo"></div>`);
  });

  it("can render attributes as DOM", () => {
    const html = jsxToDOM;
    const value = 'foo';
    const dom = html`<div class="${value}"></div>`;
    assert.equal(dom.outerHTML, `<div class="foo"></div>`);
  });

  it("can render async text compnents", async () => {
    const Async = props => Promise.resolve(`*${props.children}*`);
    const text = await jsxToTextWith({ Async })`<Async>test</Async>`;
    assert.equal(text, `*test*`);
  });

  it("can render async DOM compnents", async () => {
    const Async = props => {
      const span = document.createElement('span');
      span.appendChild(props.children);
      return Promise.resolve(span);
    };
    const dom = await jsxToDOMWith({ Async })`<Async>test</Async>`;
    assert.equal(dom.outerHTML, `<span>test</span>`);
  });

  it("waits for async components in parallel", async () => {
    const Async = async (props) => {
      const delay = parseInt(props.delay);
      await new Promise(resolve => setTimeout(resolve, delay));
      return `[${props.children}]`;
    };
    const html = jsxToTextWith({ Async });
    const text = await html`
      <span>
        <Async delay="200">One</Async>
        <Async delay="100">Two</Async>
      </span>
    `;
    assert.equal(text, `<span> [One] [Two] </span>`);
  });

});
