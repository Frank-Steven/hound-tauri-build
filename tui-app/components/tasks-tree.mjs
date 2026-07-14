// 绘制 tui-app\utils\tasks.mjs 的树形结构，返回行数组

import { getTaskTree } from '../utils/tasks.mjs';
import { drawTree } from './tree.mjs';
import { taskNode } from './task-node.mjs';

export function tasksTree(targetIds) {
  const { nodes, errors } = getTaskTree(targetIds);
  if (errors.length > 0) return errors;
  const root = nodes.length === 1
    ? nodes[0]
    : { description: 'build', children: nodes };
  return drawTree(root, { renderNode: taskNode });
}
