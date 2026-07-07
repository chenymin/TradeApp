# Prompt：编码实现

**必须使用 Superpowers skill**：
1. 编码开始前：调用 `using-git-worktrees` 创建隔离 worktree（若尚未创建）
2. 执行模式（二选一，依任务拆分阶段选定的模式）：
   - 当前 session：`subagent-driven-development`（每 Task 独立 subagent + spec review + quality review）
   - 独立 session：`executing-plans`（批量执行 + checkpoint 汇报）
3. 每个 Task 内部：`test-driven-development` + `verification-before-completion`（强制，不可跳过）
4. 遇到 bug 或测试失败时：立即切换到 `systematic-debugging`
5. 多个独立 Task 可并行时：`dispatching-parallel-agents`

只实现实现计划中选定的 task。

编辑代码前：

- 复述该 task 的业务场景
- 复述范围内和范围外
- 复述验收标准
- 复述结构验收标准和适用的代码规则

实现过程中：

- 沿用现有项目模式
- 只改当前 task 需要的范围
- 不新增未批准的业务行为
- 必须遵守实现计划中的 Decision Notes、Forbidden Patterns、Machine Verification 和 Consistency Check。
- 如发现需求、方案和实现计划之间存在路径、编号、字段名、权限模型或验收标准冲突，先记录冲突并停止实现，除非计划中已有明确决策覆盖该冲突。
- 编码时主动用实现计划中的 Forbidden Patterns 做反向扫描，不得引入被禁止的数据访问路径、API 调用或结构漂移。
- 不把可信业务判断挪到前端
- 不把业务规则、IO、副作用、UI 展示、数据转换揉在同一个函数里。
- 核心业务逻辑必须能脱离 UI / CLI / API handler / 真实网络单独测试。
- 复杂流程拆成可命名、可测试的小函数，避免一个长函数串到底。
- 新增代码要有清晰输入输出，避免依赖隐式全局状态。
- 不用零散 boolean 互相推导业务状态；适用时使用显式状态模型。
- 不在 render / formatter / parser / selector 中放副作用。
- 涉及 webhook、支付、KYC、合约事件或数据库写入时，实现幂等和重复事件处理。
- 错误处理不能只 `console.error`，必须覆盖用户反馈、日志 / 监控、重试、降级或阻断策略。
- 新增 env var 时说明用途、作用域、是否客户端可见，避免 secret 进入前端 bundle、日志或错误响应。
- 新增抽象必须降低真实重复、隔离变化、表达领域概念或提供稳定扩展点。
- 按风险程度新增或更新测试
- 必须调用 `test-driven-development`：先写能失败的测试，再实现。
- 完成前必须调用 `verification-before-completion`：没有验证命令证据，不声明完成。

实现后：

- 列出修改文件
- 把业务场景映射到代码位置
- 说明核心业务逻辑的独立测试方式
- 把适用代码规则映射到实现位置
- 列出已运行的测试
- 逐条列出 Machine Verification 和 Forbidden pattern scan 的执行结果
- 说明需求、方案、实现计划是否仍保持一致；如有偏差，说明偏差和后续处理
- 记录剩余风险
