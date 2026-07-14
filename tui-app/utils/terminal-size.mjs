// 这里写一个函数，用来返回终端窗口的大小

export function getTerminalSize() {
  const { rows = 24, columns = 80 } = process.stdout;
  return { rows, columns };
}
