/*
 * litJSX
 * 
 * JSX-like tagged template literals
 */


// By default, load the xmldom DOMParser.
const { DOMParser } = require('xmldom');
let defaultDomParser = new DOMParser();


// Default cache for processed template strings.
const defaultCache = new WeakMap();


// Return the given string with any leading or trailing whitespace condensed to
// a single space. This generally ensures the same whitespace handling in HTML,
// while avoiding long blocks of white space before or after strings.
// Example: '   Hello, world   ' => ' Hello, world '
function collapseWhitespace(string) {
  const hasLeadingSpace = /^\s/.test(string);
  const hasTrailingSpace = /\s$/.test(string);
  const trimmed = string.trim();
  if (trimmed.length === 0) {
    return ' '; // Whole string was whitespace
  } else {
    const newLeadingSpace = hasLeadingSpace ? ' ' : '';
    const newTrailingSpace = hasTrailingSpace ? ' ' : '';
    return `${newLeadingSpace}${trimmed}${newTrailingSpace}`;
  }
}


// Check a node returned from DOMParser to see if it contains an error (the
// parser doesn't throw exceptions). If such a node is found, return the text of
// the error, otherwise null.
function findDOMParserError(node) {
  const isErrorNode = node => node && node.nodeName === 'parsererror';
  // Error node might be first child or first grandchild.
  const child = node.childNodes && node.childNodes[0];
  const grandchild = child && child.childNodes && child.childNodes[0];
  const errorNode = isErrorNode(child) ?
    child :
    isErrorNode(grandchild) ?
      grandchild :
      null;
  return errorNode ? errorNode.textContent : null;
}


/*
 * Convert the JSX snippets and values into a DOM representation.
 * 
 * ["<div>","</div>"], ["Hello"]  ->  <div>Hello</div>
 */
// function jsxToDOM(strings, ...values) {
//   const data = parseAndCache(strings, {}, defaultCache);
//   return renderToDOM(data, values);
// }


/*
 * Return a template literal capable of handling the indicated classes and
 * constructing a DOM representation.
 */
// function jsxToDOMWith(classMap = {}) {
//   const cache = new WeakMap();
//   return (strings, ...values) => {
//     const data = parseAndCache(strings, classMap, cache);
//     return renderToDOM(data, values);
//   };
// }


/*
 * Return a template literal capable of handling the indicated classes and
 * constructing a string representation.
 */
function jsxToText(strings, ...values) {
  const data = parseAndCache(strings, {}, defaultCache);
  return renderToText(data, values);
}


function jsxToTextWith(classMap = {}) {
  const cache = new WeakMap();
  return (strings, ...values) => {
    const data = parseAndCache(strings, classMap, cache);
    return renderToText(data, values);
  };
}


/*
 * Main parser entry point for parsing template literals.
 * 
 * This accepts the set of strings which were passed to a template literal, and
 * returns a data representation that can be combined with an array of
 * substitution values (also from the template literal) to reconstruct either a
 * complete DOM or string representation.
 * 
 * Example: `<div class="foo">Hello</div>` ->
 * 
 *     [
 *       'div',
 *       { class: 'foo' },
 *       'Hello'
 *     ]
 * 
 * The 2nd+ array elements are the children, which can be subarrays.
 * For components, instead of an element name ('div'), the first element in
 * the array will be the component's function.
 */
function parse(strings, classMap = {}) {
  // Concatenate the strings to form JSX (XML). Intersperse text markers that
  // contain an index. That index will be used later to obtain substitutions
  // from the values passed to the tag template literal.
  const jsx = strings.map((string, index) => {
    const marker = index < strings.length - 1 ?
      `[[[${index}]]]` :
      '';
    return `${string}${marker}`;
  }).join('');
  // Parse the resulting JSX.
  return parseJSX(jsx, classMap);
}


function parseAndCache(strings, classMap, cache) {
  // Do we already have data for this set of strings?
  let data = cache.get(strings);
  if (!data) {
    data = parse(strings, classMap);
    // Remember the data for next time.
    cache.set(strings, data);
  }
  return data;
}


/*
 * Parse the given text string as JSX.
 * 
 * This invokes the standard DOMParser, then transforms the parsed result into
 * our array representation (see `parse`).
 */
function parseJSX(jsx, classMap = {}) {

  // HACK(?): Extract DOMParser from class map.
  const domParser = classMap.DOMParser ?
    new classMap.DOMParser() :
    defaultDomParser;

  // xmldom parser chokes unless leading/trailing whitespace is trimmed.
  const trimmed = jsx.trim();
  const doc = domParser.parseFromString(trimmed, 'text/xml');

  // Result of parsing should only have a single node.
  const node = doc.firstChild;

  const error = findDOMParserError(node);
  if (error) {
    throw error;
  }

  return transformNode(node, classMap);
}


/*
 * Given an array representation returned by `parse`, apply the given
 * substitutions (values from the template literal). Render the result
 * using the specified set of DOM or text renderers.
 */
