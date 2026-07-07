# AI Delivery 工作流

当一个改动涉及业务场景、权限、数据写入、外部系统或非平凡 UI 行为时，使用这套工作流。

## 阶段 1：需求澄清

输入：业务想法、bug 反馈或产品需求。

产出：`docs/requirements/YYYY-MM-DD-feature-name.md`。

通过标准：需求文档讲清楚业务目标、范围内、范围外、业务规则、状态、权限和验收场景。

需求文档还必须标记风险标签。风险标签会影响后续必须启用的 review 类型和建议使用的 skills。

**启用 Superpowers skill**：每个 Agent session 启动时加载 `using-superpowers`。需求澄清阶段由 `brainstorming` 主驱动：探索项目上下文 → 逐个提问 → 提出 2-3 方案 → 产出并确认设计文档。`brainstorming` 的终止条件是调用 `writing-plans`，这也是进入方案设计的信号。

## 阶段 2：方案设计

输入：已通过的需求说明。

产出：`docs/plans/YYYY-MM-DD-feature-name-design.md`。

通过标准：方案讲清楚分层边界、代码结构边界、数据流、失败模式、权限执行位置和备选方案。

方案必须明确入口层、handler / service / workflow 层、数据访问层分别负责什么，以及新增行为应该通过 registry、handler map、strategy 或 adapter 等哪类扩展点接入。

方案还必须判断代码规则适用性：状态机、可信边界、副作用、幂等性、错误处理、数据访问、性能、测试追踪、抽象、模块内聚、可测试性、配置密钥、兼容回滚。适用的规则必须写出约束和验证方式，不适用的规则必须说明原因。

方案必须说明核心业务逻辑如何避免和 IO、副作用、UI 展示、数据转换揉在一起，以及如何脱离 UI / CLI / API handler / 真实网络单独测试。

**启用 Superpowers skill**：`brainstorming`（续，输出方案设计文档到 `docs/plans/*-design.md` 并提交）。方案经人工确认后，必须调用 `writing-plans` 创建实现计划——这是进入任务拆分的唯一合法路径。

## 阶段 3：任务拆分

输入：已通过的需求说明和方案设计。

产出：`docs/plans/YYYY-MM-DD-feature-name-implementation.md`。

通过标准：任务按业务场景拆分，而不是只按文件或组件拆分。每个任务都有验收标准、结构验收标准、模块内聚与可测试性验收标准和测试方式。

**启用 Superpowers skill**：`writing-plans` 主驱动。每个 Task 必须包含精确文件路径、完整测试步骤和 commit 命令，粒度以 2-5 分钟可完成一步为标准。计划完成后选择执行模式：当前 session 执行选 `subagent-driven-development`；新 session 独立执行选 `executing-plans`。

## 阶段 4：编码实现

输入：一个已 ready 的任务。

产出：代码、测试和必要的文档更新。

通过标准：实现可以追溯到验收场景，没有新增未批准的业务行为，也没有偏离方案设计中的代码结构边界。

**启用 Superpowers skill**：
- 环境准备：`using-git-worktrees`（REQUIRED，在任何编码开始前创建隔离 worktree）
- 执行模式 A（当前 session）：`subagent-driven-development`（每 Task 派发独立 subagent，完成后做 spec compliance review + code quality review）
- 执行模式 B（独立 session）：`executing-plans`（批量执行，每批完成后汇报 checkpoint）
- Task 内部（两种模式均适用）：`test-driven-development` + `verification-before-completion`
- 遇到 bug 或测试失败：`systematic-debugging`
- 多个独立 Task 可并行时：`dispatching-parallel-agents`

## 阶段 5：Review

输入：当前 diff，以及需求文档、方案文档、实现计划。

产出：业务、架构、代码和测试 review 结果。

通过标准：没有未解决的 Critical 或 Important 问题，也没有未解释的架构漂移。

**启用 Superpowers skill**：发起 review 前调用 `requesting-code-review` 生成结构化 review prompt；处理 review 反馈时调用 `receiving-code-review` 跟踪每条 finding 的修复状态。

Review 必须检查入口层是否变胖、是否出现大型 if/else / switch 分支堆叠、handler / service / workflow 职责是否泄漏、重复上下文读取和输出拼接是否集中处理。

如果需求中勾选了安全、数据、性能或合约相关风险标签，还必须完成对应的质量 Review。

Review 还必须检查代码规则是否被遵守：模块职责单一，业务规则、IO、副作用、UI 展示、数据转换没有揉在一起，核心业务逻辑可以独立测试，状态没有用零散 boolean 互相推导，敏感判断没有放在不可信来源上，副作用没有出现在纯计算路径中，幂等和重复事件处理明确，错误处理不是只记录日志，数据访问权限和一致性没有被破坏，高频状态不会造成不必要的大范围 rerender，配置和密钥没有泄露，兼容和回滚路径明确。

