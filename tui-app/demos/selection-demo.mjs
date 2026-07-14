// 文本选区 demo
import { normalize, applyHighlight } from '../utils/selection.mjs';

const lines = [
  '\x1b[36m●\x1b[0m compiling rustc...',
  '\x1b[36m●\x1b[0m    Compiling hound-core',
  '\x1b[33m●\x1b[0m building bundle...',
  '\x1b[32m●\x1b[0m rustc done',
];

function show(label, result) {
  console.log(`\n=== ${label} ===`);
  result.forEach((l) => console.log(l));
}

// 单行选择：第0行，从"compiling"开始
const sel1 = normalize({ line: 0, col: 10 }, { line: 0, col: 18 });
show('单行 "compiling"', applyHighlight(lines, sel1, { prefixLen: 2 }));

// 跨行选择：第1行 "Compiling" 到第2行 "building"
const sel2 = normalize({ line: 1, col: 4 }, { line: 2, col: 15 });
show('跨行 "Compiling hound-core"~"building bundle"', applyHighlight(lines, sel2, { prefixLen: 2 }));

// 无选区
show('无选区', applyHighlight(lines, null, { prefixLen: 2 }));
