# Prompt：Review

**必须使用 Superpowers skill**：
- 发起 review 前：调用 `requesting-code-review` 生成结构化 review prompt
- 处理 review 反馈时：调用 `receiving-code-review` 逐条跟踪 finding 的修复状态

基于需求文档、方案设计和实现计划，review 当前 diff。

优先输出问题，而不是先写总结。

检查：

- 业务场景覆盖
- 是否超出范围
- 分层和可信边界是否被破坏
- 代码结构边界是否被破坏：入口层是否变胖，handler / service / workflow 职责是否泄漏
- 是否出现可维护性风险：大型 if/else / switch 分支堆叠、重复上下文读取、重复输出拼接
- 是否应该使用 registry / handler map / strategy / adapter，而不是继续堆分支
- 是否存在过度抽象：抽象没有降低真实重复或复杂度
- 模块内聚风险：是否存在“什么都做”的函数或文件，业务规则、IO、副作用、UI 展示、数据转换是否揉在一起
- 可测试性风险：核心业务逻辑是否只能通过 UI / CLI / API handler / 真实网络测试，是否需要提取 pure function / service / adapter
- 隐式依赖风险：核心逻辑是否依赖全局状态、时间、网络、环境变量或 localStorage 导致测试困难
- 权限和数据泄露风险
- 状态模型风险：是否用零散 boolean 互相推导业务状态，合法流转是否被破坏
- 可信边界风险：是否把前端、客户端参数、URL、localStorage、webhook payload 原文当成可信来源
- 副作用风险：render / formatter / parser / selector 是否触发写入、请求、导航或全局状态修改
- 幂等性风险：webhook、支付、KYC、合约事件或数据库写入是否能处理重复事件
- 错误处理风险：是否只 console.error，缺少用户反馈、日志 / 监控、重试、降级或阻断策略
- 数据访问风险：表、字段、RLS / 权限、索引、事务或一致性要求是否被破坏
- 性能风险：列表、realtime、轮询、hook、provider、context 或全局状态变更是否造成大范围 rerender
- 配置和密钥风险：secret、服务端 token、签名私钥是否进入前端 bundle、日志、错误响应或文档示例
- 兼容和回滚风险：schema、接口响应、状态枚举或外部回调格式变更是否可兼容和回滚
- 竞态和脏数据风险
- loading、空态、错误态和失败态
- 测试缺口
- 是否符合当前技术栈最佳实践
- 风险标签要求的 Security / Performance / Data / Best Practices review 是否完成

按严重级别输出问题：

- Critical：继续前必须修
- Important：合并前应修
- Minor：可以记录后延期

重要 task 或合并前 review 必须已调用 `requesting-code-review`；处理 review 反馈时必须已调用 `receiving-code-review`，不得跳过。