## 阶段 6：上线

输入：已 review 的代码。

产出：上线清单，包括验证、发布、监控和回滚说明。

通过标准：验证已通过，回滚路径已明确。

**启用 Superpowers skill**：`finishing-a-development-branch`（验证测试通过 → 选择处置方式：本地 merge / 创建 PR / 保留分支 / 废弃 → 清理 worktree）。`ai:ci` gate 通过后才能执行此 skill。

## 自动化命令

检查本项目的 AI delivery 安装是否完整：

```bash
npm run ai:doctor
```

查看初始化计划：

```bash
npm run ai:init
```

把 AI delivery 所需文件写入当前项目：

```bash
npm run ai:init -- --write
```

查看命令帮助：

```bash
npm run ai:help
```

创建一组新的工作流文档：

```bash
npm run ai:new -- feature-name
```

`ai:new` 只创建需求文档和 feature manifest，避免空的方案/实现文档让流程误判为已经 ready。

如果文件名要用稳定英文 slug，但文档标题要用中文，可以传 `--title`：

```bash
npm run ai:new -- kyc-realtime-status --title "KYC 实时状态刷新"
```

检查文档是否 ready：

```bash
npm run ai:check -- feature-name
```

只检查某个阶段：

```bash
npm run ai:check -- feature-name --stage 需求澄清
```

检查需求、方案和实现计划是否一致：

```bash
npm run ai:audit -- feature-name
```

输出下一阶段应该给 AI 的 prompt：

```bash
npm run ai:next -- feature-name
```

输出当前阶段的执行编排：

```bash
npm run ai:dispatch -- feature-name
```

输出每个 Agent 可直接执行的独立 prompt：

```bash
npm run ai:dispatch -- feature-name --agent-prompts
```

输出指定 Agent 的执行 prompt：

```bash
npm run ai:run-agent -- feature-name --agent architect-agent
```

写入一次 Agent run artifact：

```bash
npm run ai:run-agent -- feature-name --agent architect-agent --write
```

回填 Agent 执行结果：

```bash
npm run ai:complete-agent -- --run docs/ai-delivery/runs/run.md --status done --result "执行完成"
```

查看 feature 的 Agent run 汇总：

```bash
npm run ai:runs -- feature-name
```

查看 feature 的 Task 汇总：

```bash
npm run ai:tasks -- feature-name
```

输出指定 Task 的执行 prompt：

```bash
npm run ai:run-task -- feature-name --task T-001
```

查看 feature 当前状态：

```bash
npm run ai:status -- feature-name
```

列出所有 feature 的状态：

```bash
npm run ai:list
```

生成合并前 review prompt：

```bash
npm run ai:review -- feature-name
```

运行 CI gate：

```bash
npm run ai:ci -- feature-name --stage Review
```

当前阶段 ready 后，创建下一阶段文档：

```bash
npm run ai:advance -- feature-name
```

`ai:next` 会根据当前阶段和需求文档中的风险标签，输出建议启用的 Superpowers 和项目 skills。

`ai:dispatch` 会进一步输出执行角色编排，包括必须启用的 Superpowers、建议使用的 Agents、Agent 分工和必须满足的阶段门禁。它适合在正式开始某一阶段前使用，用来确认“谁负责看什么、产物写到哪里、哪些门禁不能漏”。

`ai:dispatch --agent-prompts` 会为每个 Agent 生成独立 prompt。每段 prompt 都会包含角色、当前阶段、必读文档、职责、回写位置、阶段门禁和禁止越界事项，适合复制给对应 agent 或作为后续 agent runner 的输入。

`ai:run-agent --agent <agent-name>` 会只输出指定 Agent 的执行 prompt。它不会直接调用模型，而是提供一个稳定、可脚本化的 handoff 点，后续可以接 Codex、Superpowers agent 或 CI runner。

`ai:run-agent --write` 会把 prompt 写入 `docs/ai-delivery/runs/`，用于记录一次可追踪的 Agent 派发。生成文件中包含 prompt 和结果占位区，后续可以把真实执行结果回填进去。

`ai:exec-agent --agent <agent-name>` 会生成 Agent prompt、调用指定执行器、保存 stdout / stderr、自动 complete run artifact，并写入结构化结果。默认可用 `--executor echo`；需要接 Codex、Superpowers 或其他 runner 时，使用 `--executor command --executor-command <bin> --executor-arg <arg>`。

真实执行器由 `docs/ai-delivery/executors.json` 配置。常见用法是 `--executor codex`、`--executor superpowers` 或 `--executor runner`，也可以在项目里改成自己的命令和参数。