function render(data, substitutions, renderers) {
  if (typeof data === 'string') {
    return renderers.value(data);
  } else if (typeof data === 'number') {
    return renderers.value(substitutions[data]);
  }
  
  // A component or element.
  const [nameData, attributesData, childrenData] = data;
  const isComponent = typeof nameData === 'function';
  const resolvedAttributes = resolveAttributes(attributesData, substitutions);
  const topRenderer = isComponent ? renderComponent : renderers.element;
  
  // Children may a promise for children, or the actual children.
  const awaitedChildren = renderChildren(childrenData, substitutions, renderers);
  if (awaitedChildren instanceof Promise) {
    // Wait for children before constructing result.
    return awaitedChildren.then(children => 
      topRenderer(nameData, resolvedAttributes, children)
    );
  } else {
    // Children were synchronous, can construct result right away.
    return topRenderer(nameData, resolvedAttributes, awaitedChildren);
  }
}


/*
 * Render an array of children, which may include async results.
 */
function renderChildren(childrenData, substitutions, renderers) {
  const rendered = childrenData.map(child =>
      render(child, substitutions, renderers));
  // See if any of the rendered results are promises.
  const anyPromises = rendered.find(result => result instanceof Promise);
  if (anyPromises) {
    // At least one of the rendered results was a promise; wait for them all to
    // complete before processing the final set.
    return Promise.all(rendered).then(children =>
      renderers.children(children, substitutions)
    );
  } else {
    // All children were synchronous, so process final set right away.
    return renderers.children(rendered);
  }
}


// function renderChildrenToDOM(children, substitutions) {
//   const fragment = document.createDocumentFragment();
//   children.forEach(child => fragment.appendChild(child));
//   return fragment;
// }


function renderChildrenToText(children) {
  return children.join('');
}


function renderComponent(component, attributes, children) {
  const props = Object.assign(
    {},
    attributes,
    { children }
  );
  return component(props);
}


// function renderElementToDOM(tag, attributes, children) {
//   const element = document.createElement(tag);
//   for (const [name, value] of Object.entries(attributes)) {
//     element.setAttribute(name, value);
//   }
//   element.appendChild(children);
//   return element;
// }


function renderElementToText(tag, attributes, children) {
  const attributeText = Object.keys(attributes).map(name => {
    return ` ${name}="${attributes[name]}"`;
  }).join('');
  return `<${tag}${attributeText}>${children}</${tag}>`;  
}


/*
 * Invoke unified render function with renderers for DOM.
 */
// function renderToDOM(data, substitutions) {
//   return render(data, substitutions, {
//     children: renderChildrenToDOM,
//     element: renderElementToDOM,
//     value: renderValueToDOM
//   });
// }


/*
 * Invoke unified render function with renderers for text.
 */
function renderToText(data, substitutions) {
  return render(data, substitutions, {
    children: renderChildrenToText,
    element: renderElementToText,
    value: renderValueToText
  });
}


// function renderValueToDOM(value) {
//   return value instanceof Node ?
//     value :
//     new Text(value);
// }


function renderValueToText(value) {
  return value;
}


function resolveAttributes(attributesData, substitutions) {
  const resolved = {};
  for (const [name, value] of Object.entries(attributesData)) {
    resolved[name] = value instanceof Array ?
      // Mulit-part attribute: resolve each part and concatenate results.
      value.map(item => renderToText(item, substitutions)).join('') :
      // Single-part attribute
      renderToText(value, substitutions);
  }
  return resolved;
}


function transformAttributes(attributes) {
  const attributeData = {};
  Array.from(attributes).forEach(attribute => {
    attributeData[attribute.name] = transformText(attribute.value);
  });
  return attributeData;
}


/*
 * Transform a Node returned by DOMParser into our array representation.
 */
function transformNode(node, classMap = {}) {
  if (node.nodeType === 3 /* Text node */) {
    return transformText(node.textContent);
  }
  // TODO: Handle Comment nodes.
  const localName = node.localName;
  const isClassName = localName[0] === localName[0].toUpperCase();
  const nameData = isClassName ?
    classMap[localName] || global[localName] :
    localName;
  if (!nameData) {
    throw `Couldn't find definition for "${localName}".`;
  }
  const attributeData = transformAttributes(node.attributes);
  const childrenData = transformNodes(node.childNodes, classMap);
  return [
    nameData,
    attributeData,
    childrenData
  ];
}


function transformNodes(nodes, classMap) {
  let result = [];
  Array.from(nodes).forEach(node => {
    const transformed = transformNode(node, classMap);
    if (node.nodeType === 3 /* Text node */) {
      // Splice into result.
      result = result.concat(transformed);
    } else {
      result.push(transformed);
    }
  });
  return result;
}


function transformText(text) {
  const markerRegex = /\[\[\[(\d+)\]\]\]/;
  const trimmed = collapseWhitespace(text);
  const parts = trimmed.split(markerRegex);
  if (parts.length === 1) {
    // No markers.
    return trimmed;
  }
  // There are markers. There should be an odd number of parts. Parts with an
  // even index are strings, with an odd index are markers. We translate the
  // latter to numbers that will later index into a substitutions array.
  const transformed = parts.map((part, index) =>
    index % 2 === 0 ?
      part :
      parseInt(part)
  );
  // Remove empty strings.
  const stripped = transformed.filter(item => typeof item !== 'string' || item.length > 0);

  return (stripped.length === 1 && typeof stripped[0] === 'number') ?
    stripped[0] : // Only one item that's an index; return the index itself.
    stripped;
}


module.exports = {
  // jsxToDOM,
  // jsxToDOMWith,
  jsxToText,
  jsxToTextWith,
  parse,
  parseJSX,
  // renderToDOM,
  renderToText
};
