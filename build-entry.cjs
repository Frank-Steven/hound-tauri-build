/**
 * @file 构建入口
 * @description 命令映射 → 声明式任务依赖解析 → TUI/回退执行。
 * @module scripts/build
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');
const { runCmdInherit, loadTaskRegistry, resolveTaskGraph, executeTasks, ROOT_DIR } = require('./task-runner.cjs');

const TUI_PATH = path.join(__dirname, 'tui-app', 'index.mjs');

// ============================================================
//  命令 → 目标任务 ID 映射
// ============================================================

const ALL_PLATFORMS = ['desktop', 'mac', 'win', 'linux', 'android', 'ios', 'desktop-platforms', 'mobile', 'all'];
const ICON_PLATFORMS = ['desktop', 'mac', 'win', 'linux', 'android', 'ios'];

/**
 * 给定命令和平台，返回需要解析执行的目标任务 ID 列表
 */
const COMMAND_TASKS = {
  build: {
    desktop: ['build:desktop'],
    mac: ['build:mac'],
    'mac-universal': ['build:mac-universal'],
    win: ['build:win'],
    linux: ['build:linux'],
    android: ['build:android'],
    ios: ['build:ios'],
    'desktop-platforms': ['build:desktop'],
    mobile: ['build:mobile'],
    all: ['build:all'],
  },
  'build-quick': {
    desktop: ['build-quick:desktop'],
    mac: ['build-quick:mac'],
    'mac-universal': ['build-quick:mac-universal'],
    win: ['build-quick:win'],
    linux: ['build-quick:linux'],
    android: ['build-quick:android'],
    ios: ['build-quick:ios'],
  },
  ship: {
    desktop: ['test', 'build:desktop'],
    mac: ['test', 'build:mac'],
    'mac-universal': ['test', 'build:mac-universal'],
    win: ['test', 'build:win'],
    linux: ['test', 'build:linux'],
    android: ['test', 'build:android'],
    ios: ['test', 'build:ios'],
    'desktop-platforms': ['test', 'build:desktop'],
    mobile: ['test', 'build:mobile'],
    all: ['test', 'build:all'],
  },
};

/** dev 命令在依赖任务完成后还需要 spawn tauri dev */
const DEV_SETUP_TASKS = {
  desktop: ['icon:desktop'],
  mac: ['icon:mac'],
  win: ['icon:win'],
  linux: ['icon:linux'],
  android: ['icon:android'],
  ios: ['icon:ios'],
};

/** dev 命令的长运行进程 */
const CP = `node "${path.join(__dirname, 'gen-icons.cjs')}"`;
const DEV_CMD = {
  desktop: `${CP} desktop --phase=copy && tauri dev`,
  mac: `${CP} mac --phase=copy && tauri dev`,
  win: `${CP} win --phase=copy && tauri dev`,
  linux: `${CP} linux --phase=copy && tauri dev`,
  android: `${CP} android --phase=copy && tauri android dev`,
  ios: `${CP} ios --phase=copy && tauri ios dev`,
};

// ============================================================
//  TUI (TCP → Ink process)
// ============================================================

let tuiSock = null;
let tuiChild = null;
let NO_TUI = false; // --no-tui 参数强制禁用 TUI

/** @returns {boolean} */
function isTuiAlive() {
  return tuiSock && !tuiSock.destroyed && tuiChild && !tuiChild.killed;
}

/**
 * 启动 TUI 子进程，失败时重试最多 3 次
 * @returns {Promise<void>}
 */
function startTui() {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let retries = 0;
    const MAX_RETRIES = 3;

    function tryStart() {
      if (resolved) return;

      const server = net.createServer((sock) => {
        if (resolved) return;
        resolved = true;
        tuiSock = sock;
        sock.setNoDelay(true);
        sock.on('error', () => {});
        resolve();
      });

      server.on('error', (err) => {
        server.close();
        if (resolved) return;
        if (++retries < MAX_RETRIES) {
          setTimeout(tryStart, 500);
          return;
        }
        resolved = true;
        reject(err);
      });

      server.listen(0, '127.0.0.1', () => {
        if (resolved) return;
        const port = server.address().port;
        tuiChild = spawn(process.execPath, [TUI_PATH, String(port)], {
          cwd: ROOT_DIR,
          stdio: ['inherit', 'inherit', 'inherit'],
        });

        tuiChild.on('error', (err) => {
          if (resolved) return;
          server.close();
          if (++retries < MAX_RETRIES) {
            setTimeout(tryStart, 500);
            return;
          }
          resolved = true;
          reject(err);
        });

        tuiChild.on('exit', (code) => {
          tuiSock = null;
          if (resolved) return;
          server.close();
          if (++retries < MAX_RETRIES) {
            setTimeout(tryStart, 500);
            return;
          }
          resolved = true;
          reject(new Error('TUI exited with code ' + code));
        });
      });
    }

    tryStart();

    setTimeout(() => {
      if (resolved) return;
      if (++retries < MAX_RETRIES) {
        tryStart();
        return;
      }
      resolved = true;
      reject(new Error('TUI connection timeout'));
    }, 10000);
  });
}

