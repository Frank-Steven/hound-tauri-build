// Scroll 交互 demo
import { initEvents, on, destroyEvents } from '../utils/events.mjs';
import { scroll } from '../components/scroll.mjs';
import { bindScroll } from '../components/scroll-bind.mjs';
import { getTerminalSize } from '../utils/terminal-size.mjs';

const ALT_ON = '\x1b[?1049h';
const ALT_OFF = '\x1b[?1049l';
const HIDE = '\x1b[?25l';
const SHOW = '\x1b[?25h';
const MOVE = (r, c) => `\x1b[${r};${c}H`;

const content = Array.from({ length: 50 }, (_, i) =>
  `Line ${String(i + 1).padStart(2, '0')}: ` + 'x'.repeat(10 + (i % 20))
);

const { rows, columns } = getTerminalSize();
const state = {
  maxIndex: Math.min(content.length - 1, rows - 3),
  contentLength: content.length,
  viewHeight: rows - 2,
};

function draw() {
  const lines = scroll(rows - 2, columns, content, state.maxIndex);
  process.stdout.write(MOVE(1, 1));
  for (const l of lines) process.stdout.write(l + '\x1b[K\n');
  process.stdout.write(`Arrow/Page/Home/End/Scroll  |  Enter to exit\x1b[K`);
}

process.stdout.write(ALT_ON + HIDE);
draw();

const unbind = bindScroll(state, draw);

on('key', (k) => {
  if (k.name === 'return') {
    unbind();
    destroyEvents();
    process.stdout.write(ALT_OFF + SHOW);
    process.exit(0);
  }
});

initEvents();
