const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

// Exercise the real component handlers with a small hooks/canvas harness.
// No real visitor data, network, or browser storage is used.
function createHarness() {
  const hooks = [];
  let cursor = 0;
  const pendingEffects = [];
  const equalDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useRef(initial) {
      const index = cursor++;
      return hooks[index] ??= { current: initial };
    },
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: initial };
      return [hooks[index].value, value => { hooks[index].value = value; }];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!hooks[index] || !equalDeps(hooks[index].deps, deps)) hooks[index] = { callback, deps };
      return hooks[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!hooks[index] || !equalDeps(hooks[index].deps, deps)) {
        pendingEffects.push(() => {
          hooks[index]?.cleanup?.();
          hooks[index] = { deps, cleanup: callback() };
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const filename = path.resolve(__dirname, '../components/signature-pad.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const componentModule = new Module(filename, module);
  componentModule.require = name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'lucide-react') return { Eraser: 'eraser', RotateCcw: 'rotate' };
    if (name === '@/components/ui/button') return { Button: 'button' };
    throw new Error(`Unexpected component dependency: ${name}`);
  };
  componentModule._compile(compiled, filename);

  const commands = [];
  const context = {};
  for (const name of ['setTransform', 'beginPath', 'arc', 'fill', 'moveTo', 'lineTo', 'stroke', 'save', 'clearRect', 'restore']) {
    context[name] = (...args) => commands.push({ name, args });
  }
  let resets = 0;
  let captured = false;
  let width = 300;
  let height = 150;
  const canvas = {
    get width() { return width; },
    set width(value) { width = value; resets++; },
    get height() { return height; },
    set height(value) { height = value; resets++; },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 600, height: 176 }),
    getContext: () => context,
    setPointerCapture: () => { captured = true; },
    hasPointerCapture: () => captured,
    releasePointerCapture: () => { captured = false; },
    toDataURL: () => 'data:image/png;base64,test-signature',
  };
  const changes = [];
  const oldWindow = global.window;
  global.window = { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };

  function find(tree, type) {
    if (!tree || typeof tree !== 'object') return null;
    if (tree.type === type) return tree;
    const children = [tree.props?.children].flat(Infinity);
    for (const child of children) {
      const result = find(child, type);
      if (result) return result;
    }
    return null;
  }
  function render() {
    cursor = 0;
    const tree = componentModule.exports.SignaturePad({ onChange: value => changes.push(value) });
    const canvasElement = find(tree, 'canvas');
    canvasElement.props.ref.current = canvas;
    for (const effect of pendingEffects.splice(0)) effect();
    return { tree, canvasProps: canvasElement.props };
  }
  const event = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, currentTarget: canvas, preventDefault() {} });
  return {
    render, event, commands, changes, get resets() { return resets; },
    find, cleanup: () => { global.window = oldWindow; },
  };
}

test('goresan pertama tidak menginisialisasi ulang kanvas setelah render', () => {
  const harness = createHarness();
  try {
    let { canvasProps } = harness.render();
    const initialResets = harness.resets;
    canvasProps.onPointerDown(harness.event(30, 40));
    assert.ok(harness.commands.some(command => command.name === 'arc'), 'tinta muncul sejak sentuhan pertama');
    ({ canvasProps } = harness.render());
    assert.equal(harness.resets, initialResets, 'perubahan status tanda tangan tidak boleh mereset kanvas');
    canvasProps.onPointerMove(harness.event(50, 60));
    canvasProps.onPointerUp(harness.event(50, 60));
    assert.deepEqual(harness.changes, ['data:image/png;base64,test-signature']);
  } finally { harness.cleanup(); }
});

test('goresan singkat tersimpan tanpa menunggu render dan dapat dihapus', () => {
  const harness = createHarness();
  try {
    const { tree, canvasProps } = harness.render();
    canvasProps.onPointerDown(harness.event(30, 40));
    canvasProps.onPointerMove(harness.event(32, 42));
    canvasProps.onPointerUp(harness.event(32, 42));
    assert.equal(harness.changes.length, 1);
    const clearButton = harness.find(tree, 'button');
    clearButton.props.onClick();
    assert.equal(harness.changes.at(-1), null);
    assert.ok(harness.commands.some(command => command.name === 'clearRect'));
  } finally { harness.cleanup(); }
});
