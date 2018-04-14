import xmldom from 'xmldom';
import { parseJSX } from '../src/litJSX.mjs';


const DOMParser = xmldom.DOMParser;
const parsed = parseJSX(`<div>Hello</div>`, { DOMParser });
console.log(parsed);


function assert(condition) {
  if (!condition) {
    throw `Assertion failure.`;
  }
}

assert.equal = (actual, expected) => {
  if (actual !== expected) {
    throw `Got ${actual} but expected ${excepted}.`;
  }
}
