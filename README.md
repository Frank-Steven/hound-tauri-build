# hound-tauri-build

基于 **TaskDAG + ConflictSet** 架构的声明式 Tauri 构建工具。支持多平台构建、图标生成、清理操作，并提供 TUI（终端 UI）模式。

## 安装

推荐使用 **yarn**，也可直接使用 `npm`：

```bash
# 推荐
yarn add --dev hound-tauri-build

# 或
npm install --save-dev hound-tauri-build
```

需要 peer 依赖：

```bash
yarn add --dev @tauri-apps/cli@^2
# 或 npm install --save-dev @tauri-apps/cli@^2
```

`ink` 和 `react` 为可选项，用于 TUI 模式。

## 使用

### CLI 命令

```bash
# 构建（默认 desktop）
yarn hound-tauri-build build [platform]

# 开发模式
yarn hound-tauri-build dev [platform]

# 快速构建（跳过依赖安装和图标生成）
yarn hound-tauri-build build-quick [platform]

# 测试 + 构建
yarn hound-tauri-build ship [platform]

# 生成图标
yarn hound-tauri-build icon [platform|all]

# 禁用 TUI，使用内联输出（可加在任意位置）
yarn hound-tauri-build build desktop --no-tui

# 清理构建产物
yarn hound-tauri-clean [target|all]

# 图标生成独立命令
yarn hound-tauri-icon [platform|all]
```

### 平台

| 平台 | 说明 |
|---|---|
| `desktop` | 桌面端（默认） |
| `mac` | macOS |
| `win` | Windows |
| `linux` | Linux |
| `mac-universal` | macOS Universal |
| `android` | Android |
| `ios` | iOS |
| `desktop-platforms` | 所有桌面平台 |
| `mobile` | 所有移动平台 |
| `all` | 所有平台 |

### 项目结构要求

工具期望目标项目为一个标准 Tauri 项目，并在项目根目录下放置平台图标源文件：

```
your-tauri-project/
├── src-tauri/               # Tauri 后端（必须）
│   ├── target/              # Rust 构建产物
│   ├── gen/                 # 移动端生成文件
│   └── icons/               # 图标生成输出（由工具管理）
├── icons/                   # 图标源文件（需自行准备）
│   ├── icon.png             # 通用图标源（必选）
│   ├── icon-desktop.png     # 桌面专用源（可选）
│   ├── icon-mac.png         # macOS 专用源（可选）
│   ├── icon-win.png         # Windows 专用源（可选）
│   ├── icon-linux.png       # Linux 专用源（可选）
│   ├── icon-android.png     # Android 专用源（可选）
│   └── icon-ios.png         # iOS 专用源（可选）
├── keys/                    # 密钥源（Android 打包）
│   ├── keystore.properties  # Android 密钥配置文件（可选）
│   └── MyKeystore.jks       # Android 密钥文件
│                            # 需在 `keystore.properties` 中
│                            # 配置绝对路径（可选）
├── package.json
└── ...
```

图标生成时按平台优先级查找源文件（如 macOS 优先用 `icon-mac.png` → `icon-desktop.png` → `icon.png`），生成对应平台所需的多尺寸图标到 `src-tauri/icons/`。

### 平台图标配置

工具内置了 [icon-config.json](https://github.com/frankssteven/hound-whiteboard/blob/main/build/icon-config.json) 定义各平台的图标生成规则，包含：

- **source** — 源文件候选列表（按优先级）
- **output** — 生成图标输出目录
- **filesToKeep** — 保留的文件列表（桌面平台）
- **needsInit** — 是否需要先初始化平台（Android / iOS）

如需自定义输出文件列表或路径，可在项目根目录放置自己的 `icon-config.json` 覆盖默认配置。

### 清理目标

```bash
yarn hound-tauri-clean target     # 清理 Rust 构建产物 (src-tauri/target)
yarn hound-tauri-clean gen        # 清理移动端生成文件 (src-tauri/gen)
yarn hound-tauri-clean icons      # 清理图标文件 (src-tauri/icons)
yarn hound-tauri-clean temp       # 清理临时图标生成目录
yarn hound-tauri-clean all        # 清理以上全部
yarn hound-tauri-clean status     # 查看当前图标来源状态
```

### 编程 API

```javascript
const { loadTaskRegistry, resolveTaskGraph, executeTasks, run } = require('hound-tauri-build');

// 加载任务注册表
const registry = loadTaskRegistry();

// 解析依赖图
const { ordered, errors } = resolveTaskGraph(['build:desktop'], registry);

// 执行任务
const ok = await executeTasks(ordered, 'inline');

// 或一步到位
const result = await run(['build:desktop'], 'inline');
const { ok, errors } = result;
```

## 架构

### TaskDAG

有向无环图（DAG）任务调度引擎：

- 依赖收集：BFS 遍历任务依赖，自动收集传递依赖
- 冲突管理：ConflictSet 处理共享资源互斥（如并发构建）
- 拓扑排序：Kahn 算法，支持线性链折叠显示
- 并行执行：在 TUI 模式下最多 4 个任务并行，依赖就绪 + 无冲突锁即可执行

### 任务定义

任务存放在 `tasks/` 目录下，每个 .cjs 文件导出一个任务对象：

```javascript
module.exports = {
  id: 'build:desktop',
  description: 'Build desktop app',
  dependsOn: ['deps', 'icon:copy:desktop'],
  conflicts: ['cargo'],
  run: { cmd: 'tauri build' },
};
```

### 执行模式

- **TUI 模式**（TTY + ink）：并行执行，实时状态面板，彩色日志
- **回退模式**（非 TTY）：串行执行，inherit stdio

## 环境变量

| 变量 | 说明 |
|---|---|
| `HOUND_BUILD_ROOT` | 项目根目录，默认当前工作目录 |

## 项目结构

```
hound-tauri-build/
├── index.js                # API 入口
├── build-entry.cjs         # 构建命令入口
├── task-runner.cjs         # TaskDAG + ConflictSet 核心引擎
├── clean.cjs               # 清理工具
├── gen-icons.cjs           # 图标生成工具
├── icon-config.json        # 图标平台配置
├── prepare-lib.js          # 发行前准备
├── bin/
│   ├── hound-tauri-build.js  # build CLI
│   ├── hound-tauri-clean.js  # clean CLI
│   └── hound-tauri-icon.js   # icon CLI
├── tasks/                  # 任务定义目录
│   ├── deps.cjs
│   ├── build-desktop.cjs
│   ├── build-mac.cjs
│   ├── build-win.cjs
│   ├── build-linux.cjs
│   ├── build-android.cjs
│   ├── build-ios.cjs
│   ├── icon-*.cjs
│   └── ...
└── tui-app/
    └── index.mjs           # TUI 应用入口
```

## 许可证

GPL-3.0-only
