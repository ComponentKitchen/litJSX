import * as litJSX from '../src/litJSX.mjs';


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