`ai:run-stage --executor <name>` 会自动运行当前阶段缺失的 Agents，并跳过已经 `done` 的 Agents。它只执行和检查，不会自动推进到下一阶段；确认 ready 后再手动运行 `ai:advance`。

`ai:complete-agent` 会把 Agent 执行状态、完成时间和结果写回 run artifact 的 `## 结果` 区域。建议 `status` 使用 `done`、`blocked` 或 `needs-review`。

`ai:complete-agent` 也支持结构化结果字段：`--finding`、`--file`、`--test`、`--blocker`、`--next-action`。这些字段会写入 run artifact 的 `## 结构化结果` 区域，并进入 `ai:runs --json` 输出。

`ai:runs` 会读取 `docs/ai-delivery/runs/` 下指定 feature 的所有 run artifact，输出每个 Agent 的状态、阶段和文件路径，并按状态汇总数量。

`ai:tasks` 会读取实现计划文档中的 `Task ID`、`Owner Agent` 和 `Status`，输出 Task 列表和状态统计。实现计划中的每个 Task 建议使用 `T-001` 这样的稳定 ID。

`ai:run-task --task <task-id>` 会生成只针对该 Task 的执行 prompt，并使用 Task 的 `Owner Agent` 作为执行角色。加 `--write` 会写入 `docs/ai-delivery/task-runs/`。

`ai:dashboard --write` 会生成 `docs/ai-delivery/dashboard-<feature>.html`，用于查看阶段、文档状态、Agent run、Task 和阻塞问题。

`ai:check --stage`、`ai:advance` 和 `ai:ci --stage` 会检查当前阶段和风险标签要求的 Agent 是否都有 `done` 状态的 run artifact。缺少必要 Agent、或 Agent run 尚未完成时，检查会失败。

Superpowers 负责执行方法，例如需求澄清、写计划、TDD、系统化调试、完成前验证和 code review。

项目 skills 负责领域最佳实践，例如安全、Supabase/Postgres、React 性能和 QA。

Agents 负责执行角色，例如 requirements-agent、architect-agent、security-agent、data-agent、performance-agent、qa-agent、implementation-agent、test-agent、code-review-agent 和 release-agent。

路径、语言、模板目录、prompt 目录和 manifest 位置由 `.ai-delivery.json` 配置。

风险标签到 review、skills、Superpowers 的映射由 `docs/ai-delivery/risk-profiles.json` 配置。

阶段和风险标签到 Agents、Agent 职责、门禁的映射由 `docs/ai-delivery/agent-profiles.json` 配置。

Agent prompt 到真实执行引擎的映射由 `docs/ai-delivery/executors.json` 配置。

需要接入 CI 或脚本时，可以给部分命令加 `--json`：

```bash
npm run ai:status -- feature-name --json
npm run ai:list -- --json
npm run ai:check -- feature-name --stage Review --json
npm run ai:ci -- feature-name --stage Review --json
```

`ai:ci` 会同时执行安装完整性检查和阶段 ready 检查，失败时返回非 0 exit code。

如果需求文档勾选了高风险标签，例如 `kyc`、`webhook`、`database`、`rls`、`frontend-performance`、`contract`，Review 阶段必须存在 quality review 文档。

## 执行规则

- 需求没 ready，不做方案。
- 方案没 review，不拆实现任务。
- Task 没有验收标准，不写代码。
- Task 没有结构验收标准，不写代码。
- Task 没有模块内聚与可测试性验收标准，不写代码。
- 方案没有明确代码结构边界，不写代码。
- 方案没有判断代码规则适用性，不写代码。
- 方案没有说明核心业务逻辑如何独立测试，不写代码。
- 涉及 3 个以上业务状态但没有状态模型，不写代码。
- 涉及 webhook、支付、KYC、合约事件或数据库写入但没有幂等策略，不写代码。
- 编码阶段默认启用 `test-driven-development` 和 `verification-before-completion`。
- 遇到 bug、失败测试或异常行为时，启用 `systematic-debugging`。
- 完成重要 task 或合并前，启用 `requesting-code-review`。
- 代码没有业务 review，不合并。
- 涉及 auth、KYC、支付、webhook、RLS、合约等敏感路径时，安全 Review 没过不合并。
- 涉及 realtime、hooks、列表或高频更新时，性能 Review 没过不合并。
- 入口变胖、大型分支堆叠或架构漂移没有 review 结论，不合并。
- 代码揉在一起、职责不清或核心业务逻辑无法独立测试，没有 review 结论，不合并。
- 可信边界、副作用、幂等性、错误处理、数据访问、性能、配置密钥、兼容回滚等适用规则没有 review 结论，不合并。
- 测试或上线清单没通过，不上线。
