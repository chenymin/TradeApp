# Risk Playbook: frontend-performance

适用于涉及列表渲染、实时数据、大量状态更新或 bundle 体积敏感的需求。

## Required Design Questions

- 是否存在高频更新（WebSocket、轮询）？是否会触发大范围 re-render？
- 列表是否需要虚拟化？数据量上限是多少？
- 是否引入了新的第三方库？bundle 体积影响是否可接受？
- 是否有图片或媒体资源？是否已做懒加载和格式优化？

## Suggested Forbidden Patterns

- 禁止在 Context Provider 中存放高频变化的状态（会触发全树 re-render）
- 禁止在 render 函数内创建新对象/数组作为 prop 传递（破坏 memo）
- 禁止在列表渲染中使用 index 作为 key（存在状态错位风险）

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| 无 index 作为 key | `rg "key=\{.*index\}" src/ --type tsx` | 无匹配 |
| 类型检查 | `npx tsc --noEmit` | exit 0 |
| Bundle 分析 | `npm run build -- --mode production` | 无新增大体积依赖 |

## Review Focus

- 实时数据订阅是否在组件卸载时正确取消
- useMemo / useCallback 是否用于真实的性能热点，而非过度优化
- Core Web Vitals 关键路径是否有变化

## Common Rollback Concerns

- bundle 体积增加可快速通过移除新依赖回滚
- re-render 问题在生产环境可能无法立即复现，需压测验证
