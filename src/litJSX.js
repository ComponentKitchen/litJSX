/*
 * litJSX
 * 
 * JSX-like tagged template literals
 */


// @ts-ignore
const { DOMParser } = require('xmldom');
let domParser = new DOMParser();


const defaultClassMap = {
  DocumentFragment
};


// Default cache for processed template strings.
const defaultCache = new WeakMap();


const selfClosingTags = {
  area: true,
  base: true,
  br: true,
  col: true,
  command: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  menuitem: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true
};


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


function DocumentFragment(props) {
  return props.children;
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
 * Return a template literal capable of handling the indicated classes and
 * constructing a string representation.
 */
function jsxToText(strings, ...values) {
  const data = parseAndCache(strings, {}, defaultCache);
  return render(data, values);
}


function jsxToTextWith(classMap = {}) {
  const cache = new WeakMap();
  return (strings, ...values) => {
    const data = parseAndCache(strings, classMap, cache);
    return render(data, values);
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

  // xmldom parser chokes unless leading/trailing whitespace is trimmed.
  const trimmed = jsx.trim();

  // xmldom will do some limited handling of named HTML entites --
  // but we don't want that. We circumvent that by replacing ampersands
  // with the corresponding &amp; entity. xmldom will see the latter
  // and replace it with an ampersand, restoring the original text.
  const escaped = trimmed.replace(/&/g, '&amp;');

  // The parser expects only a single node, but we want to handle fragments
  // with more than one node, so we wrap with a DocumentFragment node.
  const wrapped = `<DocumentFragment>${escaped}</DocumentFragment>`;

  // Insert our default classes to create an extended class map.
  const extendedClassMap = Object.assign({}, defaultClassMap, classMap);

  const doc = domParser.parseFromString(wrapped, 'text/xml');

  // Result of parsing should be a single node representing our wrapper.
  const wrapperNode = doc.firstChild;

  const error = findDOMParserError(wrapperNode);
  if (error) {
    throw error;
  }

  // If the wrapper contains a single child (i.e., JSX had a single top-level
  // element), unwrap and process that child. Otherwise process the wrapper.
  const node = wrapperNode.childNodes && wrapperNode.childNodes.length === 1 ?
    wrapperNode.childNodes[0] :
    wrapperNode;

  const data = transformNode(node, extendedClassMap);

  return reduce(data);
}


/*
 * Reduce the element/component represented by the data if possible.
 * 
 * We can reduce an element (not a component) if all its attributes and children
 * are plain strings that don't reference substitutions. We also
 * opportunistically concatenate adjacent strings.
 * 
 * Example: ['h1', {}, ['Hello, ', 'world']] => '<h1>Hello, world</h1>'
 */
function reduce(data) {
  if (typeof data === 'string' || typeof data === 'number') {
    return data;
  }
  const [nameData, attributesData, childrenData] = data;
  const irreducibleComponent = typeof nameData === 'function';
  const reducedChildren = childrenData.map(child => reduce(child));

  // See if we can merge any consecutive strings.
  const mergedChildren = reducedChildren.reduce((acc, current) => {
    const previous = acc.length > 0 ? acc[acc.length - 1] : null;
    if (typeof previous === 'string' && typeof current === 'string') {
      acc[acc.length - 1] = previous + current;
    } else {
      acc.push(current);
    }
    return acc;
  }, []);

  const irreducibleAttributes = Object.entries(attributesData).some(([name, value]) =>
    typeof value !== 'string'
  );
  const irreducibleChildren = mergedChildren.length > 1 || 
    mergedChildren.length === 1 && typeof mergedChildren[0] !== 'string';
  if (irreducibleComponent || irreducibleAttributes || irreducibleChildren) {
    // We may have been able to reduce some of the children,
    // but we can't completely reduce this node.
    return [nameData, attributesData, mergedChildren];
  }
  // Data represents a plain element that can be completely rendered now.
  const renderedChildren = renderChildren(mergedChildren);
  return renderElement(nameData, attributesData, renderedChildren);
}


/*
 * Render an array of children, which may include async results.
 */
function renderChildren(childrenData, substitutions) {
  const rendered = childrenData.map(child =>
    render(child, substitutions, ));
  // See if any of the rendered results are promises.
  const anyPromises = rendered.find(result => result instanceof Promise);
  if (anyPromises) {
    // At least one of the rendered results was a promise; wait for them all to
    // complete before processing the final set.
    return Promise.all(rendered).then(children =>
      children.join('')
    );
  } else {
    // All children were synchronous, so process final set right away.
    return rendered.join('');
  }
}


function renderComponent(component, attributes, children) {
  const props = Object.assign(
    {},
    attributes,
    { children }
  );
  return component(props);
}


function renderElement(tag, attributes, children) {
  const attributeText = Object.keys(attributes).map(name => {
    return ` ${name}="${attributes[name]}"`;
  }).join('');
  const noChildren = children.trim().length === 0;
  return selfClosingTags[tag] && noChildren ?
    `<${tag}${attributeText}>` :
    `<${tag}${attributeText}>${children}</${tag}>`;  
}


/*
 * Given an array representation returned by `parse`, apply the given
 * substitutions (values from the template literal) and return the resulting
 * text.
 */
function render(data, substitutions) {
  if (typeof data === 'string') {
    return data;
  } else if (typeof data === 'number') {
    return substitutions[data];
  }
  
  // A component or element.
  const [nameData, attributesData, childrenData] = data;
  const isComponent = typeof nameData === 'function';
  const resolvedAttributes = resolveAttributes(attributesData, substitutions);
  const topRenderer = isComponent ? renderComponent : renderElement;
  
  // Children may a promise for children, or the actual children.
  const awaitedChildren = renderChildren(childrenData, substitutions);
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


function resolveAttributes(attributesData, substitutions) {
  const resolved = {};
  for (const [name, value] of Object.entries(attributesData)) {
    resolved[name] = value instanceof Array ?
      // Mulit-part attribute: resolve each part and concatenate results.
      value.map(item => render(item, substitutions)).join('') :
      // Single-part attribute
      render(value, substitutions);
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
  } else if (node.nodeType !== 1 /* I.e., not an Element */) {
    // The xmldom DOMParser provides a `toString` on all nodes
    // that seems to return what we want. (The browser DOMParser
    // doesn't.)
    return node.toString();
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
  jsxToText,
  jsxToTextWith,
  parse,
  parseJSX,
  render
};