/** @param {object} msg */
function sendTui(msg) {
  if (!tuiSock || tuiSock.destroyed) return;
  try { tuiSock.write(JSON.stringify(msg) + '\n'); } catch (_) {}
}

/** @returns {Promise<void>} */
async function waitTuiExit() {
  if (tuiChild) {
    return new Promise((resolve) => { tuiChild.on('exit', resolve); });
  }
}

// ============================================================
//  TUI 回调适配器
// ============================================================

/**
 * 创建适配 task-runner 回调接口的 TUI 适配器
 * @returns {{ onInit, onStatus, onLog, onExit }}
 */
function createTuiAdapter() {
  return {
    onInit(tasks) {
      sendTui({ type: 'init', tasks });
    },
    onStatus(id, status, elapsed) {
      sendTui({ type: 'status', id, status, elapsed });
    },
    onLog(text, taskId) {
      sendTui({ type: 'log', text, taskId });
    },
    onExit(ok) {
      sendTui({ type: 'exit', ok });
    },
  };
}

// ============================================================
//  结果收集器 — 汇总任务状态和日志，供最终文本输出
// ============================================================

/**
 * 创建收集回调，同时转发到目标回调（如有）
 * @param {RunCallbacks} [target] - 转发目标（TUI 适配器），为 null 即仅收集
 * @returns {{ cb: RunCallbacks, getSummary: () => object }}
 */
function createCollector(target) {
  let tasks = [];
  let statuses = {};
  let allLogs = [];
  let exitOk = false;

  return {
    cb: {
      onInit(tasks_) {
        tasks = tasks_;
        for (const t of tasks_) statuses[t.id] = { status: 'pending', elapsed: null };
        if (target) target.onInit(tasks_);
      },
      onStatus(id, status, elapsed) {
        statuses[id] = { status, elapsed: elapsed || null };
        if (target) target.onStatus(id, status, elapsed);
      },
      onLog(text, taskId) {
        allLogs.push({ text, taskId });
        if (target) target.onLog(text, taskId);
      },
      onExit(ok) {
        exitOk = ok;
        if (target) target.onExit(ok);
      },
    },
    getSummary() {
      return { tasks, statuses, allLogs, exitOk };
    },
  };
}

/**
 * 打印构建结果摘要
 * @param {{ tasks, statuses, allLogs, exitOk }} summary
 */
function printSummary(summary) {
  const { tasks, statuses, exitOk } = summary;
  if (!tasks.length) return;

  const counts = { done: 0, failed: 0, skipped: 0 };
  for (const t of tasks) {
    const s = statuses[t.id]?.status;
    if (counts[s] !== undefined) counts[s]++;
  }

  console.log();
  console.log('─'.repeat(50));

  // 总体结果
  const ok = exitOk && counts.failed === 0;
  console.log(ok ? '  Result  PASS' : '  Result  FAIL');

  // 汇总统计
  const parts = [];
  if (counts.done) parts.push(`${counts.done} passed`);
  if (counts.failed) parts.push(`${counts.failed} failed`);
  if (counts.skipped) parts.push(`${counts.skipped} skipped`);
  console.log(`  Tasks   ${tasks.length} total, ${parts.join(', ')}`);

  // 每个任务状态
  console.log('─'.repeat(50));
  for (const t of tasks) {
    const s = statuses[t.id];
    const icon = { done: '\x1b[32m✓\x1b[0m', failed: '\x1b[31m✗\x1b[0m', skipped: '\x1b[33m○\x1b[0m', running: '…', pending: '…' }[s?.status] || ' ';
    const elapsed = s?.elapsed != null ? ` (${s.elapsed}ms)` : '';
    console.log(`  ${icon}  ${t.description || t.id}${elapsed}`);
  }

  console.log('─'.repeat(50));
  console.log();
}

// ============================================================
//  编排：TUI → 回退
// ============================================================

/**
 * 尝试用 TUI 执行目标任务，失败则回退内联
 * @param {string[]} targetIds
 * @returns {Promise<boolean>}
 */
