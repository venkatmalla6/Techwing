// javaTranspiler.js - Java-to-JavaScript transpiler for browser sandbox execution
// Ported from smartexamportel/src/utils/javaTranspiler.ts

export function transpileJavaToJS(javaCode) {
  let js = javaCode;

  // 1. Remove block comments
  js = js.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Remove line comments
  js = js.replace(/\/\/[^\n]*/g, '');

  // 3. Remove class wrapper — extract the body content
  js = js.replace(/^\s*(public\s+)?class\s+\w+\s*\{([\s\S]*)\}\s*$/m, (_, __, body) => body);

  // 4. Remove access modifiers
  js = js.replace(/\b(public|private|protected|final|static)\s+/g, '');

  // 5. Remove Java type annotations on method parameters
  js = js.replace(/\b(int|long|double|float|boolean|char|String|Integer|Long|Double|Float|Boolean|void)\s*(?:\[\s*\])?\s+(\w+)/g, '$2');

  // 6. Convert Java method declarations to JS functions
  js = js.replace(/^(\s*)(\w+)\s*\(([^)]*)\)\s*\{/gm, (match, indent, name, params) => {
    const controlFlow = ['if', 'for', 'while', 'else', 'switch', 'catch', 'try', 'do'];
    if (controlFlow.includes(name)) return match;
    const cleanParams = params.split(',').map(p => p.trim()).filter(Boolean).join(', ');
    return `${indent}function ${name}(${cleanParams}) {`;
  });

  // 7. Variable declarations
  js = js.replace(/\b(int|long|double|float|boolean|char|String|Integer|Long|Double|Float|Boolean)\s*(?:\[\s*\])?\s+(\w+)/g, 'let $2');

  // 8. Array initializer: "new int[]{1,2,3}" -> "[1,2,3]"
  js = js.replace(/new\s+\w+\s*\[\s*\]\s*\{([^}]*)\}/g, '[$1]');

  // 9. Array size init: "new int[n]" -> "new Array(n).fill(0)"
  js = js.replace(/new\s+(?:int|double|float|boolean|char|String)\s*\[([^\]]+)\]/g, 'new Array($1).fill(0)');

  // 10. Enhanced for loop: "for (x : arr)" -> "for (let x of arr)"
  js = js.replace(/for\s*\(\s*(?:let\s+)?(\w+)\s*:\s*(\w+)\s*\)/g, 'for (let $1 of $2)');

  // 11. Integer constants
  js = js.replace(/Integer\.MIN_VALUE/g, 'Number.MIN_SAFE_INTEGER');
  js = js.replace(/Integer\.MAX_VALUE/g, 'Number.MAX_SAFE_INTEGER');
  js = js.replace(/Integer\.parseInt\s*\(/g, 'parseInt(');
  js = js.replace(/Math\.abs\s*\(/g, 'Math.abs(');
  js = js.replace(/Math\.max\s*\(/g, 'Math.max(');
  js = js.replace(/Math\.min\s*\(/g, 'Math.min(');

  // 12. System.out.print
  js = js.replace(/System\.out\.println\s*\(/g, 'console.log(');
  js = js.replace(/System\.out\.print\s*\(/g, 'console.log(');

  // 13. String.length() -> .length
  js = js.replace(/\.length\(\)/g, '.length');

  return js.trim();
}

export function extractMethodName(transpiledCode) {
  const controlFlow = ['if', 'for', 'while', 'else', 'switch', 'catch', 'try', 'do', 'return'];
  const matches = [...transpiledCode.matchAll(/function\s+(\w+)\s*\(/g)];
  for (const m of matches) {
    if (!controlFlow.includes(m[1])) {
      return m[1];
    }
  }
  return '';
}

export function runTestCase(transpiledCode, methodName, input) {
  try {
    const wrapper = `
      "use strict";
      ${transpiledCode}
      return JSON.stringify(${methodName}(${input}));
    `;
    // eslint-disable-next-line no-new-func
    const runner = new Function(wrapper);
    const result = runner();
    return { actual: String(result ?? ''), error: null };
  } catch (e) {
    return { actual: '', error: e.message || 'Unknown error' };
  }
}