async function runWithTuiOrFallback(targetIds) {
  // 终端过小时不跳过 TUI，子进程内会渲染 SizeWarning 提示页 + resize 自动恢复
  if (!process.stdout.isTTY || NO_TUI) {
    if (NO_TUI) { /* 用户主动禁用，不提示 */ }
    else if (!process.stdout.isTTY) { process.stderr.write('[info] 非 TTY 环境，回退内联模式\n'); }
    const collector = createCollector(null);
    const ok = await executeResolved(targetIds, 'inline', collector.cb);
    printSummary(collector.getSummary());
    return ok;
  }

  // 尝试启动 TUI
  try { await startTui(); } catch (_) {
    const collector = createCollector(null);
    const ok = await executeResolved(targetIds, 'inline', collector.cb);
    printSummary(collector.getSummary());
    return ok;
  }

  if (!isTuiAlive()) {
    const collector = createCollector(null);
    const ok = await executeResolved(targetIds, 'inline', collector.cb);
    printSummary(collector.getSummary());
    return ok;
  }

  const abort = { signaled: false };

  const tuiAdapter = createTuiAdapter();
  const collector = createCollector(tuiAdapter);

  // 监听 TUI 退出 → 设置中止信号
  tuiSock.on('close', () => { abort.signaled = true; });
  tuiSock.on('error', () => { abort.signaled = true; });

  const ok = await executeResolved(targetIds, 'tui', collector.cb, abort);
  if (isTuiAlive()) await waitTuiExit();
  // 等待 TUI 的 stdout 缓冲区完全刷新，避免 printSummary 输出交叠
  await new Promise((r) => setTimeout(r, 200));
  printSummary(collector.getSummary());
  return ok;
}

/**
 * 解析 + 执行（公共流程）
 * @param {string[]} targetIds
 * @param {'tui'|'inline'} mode
 * @param {RunCallbacks} cb
 * @returns {Promise<boolean>}
 */
async function executeResolved(targetIds, mode, cb, abort) {
  const registry = loadTaskRegistry();
  const { ordered, errors } = resolveTaskGraph(targetIds, registry);

  if (errors.length > 0) {
    console.error('Errors:', errors.join(', '));
    return false;
  }

  return executeTasks(ordered, mode, cb, abort);
}

// ============================================================
//  Help
// ============================================================

function showHelp() {
  console.log('Commands:');
  console.log('  dev [platform]          - Start development server');
  console.log('  build [platform]        - Build for specified platform');
  console.log('  build-quick [platform]  - Build only (skip deps/icons)');
  console.log('  ship [platform]         - Run tests + build for platform');
  console.log('  icon [platform|all]     - Generate icons');
  console.log();
  console.log('Options:');
  console.log('  --no-tui                - Disable TUI mode, use inline output');
  console.log();
  console.log('Platforms:');
  console.log('  desktop, win, mac, mac-universal, linux, android, ios');
}

// ============================================================
//  Main
// ============================================================

async function main() {
  const args = process.argv.slice(2).filter(a => {
    if (a === '--no-tui') { NO_TUI = true; return false; }
    return true;
  });
  const command = args[0];
  const platform = args[1] || 'desktop';

  if (!command || ['help', '--help', '-h'].includes(command)) {
    showHelp();
    return;
  }

  // ---- icon ----
  if (command === 'icon') {
    let targetIds;
    if (platform === 'all') {
      targetIds = ICON_PLATFORMS.map(p => `icon:${p}`);
    } else if (ICON_PLATFORMS.includes(platform)) {
      targetIds = [`icon:${platform}`];
    } else {
      console.error('Unknown icon platform:', platform);
      console.error('Available:', ICON_PLATFORMS.join(', ') + ', all');
      process.exit(1);
    }
    const ok = await runWithTuiOrFallback(targetIds);
    process.exit(ok ? 0 : 1);
    return;
  }

  // ---- dev ----
  if (command === 'dev') {
    const setupTasks = DEV_SETUP_TASKS[platform];
    if (!setupTasks) {
      console.error('Unknown platform:', platform);
      console.error('Available:', Object.keys(DEV_SETUP_TASKS).join(', '));
      process.exit(1);
    }
    const ok = await runWithTuiOrFallback(setupTasks);
    if (!ok) { process.exit(1); return; }

    // 依赖任务完成后，spawn 长期运行的 tauri dev
    await runCmdInherit(DEV_CMD[platform]);
    return;
  }

  // ---- build / build-quick / ship ----
  if (command === 'build' || command === 'build-quick' || command === 'ship') {
    const mapping = COMMAND_TASKS[command][platform];
    if (!mapping) {
      console.error('Unknown platform:', platform);
      console.error('Available:', Object.keys(COMMAND_TASKS[command]).join(', '));
      process.exit(1);
    }
    const ok = await runWithTuiOrFallback(mapping);
    process.exit(ok ? 0 : 1);
    return;
  }

  console.error('Unknown command:', command);
  showHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
