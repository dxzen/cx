#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");

const CX_DIR = ".cx";
const REQUIRED_EVIDENCE_SECTIONS = [
  "## Verification Commands",
  "## Requirement Coverage",
  "## Regression",
  "## TDD Evidence",
  "## Diff Review",
  "## Remaining Risk",
];
const REQUIRED_REVIEW_SECTIONS = [
  "## Scope",
  "## Findings",
  "## Spec Coverage",
  "## Code Quality",
  "## Test Gaps",
  "## Decision",
];
const REQUIRED_DEBUG_SECTIONS = [
  "## Observed",
  "## Expected",
  "## Reproduction",
  "## Hypotheses",
  "## Regression Test",
];
const STRICT_TASK_STAGES = new Set(["tasks", "build", "verify", "review", "archive"]);
const STRICT_EVIDENCE_STAGES = new Set(["verify", "review", "archive"]);
const CHANGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// 入口：解析子命令并路由到对应处理函数，统一错误出口
function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  const options = parseArgs(args);
  // init 命令在当前目录执行，其他命令需向上查找 .cx 根目录
  const root = command === "init" ? process.cwd() : resolveCxRoot(process.cwd());

  try {
    if (command === "init") {
      initProject(root, options);
    } else if (command === "status") {
      printStatus(root, options);
    } else if (command === "validate") {
      printValidation(root, options);
    } else if (command === "sync") {
      syncChange(root, options);
    } else if (command === "archive") {
      archiveChange(root, options);
    } else if (command === "worktree") {
      worktreeChange(root, options);
    } else {
      printHelp();
      process.exit(command === "help" || command === "--help" ? 0 : 1);
    }
  } catch (error) {
    if (options.json) {
      writeJson({ ok: false, error: error.message });
    } else {
      console.error(`cx: ${error.message}`);
    }
    process.exit(1);
  }
}

// 解析 CLI 参数：支持 --json、--dry-run、--change、--stage、--branch、--yes，其余参数收集到 _
function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      result.json = true;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--change" || arg === "-c") {
      result.change = args[++i];
    } else if (arg === "--stage") {
      result.stage = args[++i];
    } else if (arg === "--branch") {
      result.branch = args[++i];
    } else if (arg === "--yes" || arg === "-y") {
      result.yes = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`未知参数: ${arg}`);
    } else {
      result._.push(arg);
    }
  }
  return result;
}

// 初始化 .cx 目录结构：创建 specs/changes/archive/worktrees 子目录和 README，幂等不覆盖已有文件
function initProject(root, options) {
  const dirs = [
    cxPath(root),
    cxPath(root, "specs"),
    cxPath(root, "changes"),
    cxPath(root, "archive"),
    cxPath(root, "worktrees"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const readmePath = cxPath(root, "README.md");
  let readmeCreated = false;
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      [
        "# .cx",
        "",
        "本目录由 CX 工作流使用。",
        "",
        "- `specs/`: 长期有效的行为规范。",
        "- `changes/`: 进行中的变更契约、设计、任务、验证证据和 spec delta。",
        "- `archive/`: 已完成变更归档。",
        "- `worktrees/`: Large 变更的可选隔离工作区，必须被 git ignore。",
        "",
      ].join("\n"),
      "utf8"
    );
    readmeCreated = true;
  }

  const output = {
    ok: true,
    root,
    created: dirs.concat(readmeCreated ? [readmePath] : []),
    next: "work <change description>",
  };

  if (options.json) {
    writeJson(output);
  } else {
    console.log("CX 初始化完成");
    console.log("");
    console.log("目录:");
    for (const dir of dirs) console.log(`- ${relative(root, dir)}`);
    console.log(`- ${relative(root, readmePath)}${readmeCreated ? "" : " (已存在)"}`);
    console.log("");
    console.log(`下一步: ${output.next}`);
  }
}

// 打印 CX 状态：活跃变更列表、阶段、任务进度、校验摘要和最近归档
function printStatus(root, options) {
  const status = buildStatus(root);
  if (options.json) {
    writeJson(status);
    return;
  }

  if (!status.initialized) {
    console.log("CX 尚未初始化。下一步: init");
    return;
  }

  console.log("CX 状态");
  console.log("");
  console.log(`根目录: ${root}`);
  console.log(`活跃变更: ${status.changes.length}`);

  if (status.changes.length === 0) {
    console.log("下一步: work <change description>");
  } else {
    for (const change of status.changes) {
      console.log("");
      console.log(`- ${change.name}`);
      console.log(`  阶段: ${change.phase}`);
      console.log(`  下一步: ${change.next}`);
      console.log(`  文件: ${formatFileFlags(change.files)}`);
      console.log(`  Durable specs: ${formatDurableSpecStatus(change.durableSpecs)}`);
      if (change.tasks) {
        const total = change.tasks.implementationTotal ?? change.tasks.total;
        const done = change.tasks.implementationDone ?? change.tasks.done;
        const next = change.tasks.implementationNext ?? null;
        console.log(
          `  任务: ${done}/${total} 实现项完成` + (next ? `，下一个: ${next}` : "")
        );
      }
      if (change.validation.errors > 0 || change.validation.warnings > 0) {
        console.log(
          `  校验: ${change.validation.errors} error, ${change.validation.warnings} warning`
        );
      } else {
        console.log("  校验: ok");
      }
    }
  }

  if (status.archives.length > 0) {
    console.log("");
    console.log(`最近归档: ${status.archives[0].name}`);
  }
}

// 校验入口：支持按 stage 维度校验单个或全部变更，error 为阻塞项
function printValidation(root, options) {
  const stage = options.stage || "all";
  validateStage(stage);
  if (stage !== "all") ensureInitialized(root);
  // stage=all 时不自动推导 change，校验所有变更
  const change = options.change || (stage === "all" ? undefined : resolveChangeName(root));
  const report = validateProject(root, { change, stage });
  if (options.json) {
    writeJson(report);
    return;
  }

  console.log(report.ok ? "CX 校验通过" : "CX 校验未通过");
  console.log("");
  console.log(`errors: ${report.summary.errors}, warnings: ${report.summary.warnings}`);

  for (const issue of report.issues) {
    console.log("");
    console.log(`${issue.severity.toUpperCase()}: ${issue.path}`);
    console.log(`  ${issue.message}`);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

// 归档变更：校验通过后将 change 目录移动到 archive/YYYY-MM-DD-<name>/
function archiveChange(root, options) {
  ensureInitialized(root);
  const changeName = resolveChangeName(root, options.change);
  const changeDir = cxPath(root, "changes", changeName);
  // 先用 archive stage 做严格校验，阻塞 error 不得归档
  const validation = validateProject(root, { change: changeName, stage: "archive" });
  const blocking = validation.issues.filter((issue) => issue.severity === "error");
  const warnings = validation.issues.filter((issue) => issue.severity === "warning");
  if (blocking.length > 0) {
    const result = {
      ok: false,
      change: changeName,
      message: "存在阻塞校验错误，不能归档。",
      issues: blocking,
    };
    if (options.json) writeJson(result);
    else {
      console.log(result.message);
      for (const issue of blocking) {
        console.log(`- ${issue.path}: ${issue.message}`);
      }
    }
    process.exit(1);
  }

  const evidence = readOptional(path.join(changeDir, "evidence.md"));
  const durableState = durableSpecState(evidence);

  // durable specs 状态不明确时阻塞归档，防止长期规范遗漏
  if (durableState === "unknown" || durableState === "pending") {
    const result = {
      ok: false,
      change: changeName,
      message: durableState === "pending"
        ? "evidence.md 仍是 Durable specs: pending sync。请先运行 sync 或改为 skipped because <reason>。"
        : "evidence.md 未明确 Durable specs: updated/skipped。请补齐后重试。",
    };
    if (options.json) writeJson(result);
    else console.log(result.message);
    process.exit(1);
  }

  const archiveName = `${today()}-${changeName}`;
  const archiveDir = cxPath(root, "archive", archiveName);
  const result = {
    ok: true,
    change: changeName,
    archive: relative(root, archiveDir),
    durableSpecs: durableState,
    dryRun: Boolean(options.dryRun),
    warnings,
  };

  if (!options.dryRun) {
    if (fs.existsSync(archiveDir)) {
      throw new Error(`归档目录已存在: ${relative(root, archiveDir)}`);
    }
    fs.mkdirSync(path.dirname(archiveDir), { recursive: true });
    fs.renameSync(changeDir, archiveDir);
  }

  if (options.json) {
    writeJson(result);
  } else {
    console.log(options.dryRun ? "CX 归档预检通过" : "CX 归档完成");
    console.log(`变更: ${changeName}`);
    console.log(`归档: ${result.archive}`);
    console.log(`Durable specs: ${durableState}`);
    for (const issue of warnings) {
      console.log(`WARNING: ${issue.path}: ${issue.message}`);
    }
  }
}

// 同步变更内的 spec delta 到 .cx/specs/，让长期规范成为未来需求的 source of truth
function syncChange(root, options) {
  ensureInitialized(root);
  const requested = options.change || options._[0];
  const changeName = resolveChangeName(root, requested);
  if (!options.dryRun) {
    ensureSyncReady(root, changeName);
  }
  const result = syncChangeSpecs(root, changeName, { dryRun: Boolean(options.dryRun) });

  if (options.json) {
    writeJson(result);
    return;
  }

  if (result.noChanges) {
    console.log(`CX spec sync: ${changeName} 没有可同步的 spec delta。`);
    return;
  }

  console.log(options.dryRun ? "CX spec sync 预检完成" : "CX spec sync 完成");
  console.log(`变更: ${changeName}`);
  for (const update of result.updates) {
    console.log(`- ${update.target}: +${update.added}, ~${update.modified}, -${update.removed}, →${update.renamed}`);
  }
  if (result.evidenceUpdated) {
    console.log("evidence.md: Durable specs 已更新为 updated");
  }
}

function ensureSyncReady(root, changeName) {
  const validation = validateProject(root, { change: changeName, stage: "review" });
  const blocking = validation.issues.filter((issue) => issue.severity === "error");
  if (blocking.length > 0) {
    const first = blocking[0];
    throw new Error(`sync 前必须通过 review stage 校验: ${first.path}: ${first.message}`);
  }

  const reviewPath = cxPath(root, "changes", changeName, "review.md");
  const review = parseReview(reviewPath);
  if (review.decision !== "PASS") {
    throw new Error("sync 前 review.md 必须包含 Decision: PASS。");
  }
}

// 创建 git worktree：为 Large 变更提供隔离工作区，需显式 --yes 确认
function worktreeChange(root, options) {
  ensureInitialized(root);
  const changeName = resolveChangeName(root, options.change);
  if (!fs.existsSync(cxPath(root, "changes", changeName))) {
    throw new Error(`变更不存在: ${changeName}`);
  }
  const worktreeDir = cxPath(root, "worktrees", changeName);
  const branch = options.branch || `cx/${changeName}`;
  const result = {
    ok: true,
    change: changeName,
    branch,
    path: relative(root, worktreeDir),
    dryRun: Boolean(options.dryRun),
    command: `git worktree add -b ${branch} ${relative(root, worktreeDir)} HEAD`,
  };

  ensureGitRepo(root);
  // worktree 目录必须被 gitignore，避免污染主仓库
  ensureIgnored(root, ".cx/worktrees/");
  if (fs.existsSync(worktreeDir)) {
    throw new Error(`worktree 目录已存在: ${relative(root, worktreeDir)}`);
  }

  if (!options.dryRun) {
    if (!options.yes) {
      throw new Error("创建 worktree 需要显式 --yes。先使用 --dry-run 预检。");
    }
    fs.mkdirSync(path.dirname(worktreeDir), { recursive: true });
    childProcess.execFileSync("git", ["worktree", "add", "-b", branch, worktreeDir, "HEAD"], {
      cwd: root,
      stdio: "pipe",
    });
  }

  if (options.json) {
    writeJson(result);
  } else {
    console.log(options.dryRun ? "CX worktree 预检通过" : "CX worktree 已创建");
    console.log(`变更: ${changeName}`);
    console.log(`分支: ${branch}`);
    console.log(`路径: ${result.path}`);
  }
}

// 构建完整状态快照：扫描 changes 目录，对每个变更推断阶段、下一步和校验结果
function buildStatus(root) {
  const initialized = fs.existsSync(cxPath(root));
  if (!initialized) {
    return { ok: true, initialized: false, root, changes: [], archives: [] };
  }

  const changes = listDirs(cxPath(root, "changes")).map((name) => {
    if (!isValidChangeName(name)) {
      return {
        name,
        phase: "invalid-name",
        next: "将变更目录重命名为 kebab-case change-id",
        files: emptyFileFlags(),
        tasks: null,
        review: null,
        durableSpecs: { state: "none", deltaFiles: [] },
        validation: { errors: 1, warnings: 0 },
      };
    }

    const dir = cxPath(root, "changes", name);
    const files = {
      debug: exists(dir, "debug.md"),
      contract: exists(dir, "contract.md"),
      design: exists(dir, "design.md"),
      tasks: exists(dir, "tasks.md"),
      evidence: exists(dir, "evidence.md"),
      review: exists(dir, "review.md"),
      visual: exists(dir, "visual", "style-guide.md"),
      visualPrototype: exists(dir, "visual", "prototype.html"),
      specDeltas: changeSpecDeltaFiles(root, name).length > 0,
      worktree: exists(cxPath(root, "worktrees", name)),
    };
    const tasks = files.tasks ? parseTasks(path.join(dir, "tasks.md")) : null;
    const review = files.review ? parseReview(path.join(dir, "review.md")) : null;
    const durableSpecs = inferDurableSpecStatus(root, name);
    const validationReport = validateChange(root, name, { stage: "all" });
    const validation = countIssues(validationReport);
    return {
      name,
      phase: inferPhase(files, tasks, review, durableSpecs),
      next: inferNext(files, tasks, validation, review, durableSpecs),
      files,
      tasks,
      review,
      durableSpecs,
      validation,
    };
  });

  const archives = listDirs(cxPath(root, "archive"))
    .sort()
    .reverse()
    .map((name) => ({ name }));

  return {
    ok: true,
    initialized,
    root,
    changes,
    archives,
  };
}

// 项目级校验：检查目录完整性，对所有（或指定）变更和 specs 运行对应 stage 的校验
function validateProject(root, options = {}) {
  ensureInitialized(root);
  const stage = options.stage || "all";
  validateStage(stage);
  const issues = [];

  // 确保核心子目录存在
  for (const dir of ["specs", "changes", "archive"]) {
    if (!fs.existsSync(cxPath(root, dir))) {
      issues.push(error(`.cx/${dir}`, "缺少必要目录。"));
    }
  }

  const changes = options.change ? [validateChangeName(options.change)] : listDirs(cxPath(root, "changes"));
  for (const changeName of changes) {
    if (!isValidChangeName(changeName)) {
      issues.push(error(`.cx/changes/${changeName}`, "变更名必须是 kebab-case，只能包含小写字母、数字和连字符。"));
      continue;
    }
    if (!fs.existsSync(cxPath(root, "changes", changeName))) {
      issues.push(error(`.cx/changes/${changeName}`, "变更不存在。"));
      continue;
    }
    issues.push(...validateChange(root, changeName, { stage }));
  }

  // 全量校验或归档阶段需要校验 durable specs 文件
  if (stage === "all" || stage === "archive") {
    for (const specPath of listMarkdownFiles(cxPath(root, "specs"))) {
      issues.push(...validateSpecFile(root, specPath));
    }
  }

  return {
    ...reportFromIssues(issues),
    stage,
    change: options.change || null,
  };
}

// 单个变更校验：按 stage 检查对应产物文件是否存在、章节是否完整、门禁是否满足
function validateChange(root, changeName, options = {}) {
  validateChangeName(changeName);
  const stage = options.stage || "all";
  const changeDir = cxPath(root, "changes", changeName);
  const issues = [];

  const contractPath = path.join(changeDir, "contract.md");
  const debugPath = path.join(changeDir, "debug.md");
  const designPath = path.join(changeDir, "design.md");
  const tasksPath = path.join(changeDir, "tasks.md");
  const evidencePath = path.join(changeDir, "evidence.md");
  const reviewPath = path.join(changeDir, "review.md");
  const visualDir = path.join(changeDir, "visual");
  const prototypePath = path.join(visualDir, "prototype.html");
  const styleGuidePath = path.join(visualDir, "style-guide.md");

  // debug 阶段：只关心 debug.md
  if (stage === "debug") {
    if (!fs.existsSync(debugPath)) {
      issues.push(error(relCx(root, debugPath), "debug 阶段必须包含 debug.md。"));
    } else {
      issues.push(...validateDebug(root, debugPath));
    }
    return issues;
  }

  // contract 是 Normal/Large 变更的必需品
  if (!fs.existsSync(contractPath)) {
    issues.push(error(relCx(root, contractPath), "Normal/Large 变更必须包含 contract.md。"));
  } else {
    issues.push(...validateContract(root, contractPath));
  }

  // debug.md 如果存在就校验，不管当前 stage
  if (fs.existsSync(debugPath)) {
    issues.push(...validateDebug(root, debugPath));
  }

  issues.push(...validateChangeSpecDeltas(root, changeName));

  // visual 阶段校验原型和样式规范
  if (stage === "visual") {
    if (!fs.existsSync(prototypePath)) {
      issues.push(error(relCx(root, prototypePath), "visual 阶段必须包含 prototype.html。"));
    } else {
      issues.push(...validatePrototype(root, prototypePath));
    }
    if (!fs.existsSync(styleGuidePath)) {
      issues.push(error(relCx(root, styleGuidePath), "visual 阶段必须包含 style-guide.md。"));
    } else {
      issues.push(...validateVisual(root, styleGuidePath));
    }
  } else if (fs.existsSync(visualDir) && !fs.existsSync(styleGuidePath)) {
    issues.push(warn(relCx(root, visualDir), "存在 visual/ 但缺少 style-guide.md。"));
  } else if (fs.existsSync(styleGuidePath)) {
    if (!fs.existsSync(prototypePath)) {
      issues.push(error(relCx(root, prototypePath), "下游阶段必须已有 visual/prototype.html。"));
    }
    issues.push(...validateVisual(root, styleGuidePath));
  }

  // design 阶段必须存在 design.md；非 design 阶段有则校验
  if (stage === "design") {
    if (!fs.existsSync(designPath)) {
      issues.push(error(relCx(root, designPath), "design 阶段必须包含 design.md。"));
    } else {
      issues.push(...validateDesign(root, designPath));
    }
  } else if (fs.existsSync(designPath)) {
    issues.push(...validateDesign(root, designPath));
  }

  // tasks 及下游阶段必须有 tasks.md，且 verify/review/archive 阶段要求所有实现任务已完成
  if (["tasks", "build", "verify", "review", "archive"].includes(stage)) {
    if (!fs.existsSync(tasksPath)) {
      issues.push(error(relCx(root, tasksPath), `${stage} 阶段必须包含 tasks.md。`));
    } else {
      issues.push(...validateTasks(root, tasksPath, { strict: STRICT_TASK_STAGES.has(stage) }));
      const progress = parseTasks(tasksPath);
      if (["verify", "review", "archive"].includes(stage) && progress.implementationRemaining > 0) {
        issues.push(
          error(
            relCx(root, tasksPath),
            `${stage} 阶段要求所有实现任务已完成，当前剩余 ${progress.implementationRemaining} 个。`
          )
        );
      }
    }
  } else if (stage === "all" && !fs.existsSync(tasksPath)) {
    issues.push(warn(relCx(root, tasksPath), "尚未创建 tasks.md，无法执行 TDD 任务。"));
  } else if (fs.existsSync(tasksPath)) {
    issues.push(...validateTasks(root, tasksPath));
  }

  // evidence 在 verify/review/archive 阶段必须存在
  if (["verify", "review", "archive"].includes(stage)) {
    if (!fs.existsSync(evidencePath)) {
      issues.push(error(relCx(root, evidencePath), `${stage} 阶段必须包含 evidence.md。`));
    } else {
      issues.push(
        ...validateEvidence(root, evidencePath, {
          requireDurableState: stage === "archive",
          strict: STRICT_EVIDENCE_STAGES.has(stage),
        })
      );
      if (stage === "archive" && fs.existsSync(contractPath)) {
        issues.push(...validateArchiveDurableSpecs(root, changeName, contractPath, evidencePath));
      }
    }
  } else if (stage === "all" && !fs.existsSync(evidencePath)) {
    issues.push(warn(relCx(root, evidencePath), "尚未创建 evidence.md，不能声称完成。"));
  } else if (fs.existsSync(evidencePath)) {
    issues.push(...validateEvidence(root, evidencePath));
  }

  // review 在 review/archive 阶段必须存在，archive 阶段要求 Decision: PASS
  if (["review", "archive"].includes(stage)) {
    if (!fs.existsSync(reviewPath)) {
      issues.push(error(relCx(root, reviewPath), `${stage} 阶段必须包含 review.md。`));
    } else {
      issues.push(...validateReview(root, reviewPath, { requirePass: stage === "archive" }));
    }
  } else if (fs.existsSync(reviewPath)) {
    issues.push(...validateReview(root, reviewPath, { requirePass: false }));
  }

  return issues;
}

// 校验 contract.md：必须包含核心章节，Scope In/Out 非空，有 Requirement+Scenario，Spec Delta 明确
function validateContract(root, filePath) {
  const content = read(filePath);
  const body = visibleMarkdownContent(content);
  const issues = [];
  const rel = relCx(root, filePath);

  for (const heading of ["## Intent", "## Scope", "## Requirements", "## Related Durable Specs", "## Spec Delta", "## Verification"]) {
    if (!hasHeading(content, heading)) issues.push(error(rel, `缺少章节: ${heading}`));
  }

  if (!/^\s*-\s*In:\s*\S.+$/m.test(body)) {
    issues.push(error(rel, "Scope 必须包含非空 `- In:`。"));
  }
  if (!/^\s*-\s*Out:\s*\S.+$/m.test(body)) {
    issues.push(error(rel, "Scope 必须包含非空 `- Out:`。"));
  }

  const requirements = parseRequirementBlocks(content);
  if (requirements.length === 0) {
    issues.push(error(rel, "Requirements 必须包含至少一个 `### Requirement:`。"));
  }
  for (const requirement of requirements) {
    if (requirement.scenarios.length === 0) {
      issues.push(error(rel, `Requirement 缺少 Scenario: ${requirement.name}`));
    }
  }

  const inlineDelta = parseSpecDelta(content);
  const externalReferences = externalSpecDeltaReferences(content);
  const localDeltaReferences = localChangeSpecDeltaReferences(filePath);
  const hasChangeDeltas = localDeltaReferences.length > 0;

  // Contract 阶段必须明确 durable specs 意图，否则到 archive 才返工成本很高
  if (!hasSpecDelta(content) && !hasChangeDeltas) {
    issues.push(
      error(rel, "Spec Delta 未声明 ADDED/MODIFIED/REMOVED/RENAMED、未引用 delta files，也未写 Skipped 原因。")
    );
  }
  if (inlineDelta.hasSubstantiveDelta) {
    issues.push(
      error(
        rel,
        "长期 Spec Delta 必须写入 .cx/changes/<change-id>/specs/*.md，并在 contract 中用 `Delta files:` 引用。"
      )
    );
  }
  if (inlineDelta.hasSkipped && (externalReferences.length > 0 || hasChangeDeltas)) {
    issues.push(
      error(rel, "Spec Delta 不能同时写 Skipped 和 Delta files/change-local delta 文件。")
    );
  }
  issues.push(...validateExternalSpecDeltaReferences(root, filePath, content));
  issues.push(...validateReferencedSpecDeltaFiles(root, filePath, externalReferences, localDeltaReferences));
  issues.push(...validateRelatedDurableSpecs(root, filePath, content, externalReferences));

  const verification = section(content, "## Verification");
  if (!/^\s*-\s+\S/m.test(verification)) {
    issues.push(error(rel, "Verification 必须包含至少一个命令或人工检查项。"));
  }

  return issues;
}

// 校验 tasks.md：严格阶段必须显式保留 RED/GREEN 和可执行命令
function validateTasks(root, filePath, options = {}) {
  const content = read(filePath);
  const body = visibleMarkdownContent(content);
  const issues = [];
  const rel = relCx(root, filePath);
  const tasks = parseTasks(filePath);
  const missingStep = options.strict ? error : warn;

  if (tasks.total === 0) {
    issues.push(error(rel, "tasks.md 必须包含 checkbox 任务。"));
  }
  if (!/RED:/i.test(body)) {
    issues.push(missingStep(rel, "tasks.md 未显式包含 RED 步骤。"));
  }
  if (!/GREEN:/i.test(body)) {
    issues.push(missingStep(rel, "tasks.md 未显式包含 GREEN 步骤。"));
  }
  if (!/Command:\s*`[^`]+`/.test(body)) {
    issues.push(missingStep(rel, "tasks.md 未包含明确的 Command。"));
  }
  issues.push(...validateTaskRequirementGroups(root, filePath, content, { strict: options.strict }));
  issues.push(...validateTaskNarrativeLanguage(root, filePath, content, { strict: options.strict }));
  issues.push(...validateParallelExecutionPlan(root, filePath, content, tasks, { strict: options.strict }));

  return issues;
}

// 校验 tasks.md 的自然语言说明：固定英文标签可保留，标签后的叙述必须用中文
function validateTaskNarrativeLanguage(root, filePath, content, options = {}) {
  const issues = [];
  const rel = relCx(root, filePath);
  const issue = options.strict ? error : warn;
  const requirementNames = [];
  const taskTexts = [];
  const fieldTexts = [];
  const parallelTexts = [];

  for (const line of visibleMarkdownLines(content)) {
    const requirement = line.match(/^\s*##\s+Requirement:\s*(.+?)\s*$/);
    if (requirement && needsChineseNarrative(requirement[1])) {
      requirementNames.push(requirement[1].trim());
      continue;
    }

    const task = line.match(/^\s*-\s*\[[ xX]\]\s*(.+?)\s*$/);
    if (task) {
      const narrative = task[1]
        .replace(/^\d+\.\s*/, "")
        .replace(/^(RED|GREEN|VERIFY|REFACTOR):\s*/i, "")
        .trim();
      if (needsChineseNarrative(narrative)) taskTexts.push(task[1].trim());
      continue;
    }

    const field = line.match(/^\s*-\s*(Expected failure|Scope):\s*(.+?)\s*$/i);
    if (field && needsChineseNarrative(field[2])) {
      fieldTexts.push(`${field[1]}: ${field[2].trim()}`);
      continue;
    }

    const parallel = line.match(/^\s*Parallel build:\s*(?:enabled|skipped)\s+because\s+(.+?)\s*$/i);
    if (parallel && needsChineseNarrative(parallel[1])) {
      parallelTexts.push(`Parallel build because: ${parallel[1].trim()}`);
      continue;
    }

    const serial = line.match(/^\s*-\s*Serial phase:\s*(.+?)\s*$/i);
    if (serial && needsChineseNarrative(serial[1])) {
      parallelTexts.push(`Serial phase: ${serial[1].trim()}`);
    }
  }

  if (requirementNames.length > 0) {
    issues.push(
      issue(
        rel,
        `Requirement 名称应使用中文描述，保留英文专业术语即可。示例: ${sampleList(requirementNames)}`
      )
    );
  }
  if (taskTexts.length > 0) {
    issues.push(
      issue(
        rel,
        `任务动作说明应使用中文描述，保留 RED/GREEN/VERIFY/REFACTOR 标签即可。示例: ${sampleList(taskTexts)}`
      )
    );
  }
  if (fieldTexts.length > 0) {
    issues.push(
      issue(
        rel,
        `Expected failure 和 Scope 的说明应使用中文。示例: ${sampleList(fieldTexts)}`
      )
    );
  }
  if (parallelTexts.length > 0) {
    issues.push(
      issue(
        rel,
        `Parallel Execution Plan 的原因和阶段说明应使用中文。示例: ${sampleList(parallelTexts)}`
      )
    );
  }

  return issues;
}

// 校验并行计划：多任务或前后端工程必须给下游 build 明确可并行边界
function validateParallelExecutionPlan(root, filePath, content, tasks, options = {}) {
  const issues = [];
  const rel = relCx(root, filePath);
  const issue = options.strict ? error : warn;
  const body = visibleMarkdownContent(content);
  const planRequired = tasks.implementationTotal >= 16 || looksLikeFrontendBackendWork(body);
  const hasPlan = hasHeading(content, "## Parallel Execution Plan");

  if (planRequired && !hasPlan) {
    issues.push(
      issue(
        rel,
        "多任务或前后端/服务端工程必须包含 `## Parallel Execution Plan`，为下游 build 声明串行阶段、worker、写入范围、命令和依赖。"
      )
    );
    return issues;
  }
  if (!hasPlan) return issues;

  const plan = section(content, "## Parallel Execution Plan");
  const planLines = visibleMarkdownLines(plan);
  const planBody = planLines.join("\n");
  const parallelLine = planLines.find((line) => /^\s*Parallel build:/i.test(line));
  const parallel = parallelLine
    ? parallelLine.match(/^\s*Parallel build:\s*(enabled|skipped)\s+because\s+(.+?)\s*$/i)
    : null;

  if (!parallel) {
    issues.push(
      issue(
        rel,
        "Parallel Execution Plan 必须包含 `Parallel build: enabled/skipped because <中文原因>`。"
      )
    );
    return issues;
  }

  const status = parallel[1].toLowerCase();
  const reason = parallel[2].trim();
  const workerCount = planLines.filter((line) => /^\s*-\s*Worker:\s*\S/i.test(line)).length;
  const hasSerialPhase = planLines.some((line) => {
    const serial = line.match(/^\s*-\s*Serial phase:\s*(.+?)\s*$/i);
    return serial && !isPlaceholderValue(serial[1]);
  });

  if (status === "enabled") {
    if (workerCount === 0) {
      issues.push(issue(rel, "Parallel build enabled 时必须至少声明一个 `Worker`。"));
    }
    for (const field of ["Tasks", "Write scope", "Commands", "Depends on"]) {
      const pattern = new RegExp(`^\\s*-\\s*${field}:\\s*\\S`, "im");
      if (!pattern.test(planBody)) {
        issues.push(issue(rel, `每个并行计划必须声明 ${field}。`));
      }
    }
  }

  if (status === "skipped" && workerCount > 0) {
    issues.push(issue(rel, "Parallel build skipped 时不应同时声明 Worker；如已有可并行 worker，应改为 enabled。"));
  }

  if (planRequired && status === "skipped" && workerCount === 0) {
    if (mentionsFoundationOnly(reason) || hasSerialPhase) {
      issues.push(
        issue(
          rel,
          "共享 Foundation/Bootstrap 或早期基础设施只能作为 `Serial phase`，不能作为整个大型工程跳过并行 build 的理由。"
        )
      );
    } else if (!explicitlyAllSerial(reason)) {
      issues.push(
        issue(
          rel,
          "大型/多任务/前后端工程整体 skipped 时，必须明确说明所有实现任务都无法拆出独立 Write scope 和 Commands；否则应规划串行阶段后的并行 worker。"
        )
      );
    }
  }

  return issues;
}

// 校验 design.md：必须有标题和关键决策/方案，建议包含测试策略
function validateDesign(root, filePath) {
  const content = read(filePath);
  const body = visibleMarkdownContent(content);
  const issues = [];
  const rel = relCx(root, filePath);

  if (!/^#\s+\S/m.test(body)) {
    issues.push(error(rel, "design.md 必须包含标题。"));
  }
  if (!/(关键决策|决策|Decision|方案)/i.test(body)) {
    issues.push(error(rel, "design.md 必须包含关键决策或方案说明。"));
  }
  if (!/(测试|Test|Verification|验证)/i.test(body)) {
    issues.push(warn(rel, "design.md 建议包含测试或验证策略。"));
  }

  return issues;
}

// 校验 prototype.html：单文件 HTML，可通过浏览器打开
function validatePrototype(root, filePath) {
  const content = read(filePath);
  const issues = [];
  const rel = relCx(root, filePath);

  if (!/<html/i.test(content) || !/<body/i.test(content)) {
    issues.push(error(rel, "prototype.html 必须是可独立打开的 HTML 文件。"));
  }

  return issues;
}

// 校验 style-guide.md：视觉规范必须声明色板和字体系统
function validateVisual(root, filePath) {
  const content = read(filePath);
  const body = visibleMarkdownContent(content);
  const issues = [];
  const rel = relCx(root, filePath);

  if (!/(色板|Palette|Color)/i.test(body)) {
    issues.push(error(rel, "style-guide.md 必须包含色板/Palette。"));
  }
  if (!/(字体|Typography|Font)/i.test(body)) {
    issues.push(error(rel, "style-guide.md 必须包含字体/Typography。"));
  }
  if (!/prototype\.html/i.test(body)) {
    issues.push(error(rel, "style-guide.md 必须声明下游读取 visual/prototype.html。"));
  }

  return issues;
}

// 校验 evidence.md：必须包含必选章节，验证结果无 FAIL，durable specs 状态明确
function validateEvidence(root, filePath, options = {}) {
  const content = read(filePath);
  const issues = [];
  const rel = relCx(root, filePath);

  for (const heading of REQUIRED_EVIDENCE_SECTIONS) {
    if (!hasHeading(content, heading)) issues.push(error(rel, `缺少章节: ${heading}`));
  }

  const results = verificationResults(content);
  if (results.length === 0) {
    const issue = "Verification Commands 表中未发现 PASS/FAIL/SKIPPED 结果。";
    issues.push(options.strict ? error(rel, issue) : warn(rel, issue));
  }
  // FAIL 结果是硬阻塞，不得进入下游
  if (results.includes("FAIL")) {
    issues.push(error(rel, "Verification Commands 存在 FAIL，不能进入下游。"));
  }
  if (options.strict && results.length > 0 && !results.includes("PASS")) {
    issues.push(error(rel, "Verification Commands 必须包含至少一个 PASS 结果。"));
  }

  if (!hasRequirementCoverage(content)) {
    const issue = "Requirement Coverage 必须包含至少一条非占位证据。";
    issues.push(options.strict ? error(rel, issue) : warn(rel, issue));
  }
  issues.push(...validateRegressionEvidence(root, filePath, content, { strict: options.strict }));
  issues.push(...validateTddEvidence(root, filePath, content, { strict: options.strict }));

  const durableState = durableSpecState(content);
  if (durableState === "unknown") {
    const issue = "Diff Review 未明确 Durable specs: updated/skipped/pending sync。";
    issues.push(options.requireDurableState ? error(rel, issue) : warn(rel, issue));
  }
  if (durableState === "pending" && options.requireDurableState) {
    issues.push(error(rel, "Diff Review 仍是 Durable specs: pending sync，归档前必须 sync 或 skipped。"));
  }

  return issues;
}

// 校验 review.md：必须包含六大章节，Decision 唯一，archive 阶段要求 PASS
function validateReview(root, filePath, options = {}) {
  const content = read(filePath);
  const issues = [];
  const rel = relCx(root, filePath);

  for (const heading of REQUIRED_REVIEW_SECTIONS) {
    if (!hasHeading(content, heading)) issues.push(error(rel, `缺少章节: ${heading}`));
  }

  const decisions = reviewDecisions(content);
  const decision = decisions.length === 1 ? decisions[0] : null;

  if (decisions.length > 1) {
    issues.push(error(rel, "review.md 只能包含一个明确的 Decision。"));
  }

  if (options.requirePass && decision !== "PASS") {
    issues.push(error(rel, "归档前 review.md 的 Decision 必须是 PASS。"));
  } else if (!decision) {
    issues.push(warn(rel, "review.md 建议明确 `Decision: PASS` 或 `Decision: NEEDS_CHANGES`。"));
  }

  return issues;
}

// 核验归档时 durable specs 同步：确保证据声明的 updated/skipped 与实际 spec 文件一致
function validateArchiveDurableSpecs(root, changeName, contractPath, evidencePath) {
  const issues = [];
  const evidence = read(evidencePath);
  const state = durableSpecState(evidence);
  const evidenceRel = relCx(root, evidencePath);
  const delta = aggregateSpecDelta(root, changeName, contractPath);

  if (state === "skipped") {
    // skipped 必须附 because 原因
    if (!/Durable specs:\s*skipped\s+because\s+\S/i.test(evidence)) {
      issues.push(error(evidenceRel, "Durable specs skipped 必须包含 because 原因。"));
    }
    // 如果 contract 声明了长期需求但选择跳过，提醒确认
    if (delta.hasSubstantiveDelta) {
      issues.push(
        warn(
          relCx(root, contractPath),
          "Spec Delta 声明了长期需求，但 evidence 选择跳过 durable specs，请确认原因充分。"
        )
      );
    }
    return issues;
  }

  if (state !== "updated") return issues;

  // updated 状态下，必须能在 .cx/specs/ 中找到 contract 声明的所有 Requirement
  const specFiles = listMarkdownFiles(cxPath(root, "specs"));
  if (specFiles.length === 0) {
    issues.push(error(".cx/specs", "Durable specs 标记为 updated，但 .cx/specs 下没有 spec 文件。"));
    return issues;
  }

  const durableRequirements = new Set();
  for (const specFile of specFiles) {
    for (const requirement of parseRequirementBlocks(read(specFile))) {
      durableRequirements.add(requirement.name);
    }
  }

  for (const requirement of delta.updatedRequirements) {
    if (!durableRequirements.has(requirement)) {
      issues.push(
        error(
          evidenceRel,
          `Durable specs 标记为 updated，但 .cx/specs 中未找到 Requirement: ${requirement}`
        )
      );
    }
  }

  for (const requirement of delta.removedRequirements) {
    if (durableRequirements.has(requirement)) {
      issues.push(
        error(
          evidenceRel,
          `Durable specs 标记为 updated，但 .cx/specs 中仍存在已移除 Requirement: ${requirement}`
        )
      );
    }
  }

  if (!delta.hasSubstantiveDelta) {
    issues.push(
      error(
        delta.sources.length > 0 ? delta.sources.join(", ") : relCx(root, contractPath),
        "Durable specs 标记为 updated，但 Spec Delta 没有可核对的实质变更。"
      )
    );
  }

  return issues;
}

// 校验 debug.md：必须包含 Observed/Expected/Reproduction/Hypotheses/Regression Test 五章节
function validateDebug(root, filePath) {
  const content = read(filePath);
  const body = visibleMarkdownContent(content);
  const issues = [];
  const rel = relCx(root, filePath);

  for (const heading of REQUIRED_DEBUG_SECTIONS) {
    if (!hasHeading(content, heading)) issues.push(error(rel, `缺少章节: ${heading}`));
  }

  if (!/(失败测试|regression|Regression|复现)/i.test(body)) {
    issues.push(warn(rel, "debug.md 应说明如何用 regression test 复现问题。"));
  }
  if (!/^\s*Confirmed reproduction:\s*\S.+$/im.test(body)) {
    issues.push(error(rel, "debug.md 必须包含非空 `Confirmed reproduction:` 固定行。"));
  }
  if (!/^\s*Regression test fails before fix:\s*\S.+$/im.test(body)) {
    issues.push(error(rel, "debug.md 必须包含非空 `Regression test fails before fix:` 固定行。"));
  }

  return issues;
}

// 校验 durable spec 文件：必须有 Requirement 且每个 Requirement 至少有一个 Scenario
function validateSpecFile(root, filePath) {
  const content = read(filePath);
  const rel = relCx(root, filePath);
  const issues = [];
  const requirements = parseRequirementBlocks(content);

  if (requirements.length === 0) {
    issues.push(error(rel, "durable spec 必须包含至少一个 `### Requirement:`。"));
  }
  for (const requirement of requirements) {
    if (requirement.scenarios.length === 0) {
      issues.push(error(rel, `durable spec requirement 缺少 Scenario: ${requirement.name}`));
    }
  }
  return issues;
}

// 校验单个变更内的 spec delta 文件：.cx/changes/<id>/specs/*.md
function validateChangeSpecDeltas(root, changeName) {
  const issues = [];
  for (const specPath of changeSpecDeltaFiles(root, changeName)) {
    const content = read(specPath);
    const rel = relCx(root, specPath);
    const operations = parseDeltaSpecOperations(content);
    const total =
      operations.added.length +
      operations.modified.length +
      operations.removed.length +
      operations.renamed.length;

    if (total === 0) {
      issues.push(error(rel, "spec delta 必须包含 ADDED/MODIFIED/REMOVED/RENAMED Requirements。"));
      continue;
    }
    if (
      !fs.existsSync(durableSpecTargetForDelta(root, changeName, specPath)) &&
      (operations.modified.length > 0 || operations.removed.length > 0 || operations.renamed.length > 0)
    ) {
      issues.push(error(rel, "MODIFIED/REMOVED/RENAMED 只能用于已存在的 durable spec；新 spec 只能使用 ADDED。"));
    }

    for (const block of operations.added.concat(operations.modified)) {
      if (!cleanRequirementName(block.name)) {
        issues.push(error(rel, "spec delta Requirement 名称不能为空或模板占位符。"));
        continue;
      }
      const parsed = parseRequirementBlocks(block.raw);
      if (parsed.length !== 1) {
        issues.push(error(rel, `Requirement 块格式无效: ${block.name}`));
      } else if (parsed[0].scenarios.length === 0) {
        issues.push(error(rel, `spec delta Requirement 缺少 Scenario: ${block.name}`));
      }
    }

    const duplicate = firstDuplicate(
      operations.added
        .concat(operations.modified)
        .map((block) => normalizeRequirementName(block.name))
        .concat(operations.removed.map(normalizeRequirementName))
    );
    if (duplicate) {
      issues.push(error(rel, `同一个 Requirement 不应在多个 delta 操作中重复出现: ${duplicate}`));
    }
  }
  return issues;
}

function validateExternalSpecDeltaReferences(root, filePath, content) {
  const issues = [];
  const rel = relCx(root, filePath);
  const changeDir = path.dirname(filePath);
  const specRoot = path.resolve(changeDir, "specs");

  for (const reference of externalSpecDeltaReferences(content)) {
    if (!reference.startsWith("specs/") || !reference.endsWith(".md")) {
      issues.push(error(rel, `Spec Delta 引用必须是 specs/*.md 相对路径: ${reference}`));
      continue;
    }
    const target = path.resolve(changeDir, reference);
    if (!isInsidePath(specRoot, target)) {
      issues.push(error(rel, `Spec Delta 引用路径越界: ${reference}`));
      continue;
    }
    if (!fs.existsSync(target)) {
      issues.push(error(rel, `Spec Delta 引用了不存在的 delta 文件: ${reference}`));
    }
  }

  return issues;
}

function validateReferencedSpecDeltaFiles(root, filePath, externalReferences, localDeltaReferences) {
  const issues = [];
  const rel = relCx(root, filePath);
  const referenced = new Set(externalReferences.map(normalizeSpecReference));
  const local = new Set(localDeltaReferences.map(normalizeSpecReference));

  if (local.size > 0 && referenced.size === 0) {
    issues.push(error(rel, "存在 change-local spec delta，但 contract 未用 `Delta files:` 明确引用。"));
  }

  for (const reference of local) {
    if (!referenced.has(reference)) {
      issues.push(error(rel, `change-local spec delta 未被 contract 引用: ${reference}`));
    }
  }

  return issues;
}

function validateRelatedDurableSpecs(root, filePath, content, externalReferences) {
  const issues = [];
  const rel = relCx(root, filePath);
  if (!hasHeading(content, "## Related Durable Specs")) return issues;

  const related = parseRelatedDurableSpecRows(content);
  const deltaReferences = new Set(externalReferences.map(normalizeSpecReference));

  if (related.none) {
    if (related.rows.length > 0) {
      issues.push(error(rel, "`## Related Durable Specs` 不能同时写 None 和表格。"));
    }
    if (deltaReferences.size > 0) {
      issues.push(error(rel, "`## Related Durable Specs` 为 None 时不能声明 Delta files。"));
    }
    return issues;
  }

  if (related.rows.length === 0) {
    issues.push(error(rel, "`## Related Durable Specs` 必须写 None 或包含 Spec file/Status 表格。"));
    return issues;
  }
  if (!related.hasHeader) {
    issues.push(error(rel, "`## Related Durable Specs` 表格必须包含 `Spec file` 和 `Status` 表头。"));
  }

  const allowed = new Set(["unchanged", "modified", "added", "removed", "renamed"]);
  const changedStatuses = new Set(["modified", "added", "removed", "renamed"]);
  const changedSpecs = new Set();
  const specFiles = [];

  for (const row of related.rows) {
    specFiles.push(row.specFile);
    if (!row.specFile.startsWith("specs/") || !row.specFile.endsWith(".md")) {
      issues.push(error(rel, `Related Durable Specs 的 Spec file 必须是 specs/*.md: ${row.specFile}`));
    }
    if (!allowed.has(row.status)) {
      issues.push(error(rel, `Related Durable Specs 的 Status 非法: ${row.status}`));
      continue;
    }
    if (["unchanged", "modified", "removed", "renamed"].includes(row.status)) {
      const specPath = durableSpecPathFromReference(root, row.specFile);
      if (!specPath || !fs.existsSync(specPath)) {
        issues.push(error(rel, `Related Durable Specs 标记为 ${row.status} 的 spec 必须已存在: ${row.specFile}`));
      }
    }
    if (changedStatuses.has(row.status)) {
      changedSpecs.add(row.specFile);
    }
  }

  const duplicate = firstDuplicate(specFiles.map((value) => value.toLowerCase()));
  if (duplicate) {
    issues.push(error(rel, `Related Durable Specs 不应重复列出同一个 spec: ${duplicate}`));
  }

  for (const specFile of changedSpecs) {
    if (!deltaReferences.has(specFile)) {
      issues.push(error(rel, `Status 为 modified/added/removed/renamed 的 spec 必须出现在 Delta files: ${specFile}`));
    }
  }
  for (const reference of deltaReferences) {
    if (!changedSpecs.has(reference)) {
      issues.push(error(rel, `Delta files 必须在 Related Durable Specs 中标记为 modified/added/removed/renamed: ${reference}`));
    }
  }

  return issues;
}

function parseRelatedDurableSpecRows(content) {
  const body = section(content, "## Related Durable Specs");
  const none = sectionHasNone(body);
  const tableRows = markdownTableRows(body);
  const hasHeader = tableRows.some((row) => isTableHeader(row, ["Spec file", "Status"]));
  const rows = [];

  for (const row of tableRows) {
    if (isTableHeader(row, ["Spec file", "Status"])) continue;
    const specFile = normalizeSpecReference(row[0]);
    const status = cleanTableCell(row[1]).toLowerCase();
    if (!isPlaceholderValue(specFile) || !isPlaceholderValue(status)) {
      rows.push({ specFile, status });
    }
  }

  return { none, hasHeader, rows };
}

function localChangeSpecDeltaReferences(contractPath) {
  const changeDir = path.dirname(contractPath);
  return listMarkdownFiles(path.join(changeDir, "specs"))
    .map((filePath) => normalizeSpecReference(path.relative(changeDir, filePath)));
}

function validateTaskRequirementGroups(root, filePath, content, options = {}) {
  const groups = taskRequirementGroups(content);
  const issues = [];
  const rel = relCx(root, filePath);
  const issue = options.strict ? error : warn;

  if (groups.length === 0) {
    issues.push(issue(rel, "tasks.md 必须按 `## Requirement:` 分组声明 TDD 任务。"));
    return issues;
  }

  for (const group of groups) {
    if (!/^\s*-\s*\[[ xX]\]/m.test(group.body)) {
      issues.push(issue(rel, `Requirement 任务组缺少 checkbox 任务: ${group.name}`));
    }
    for (const label of ["RED", "GREEN", "VERIFY", "REFACTOR"]) {
      const pattern = new RegExp(`\\b${label}:`, "i");
      if (!pattern.test(group.body)) {
        issues.push(issue(rel, `Requirement 任务组缺少 ${label} 步骤: ${group.name}`));
      }
    }
    if (!/Command:\s*`[^`]+`/.test(group.body)) {
      issues.push(issue(rel, `Requirement 任务组缺少明确 Command: ${group.name}`));
    }
  }

  return issues;
}

function taskRequirementGroups(content) {
  const lines = visibleMarkdownLines(content);
  const groups = [];
  let current = null;

  for (const line of lines) {
    const heading = parseMarkdownHeading(line);
    if (heading && heading.level === 2 && heading.title.startsWith("Requirement:")) {
      if (current) groups.push(current);
      current = { name: heading.title.replace(/^Requirement:\s*/i, "").trim(), lines: [] };
      continue;
    }
    if (heading && heading.level <= 2 && current) {
      groups.push(current);
      current = null;
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) groups.push(current);

  return groups.map((group) => ({
    name: group.name,
    body: group.lines.join("\n"),
  }));
}

function validateRegressionEvidence(root, filePath, content, options = {}) {
  const issues = [];
  const rel = relCx(root, filePath);
  const issue = options.strict ? error : warn;
  if (!hasHeading(content, "## Regression")) return issues;

  const regression = parseRegressionRows(content);
  if (regression.none && regression.rows.length > 0) {
    issues.push(error(rel, "`## Regression` 不能同时写 None 和表格。"));
  }
  if (regression.rows.length > 0 && !regression.hasHeader) {
    issues.push(issue(rel, "`## Regression` 表格必须包含固定列名。"));
  }

  const allowed = new Set(["PASS", "FAIL", "N/A (MODIFIED)", "N/A (REMOVED)"]);
  const passRows = new Set();
  for (const row of regression.rows) {
    if (row.raw.length < 5) {
      issues.push(issue(rel, "`## Regression` 表格每行必须包含 5 列。"));
      continue;
    }
    if (!allowed.has(row.result)) {
      issues.push(error(rel, `Regression Result 非法: ${row.result}`));
    }
    if (row.result === "FAIL") {
      issues.push(error(rel, "Regression 存在 FAIL，不能进入下游。"));
    }
    if (row.result === "PASS") {
      passRows.add(regressionEvidenceKey(row.requirement, row.scenario, row.sourceSpec));
    }
    for (const [field, value] of [
      ["Requirement", row.requirement],
      ["Scenario", row.scenario],
      ["Source Spec", row.sourceSpec],
      ["Evidence", row.evidence],
    ]) {
      if (isPlaceholderValue(value)) {
        issues.push(issue(rel, `Regression 表格存在空字段: ${field}`));
      }
    }
  }

  const expected = expectedUnchangedRegressionItems(root, filePath);
  issues.push(...expected.issues);
  if (expected.items.length === 0) return issues;

  if (regression.none) {
    issues.push(error(rel, "contract 存在 unchanged durable specs，`## Regression` 不能写 None。"));
    return issues;
  }

  for (const item of expected.items) {
    const key = regressionEvidenceKey(item.requirement, item.scenario, item.sourceSpec);
    if (!passRows.has(key)) {
      issues.push(
        error(
          rel,
          `缺少 unchanged durable spec 的 PASS 回归证据: ${item.sourceSpec} / ${item.requirement} / ${item.scenario}`
        )
      );
    }
  }

  return issues;
}

function parseRegressionRows(content) {
  const body = section(content, "## Regression");
  const tableRows = markdownTableRows(body);
  const hasHeader = tableRows.some((row) => isTableHeader(row, ["Requirement (Durable - Unchanged)", "Scenario", "Source Spec", "Evidence", "Result"]));
  const rows = [];

  for (const row of tableRows) {
    if (isTableHeader(row, ["Requirement (Durable - Unchanged)", "Scenario", "Source Spec", "Evidence", "Result"])) continue;
    rows.push({
      raw: row,
      requirement: cleanTableCell(row[0]),
      scenario: cleanTableCell(row[1]),
      sourceSpec: normalizeSpecReference(row[2]),
      evidence: cleanTableCell(row[3]),
      result: cleanTableCell(row[4]).toUpperCase(),
    });
  }

  return { none: sectionHasNone(body), hasHeader, rows };
}

function expectedUnchangedRegressionItems(root, evidencePath) {
  const issues = [];
  const items = [];
  const changeDir = path.dirname(evidencePath);
  const contractPath = path.join(changeDir, "contract.md");
  if (!fs.existsSync(contractPath)) return { issues, items };

  const related = parseRelatedDurableSpecRows(read(contractPath));
  for (const row of related.rows.filter((item) => item.status === "unchanged")) {
    const specPath = durableSpecPathFromReference(root, row.specFile);
    if (!specPath || !fs.existsSync(specPath)) {
      issues.push(error(relCx(root, evidencePath), `Related Durable Specs 引用了不存在的 unchanged spec: ${row.specFile}`));
      continue;
    }
    for (const requirement of parseRequirementBlocks(read(specPath))) {
      for (const scenario of requirement.scenarios) {
        items.push({
          requirement: requirement.name,
          scenario,
          sourceSpec: row.specFile,
        });
      }
    }
  }

  return { issues, items };
}

function validateTddEvidence(root, filePath, content, options = {}) {
  const issues = [];
  const rel = relCx(root, filePath);
  const issue = options.strict ? error : warn;
  if (!hasHeading(content, "## TDD Evidence")) return issues;

  const tdd = parseTddEvidenceRows(content);
  if (tdd.rows.length === 0) {
    issues.push(issue(rel, "TDD Evidence 必须至少包含一条非占位证据。"));
  }
  if (tdd.rows.length > 0 && !tdd.hasHeader) {
    issues.push(issue(rel, "TDD Evidence 表格必须包含固定列名。"));
  }

  const coveredRequirements = new Set();
  for (const row of tdd.rows) {
    if (row.raw.length < 5) {
      issues.push(issue(rel, "TDD Evidence 表格每行必须包含 5 列。"));
      continue;
    }
    if (!isPlaceholderValue(row.requirement)) {
      coveredRequirements.add(normalizeRequirementName(row.requirement));
    }
    for (const [field, value] of [
      ["Requirement", row.requirement],
      ["RED", row.red],
      ["GREEN", row.green],
      ["REFACTOR", row.refactor],
      ["Scope", row.scope],
    ]) {
      if (isPlaceholderValue(value)) {
        issues.push(issue(rel, `TDD Evidence 表格存在空字段: ${field}`));
      }
    }
  }

  for (const requirement of contractRequirementNamesForEvidence(filePath)) {
    if (!coveredRequirements.has(normalizeRequirementName(requirement))) {
      issues.push(error(rel, `TDD Evidence 缺少 contract Requirement 覆盖: ${requirement}`));
    }
  }

  return issues;
}

function parseTddEvidenceRows(content) {
  const tableRows = markdownTableRows(section(content, "## TDD Evidence"));
  const hasHeader = tableRows.some((row) => isTableHeader(row, ["Requirement", "RED", "GREEN", "REFACTOR", "Scope"]));
  const rows = [];

  for (const row of tableRows) {
    if (isTableHeader(row, ["Requirement", "RED", "GREEN", "REFACTOR", "Scope"])) continue;
    if (row.every(isPlaceholderValue)) continue;
    rows.push({
      raw: row,
      requirement: cleanTableCell(row[0]),
      red: cleanTableCell(row[1]),
      green: cleanTableCell(row[2]),
      refactor: cleanTableCell(row[3]),
      scope: cleanTableCell(row[4]),
    });
  }

  return { hasHeader, rows };
}

function contractRequirementNamesForEvidence(evidencePath) {
  const contractPath = path.join(path.dirname(evidencePath), "contract.md");
  if (!fs.existsSync(contractPath)) return [];
  return parseRequirementBlocks(read(contractPath)).map((requirement) => requirement.name);
}

function durableSpecPathFromReference(root, reference) {
  const normalized = normalizeSpecReference(reference);
  if (!normalized.startsWith("specs/") || !normalized.endsWith(".md")) return null;
  const specsRoot = path.resolve(cxPath(root, "specs"));
  const target = path.resolve(specsRoot, normalized.slice("specs/".length));
  if (!isInsidePath(specsRoot, target)) return null;
  return target;
}

function regressionEvidenceKey(requirement, scenario, sourceSpec) {
  return [
    normalizeRequirementName(requirement),
    String(scenario || "").trim().toLowerCase(),
    normalizeSpecReference(sourceSpec).toLowerCase(),
  ].join("\u0000");
}

function normalizeSpecReference(value) {
  return String(value || "")
    .replace(/`/g, "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

function sectionHasNone(content) {
  return visibleMarkdownLines(content).some((line) => /^\s*None\s*$/i.test(line));
}

// 解析 Markdown 中的 Requirement/Scenario 块结构，返回 [{name, scenarios[]}]
function parseRequirementBlocks(content) {
  const lines = visibleMarkdownLines(content);
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const req = line.match(/^\s*###\s+Requirement:\s*(.+?)\s*$/);
    if (req) {
      current = { name: req[1].trim(), scenarios: [] };
      blocks.push(current);
      continue;
    }
    const scenario = line.match(/^\s*####\s+Scenario:\s*(.+?)\s*$/);
    if (scenario && current) {
      current.scenarios.push(scenario[1].trim());
    }
  }

  return blocks;
}

function parseRequirementBlocksWithRaw(content) {
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const req = line.match(/^\s*###\s+Requirement:\s*(.+?)\s*$/);
    if (req) {
      if (current) blocks.push(current);
      current = { name: req[1].trim(), lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);

  return blocks.map((block) => ({
    name: block.name,
    raw: block.lines.join("\n").trimEnd(),
  }));
}

// 解析 tasks.md 中的 checkbox 任务，返回进度统计（区分实现任务和 EVIDENCE 标记）
function parseTasks(filePath) {
  const content = read(filePath);
  const items = [];
  for (const line of visibleMarkdownLines(content)) {
    const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+?)\s*$/);
    if (match) {
      items.push({
        done: match[1].toLowerCase() === "x",
        text: match[2],
      });
    }
  }
  // 过滤掉 EVIDENCE 标记项，只统计实现任务
  const implementationItems = items.filter((item) => !isEvidenceTask(item.text));
  const implementationDone = implementationItems.filter((item) => item.done).length;
  const implementationNext = implementationItems.find((item) => !item.done);
  return {
    total: implementationItems.length,
    done: implementationDone,
    remaining: implementationItems.length - implementationDone,
    next: implementationNext ? implementationNext.text : null,
    implementationTotal: implementationItems.length,
    implementationDone,
    implementationRemaining: implementationItems.length - implementationDone,
    implementationNext: implementationNext ? implementationNext.text : null,
  };
}

// 判断任务文本是否为 EVIDENCE 标记项（不应算作实现任务）
function isEvidenceTask(text) {
  return /^(?:\d+\.\s*)?EVIDENCE:/i.test(text.trim());
}

function needsChineseNarrative(value) {
  const text = stripNonNarrativeTokens(value).trim();
  if (!text || /^(none|n\/a)$/i.test(text)) return false;
  if (hasChinese(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  return !isCodeLikeList(text);
}

function stripNonNarrativeTokens(value) {
  return String(value || "")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function hasChinese(value) {
  return /[\u3400-\u9FFF]/.test(value);
}

function isCodeLikeList(value) {
  const tokens = value
    .split(/[\s,;，；]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) => {
    if (/^(none|n\/a)$/i.test(token)) return true;
    if (/^[A-Z0-9_./:*{}[\]@~+-]+$/.test(token)) return true;
    return /^[\w.-]+\/[\w./*-]+$/.test(token) || /^[\w.-]+\.[A-Za-z0-9]+$/.test(token);
  });
}

function looksLikeFrontendBackendWork(content) {
  const frontend = /(frontend|front-end|前端|React|Vue|Svelte|Tauri|Electron|Vite|Vitest|Playwright|UI|client|src\/|src-tauri\/)/i;
  const backend = /(backend|back-end|后端|服务端|server\/|FastAPI|Django|Flask|Express|NestJS|API|SQLite|Postgres|MySQL|SQLAlchemy|pytest|uv run|sidecar)/i;
  return frontend.test(content) && backend.test(content);
}

function mentionsFoundationOnly(value) {
  return /(foundation|bootstrap|scaffold|empty-repository|shared|package\.json|pyproject|schema|fixture|基础|脚手架|初始化|空仓库|共享|契约)/i.test(value);
}

function explicitlyAllSerial(value) {
  return /(所有|全部|每个|全量).*(无法|不能|不可).*(独立|互不重叠|Write scope|Commands|验证命令)/.test(value);
}

function sampleList(items) {
  return items
    .slice(0, 2)
    .map((item) => truncate(item, 120))
    .join("；");
}

function truncate(value, maxLength) {
  const text = String(value || "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

// 解析 contract 或独立 delta spec 中的 Spec Delta，提取可核对的实质变更
function parseSpecDelta(content) {
  const delta = stripHtmlComments(specDeltaBody(content));
  const updatedRequirements = [];
  const removedRequirements = [];
  let current = null;
  let inRequirementBlock = false;

  for (const line of visibleMarkdownLines(delta)) {
    const heading = line.match(/^\s*#{2,3}\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i);
    if (heading) {
      current = heading[1].toUpperCase();
      inRequirementBlock = false;
      continue;
    }
    if (!current) continue;

    const reqHeading = line.match(/^\s*###\s+Requirement:\s*(.+?)\s*$/);
    const item = line.match(/^\s*-\s*(.+)$/);
    if (reqHeading && (current === "ADDED" || current === "MODIFIED" || current === "REMOVED")) {
      inRequirementBlock = current !== "REMOVED";
    }
    if (inRequirementBlock && item && !reqHeading) continue;
    if (!item && !reqHeading) continue;

    let name = reqHeading ? reqHeading[1].trim() : item[1].trim();
    // RENAMED 格式为 "- TO: <新名称>"
    if (current === "RENAMED") {
      const to = name.match(/^TO:\s*(.+)$/i);
      if (!to) continue;
      name = to[1].trim();
    }

    name = cleanRequirementName(name);
    if (!name) continue;

    if (current === "REMOVED") {
      removedRequirements.push(name);
    } else {
      updatedRequirements.push(name);
    }
  }

  return {
    updatedRequirements,
    removedRequirements,
    hasSkipped: hasSkippedSpecDelta(delta),
    hasSubstantiveDelta: updatedRequirements.length > 0 || removedRequirements.length > 0,
  };
}

// 解析独立 delta spec，用于 sync 合并到 .cx/specs/
function parseDeltaSpecOperations(content) {
  const delta = stripHtmlComments(specDeltaBody(content));
  const operations = {
    added: [],
    modified: [],
    removed: [],
    renamed: [],
  };
  const lines = visibleMarkdownLines(delta);
  let current = null;
  let block = null;
  let pendingRename = {};

  const finishBlock = () => {
    if (!block) return;
    const raw = block.lines.join("\n").trimEnd();
    if (current === "ADDED") operations.added.push({ name: block.name, raw });
    if (current === "MODIFIED") operations.modified.push({ name: block.name, raw });
    block = null;
  };

  const finishRenameIfReady = () => {
    if (pendingRename.from && pendingRename.to) {
      operations.renamed.push({
        from: cleanRequirementName(pendingRename.from),
        to: cleanRequirementName(pendingRename.to),
      });
      pendingRename = {};
    }
  };

  for (const line of lines) {
    const heading = line.match(/^\s*#{2,3}\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i);
    if (heading) {
      finishBlock();
      finishRenameIfReady();
      current = heading[1].toUpperCase();
      continue;
    }
    if (!current) continue;

    const req = line.match(/^\s*###\s+Requirement:\s*(.+?)\s*$/);
    if ((current === "ADDED" || current === "MODIFIED") && req) {
      finishBlock();
      block = { name: req[1].trim(), lines: [line] };
      continue;
    }
    if (block) {
      block.lines.push(line);
      continue;
    }

    if (current === "REMOVED") {
      const removedReq = line.match(/^\s*###\s+Requirement:\s*(.+?)\s*$/);
      const removedItem = line.match(/^\s*-\s*(.+)$/);
      const removed = removedReq ? removedReq[1] : removedItem ? removedItem[1] : null;
      const name = removed ? cleanRequirementName(removed) : null;
      if (name) operations.removed.push(name);
      continue;
    }

    if (current === "RENAMED") {
      const item = line.match(/^\s*-\s*(FROM|TO):\s*(.+?)\s*$/i);
      if (!item) continue;
      const key = item[1].toLowerCase();
      pendingRename[key] = item[2].trim();
      finishRenameIfReady();
    }
  }
  finishBlock();
  finishRenameIfReady();

  operations.renamed = operations.renamed.filter((rename) => rename.from && rename.to);
  return operations;
}

// 清理需求名称：去除反引号，过滤空值、None 和模板占位符
function cleanRequirementName(value) {
  const name = String(value || "")
    .replace(/`/g, "")
    .replace(/^#+\s*Requirement:\s*/i, "")
    .replace(/^Requirement:\s*/i, "")
    .trim();
  if (!name || /^(none|n\/a)$/i.test(name)) return null;
  if (/^<[^>]+>$/.test(name)) return null;
  return name;
}

function normalizeRequirementName(value) {
  return String(cleanRequirementName(value) || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// 检查 Spec Delta 章节是否有实质声明或明确跳过原因
function hasSpecDelta(content) {
  const delta = parseSpecDelta(content);
  return delta.hasSkipped || delta.hasSubstantiveDelta || hasExternalSpecDeltaReference(content);
}

function hasExternalSpecDeltaReference(content) {
  return externalSpecDeltaReferences(content).length > 0;
}

function specDeltaBody(content) {
  return hasHeading(content, "## Spec Delta") ? section(content, "## Spec Delta") : content;
}

function externalSpecDeltaReferences(content) {
  const references = [];
  for (const line of visibleMarkdownLines(specDeltaBody(content))) {
    const match = line.match(/^\s*Delta files?:\s*(.+?)\s*$/i);
    if (!match) continue;
    for (const token of splitSpecDeltaReferenceList(match[1])) {
      if (!isPlaceholderValue(token)) references.push(token);
    }
  }
  return references;
}

function splitSpecDeltaReferenceList(value) {
  return String(value || "")
    .split(/[\s,，、;；]+/)
    .map((item) => item.replace(/[`"'，,;；。]/g, "").trim())
    .filter(Boolean);
}

function syncChangeSpecs(root, changeName, options = {}) {
  const changeDir = cxPath(root, "changes", changeName);
  if (!fs.existsSync(changeDir)) throw new Error(`变更不存在: ${changeName}`);

  const deltaFiles = changeSpecDeltaFiles(root, changeName);
  const updates = [];
  let evidenceUpdated = false;

  if (deltaFiles.length === 0) {
    const contractPath = path.join(changeDir, "contract.md");
    if (fs.existsSync(contractPath) && parseSpecDelta(read(contractPath)).hasSubstantiveDelta) {
      throw new Error(
        `${relCx(root, contractPath)} 包含 inline Spec Delta；sync 只读取 .cx/changes/${changeName}/specs/*.md。请创建 delta 文件或改为 Skipped。`
      );
    }
    return { ok: true, change: changeName, noChanges: true, updates: [], dryRun: Boolean(options.dryRun) };
  }

  for (const source of deltaFiles) {
    const target = durableSpecTargetForDelta(root, changeName, source);
    const update = buildSyncedSpec(root, changeName, source, target);
    updates.push(update.summary);
    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, update.content, "utf8");
    }
  }

  if (!options.dryRun) {
    evidenceUpdated = markEvidenceDurableSpecsUpdated(changeDir);
  }

  return {
    ok: true,
    change: changeName,
    noChanges: false,
    dryRun: Boolean(options.dryRun),
    evidenceUpdated,
    updates,
  };
}

function buildSyncedSpec(root, changeName, source, target) {
  const operations = parseDeltaSpecOperations(read(source));
  const total =
    operations.added.length +
    operations.modified.length +
    operations.removed.length +
    operations.renamed.length;
  if (total === 0) {
    throw new Error(`${relCx(root, source)} 没有可同步的 spec delta。`);
  }

  const targetExists = fs.existsSync(target);
  if (!targetExists && (operations.modified.length > 0 || operations.removed.length > 0 || operations.renamed.length > 0)) {
    throw new Error(`${relative(root, target)} 不存在；新 durable spec 只能使用 ADDED Requirements。`);
  }

  const targetContent = targetExists
    ? read(target)
    : buildDurableSpecSkeleton(path.basename(target, ".md"), changeName);
  const parts = splitRequirementsSection(targetContent);
  const byName = new Map();
  const orderAliases = new Map();

  for (const block of parts.blocks) {
    byName.set(normalizeRequirementName(block.name), block);
  }

  const counts = { added: 0, modified: 0, removed: 0, renamed: 0 };

  for (const rename of operations.renamed) {
    const from = normalizeRequirementName(rename.from);
    const to = normalizeRequirementName(rename.to);
    if (!from || !to) continue;
    if (!byName.has(from) && byName.has(to)) continue;
    if (!byName.has(from)) {
      throw new Error(`${relCx(root, source)} RENAMED 失败，未找到 Requirement: ${rename.from}`);
    }
    if (byName.has(to)) {
      throw new Error(`${relCx(root, source)} RENAMED 失败，目标已存在: ${rename.to}`);
    }
    const renamed = renameRequirementBlock(byName.get(from), rename.to);
    byName.delete(from);
    byName.set(to, renamed);
    orderAliases.set(from, to);
    counts.renamed += 1;
  }

  for (const name of operations.removed) {
    const key = normalizeRequirementName(name);
    if (byName.delete(key)) counts.removed += 1;
  }

  for (const block of operations.modified) {
    const key = normalizeRequirementName(block.name);
    if (!byName.has(key)) {
      throw new Error(`${relCx(root, source)} MODIFIED 失败，未找到 Requirement: ${block.name}`);
    }
    if (byName.get(key).raw.trim() !== block.raw.trim()) {
      byName.set(key, block);
      counts.modified += 1;
    }
  }

  for (const block of operations.added) {
    const key = normalizeRequirementName(block.name);
    if (byName.has(key)) {
      if (byName.get(key).raw.trim() !== block.raw.trim()) {
        byName.set(key, block);
        counts.modified += 1;
      }
    } else {
      byName.set(key, block);
      counts.added += 1;
    }
  }

  const rebuilt = rebuildRequirementsSection(parts, byName, orderAliases);
  return {
    content: rebuilt,
    summary: {
      source: relCx(root, source),
      target: relative(root, target),
      ...counts,
    },
  };
}

function splitRequirementsSection(content) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => {
    const heading = parseMarkdownHeading(line);
    return heading && heading.level === 2 && heading.title === "Requirements";
  });

  if (start === -1) {
    return {
      before: content.trimEnd(),
      headingLine: "## Requirements",
      preamble: "",
      blocks: [],
      after: "",
    };
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const heading = parseMarkdownHeading(lines[i]);
    if (heading && heading.level <= 2) {
      end = i;
      break;
    }
  }

  const sectionLines = lines.slice(start + 1, end);
  const blocks = parseRequirementBlocksWithRaw(sectionLines.join("\n"));
  const firstReqIndex = sectionLines.findIndex((line) => /^\s*###\s+Requirement:/i.test(line));
  const preamble = firstReqIndex === -1 ? sectionLines.join("\n").trimEnd() : sectionLines.slice(0, firstReqIndex).join("\n").trimEnd();

  return {
    before: lines.slice(0, start).join("\n").trimEnd(),
    headingLine: lines[start],
    preamble,
    blocks,
    after: lines.slice(end).join("\n").trimEnd(),
  };
}

function rebuildRequirementsSection(parts, byName, orderAliases = new Map()) {
  const ordered = [];
  const seen = new Set();

  for (const block of parts.blocks) {
    const originalKey = normalizeRequirementName(block.name);
    const key = orderAliases.get(originalKey) || originalKey;
    const current = byName.get(key);
    if (current && !seen.has(key)) {
      ordered.push(current.raw.trimEnd());
      seen.add(key);
    }
  }

  for (const [key, block] of byName.entries()) {
    if (!seen.has(key)) ordered.push(block.raw.trimEnd());
  }

  const requirementsBody = [parts.preamble, ...ordered].filter((part) => part && part.trim()).join("\n\n");
  const chunks = [];
  if (parts.before) chunks.push(parts.before);
  chunks.push(parts.headingLine);
  if (requirementsBody) chunks.push(requirementsBody);
  if (parts.after) chunks.push(parts.after);
  return `${chunks.join("\n\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

function renameRequirementBlock(block, newName) {
  const lines = block.raw.split(/\r?\n/);
  lines[0] = `### Requirement: ${newName}`;
  return {
    name: newName,
    raw: lines.join("\n").trimEnd(),
  };
}

function buildDurableSpecSkeleton(capability, changeName) {
  return [
    `# ${capability}`,
    "",
    "## Purpose",
    "",
    `TBD - created by cx sync for ${changeName}.`,
    "",
    "## Requirements",
    "",
  ].join("\n");
}

function markEvidenceDurableSpecsUpdated(changeDir) {
  const evidencePath = path.join(changeDir, "evidence.md");
  if (!fs.existsSync(evidencePath)) return false;
  const content = read(evidencePath);
  if (/Durable specs:\s*updated/i.test(content)) return false;
  const next = content.replace(/Durable specs:\s*pending[- ]sync/i, "Durable specs: updated");
  if (next === content) return false;
  fs.writeFileSync(evidencePath, next, "utf8");
  return true;
}

function aggregateSpecDelta(root, changeName, contractPath) {
  const files = changeSpecDeltaFiles(root, changeName);
  const sources = [];
  const updatedRequirements = new Set();
  const removedRequirements = new Set();
  let hasSkipped = false;

  if (files.length > 0) {
    for (const file of files) {
      sources.push(relCx(root, file));
      const delta = parseSpecDelta(read(file));
      for (const requirement of delta.updatedRequirements) updatedRequirements.add(requirement);
      for (const requirement of delta.removedRequirements) removedRequirements.add(requirement);
      hasSkipped = hasSkipped || delta.hasSkipped;
    }
  } else {
    sources.push(relCx(root, contractPath));
    const delta = parseSpecDelta(read(contractPath));
    for (const requirement of delta.updatedRequirements) updatedRequirements.add(requirement);
    for (const requirement of delta.removedRequirements) removedRequirements.add(requirement);
    hasSkipped = delta.hasSkipped;
  }

  return {
    updatedRequirements: Array.from(updatedRequirements),
    removedRequirements: Array.from(removedRequirements),
    hasSkipped,
    hasSubstantiveDelta: updatedRequirements.size > 0 || removedRequirements.size > 0,
    sources,
    hasChangeSpecDeltas: files.length > 0,
  };
}

function inferDurableSpecStatus(root, changeName) {
  const changeDir = cxPath(root, "changes", changeName);
  const contractPath = path.join(changeDir, "contract.md");
  const evidencePath = path.join(changeDir, "evidence.md");
  const deltaFiles = changeSpecDeltaFiles(root, changeName).map((file) => relCx(root, file));
  const evidenceState = fs.existsSync(evidencePath) ? durableSpecState(read(evidencePath)) : "unknown";
  const delta = fs.existsSync(contractPath)
    ? aggregateSpecDelta(root, changeName, contractPath)
    : { hasSubstantiveDelta: deltaFiles.length > 0, hasSkipped: false, updatedRequirements: [], removedRequirements: [], sources: deltaFiles };

  if (evidenceState === "skipped" || (!delta.hasSubstantiveDelta && delta.hasSkipped)) {
    return { state: "skipped", deltaFiles };
  }
  if (!delta.hasSubstantiveDelta) {
    return { state: deltaFiles.length > 0 ? "pending-sync" : "none", deltaFiles };
  }
  if (isSpecDeltaSynced(root, delta)) {
    return { state: evidenceState === "updated" ? "synced" : "pending-sync", deltaFiles };
  }
  return { state: "pending-sync", deltaFiles };
}

function isSpecDeltaSynced(root, delta) {
  const durableRequirements = new Set();
  for (const specFile of listMarkdownFiles(cxPath(root, "specs"))) {
    for (const requirement of parseRequirementBlocks(read(specFile))) {
      durableRequirements.add(requirement.name);
    }
  }
  return delta.updatedRequirements.every((requirement) => durableRequirements.has(requirement)) &&
    delta.removedRequirements.every((requirement) => !durableRequirements.has(requirement));
}

function formatDurableSpecStatus(durableSpecs) {
  const files = durableSpecs.deltaFiles && durableSpecs.deltaFiles.length > 0
    ? ` (${durableSpecs.deltaFiles.length} delta file${durableSpecs.deltaFiles.length > 1 ? "s" : ""})`
    : "";
  return `${durableSpecs.state}${files}`;
}

function hasChangeSpecDeltas(changeDir) {
  return listMarkdownFiles(path.join(changeDir, "specs")).length > 0;
}

function changeSpecDeltaFiles(root, changeName) {
  const dir = cxPath(root, "changes", changeName, "specs");
  return listMarkdownFiles(dir);
}

function durableSpecTargetForDelta(root, changeName, source) {
  const deltaRoot = cxPath(root, "changes", changeName, "specs");
  const relativeSource = path.relative(deltaRoot, source);
  const target = path.resolve(cxPath(root, "specs"), relativeSource);
  const specsRoot = path.resolve(cxPath(root, "specs"));
  if (!isInsidePath(specsRoot, target)) {
    throw new Error(`spec delta 路径越界: ${source}`);
  }
  return target;
}

function firstDuplicate(values) {
  const seen = new Set();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

// 从 Markdown 内容中提取指定章节的文本，忽略代码块中的伪 heading
function section(content, heading) {
  const target = parseHeadingLabel(heading);
  if (!target) return "";

  const lines = content.split(/\r?\n/);
  const result = [];
  let inFence = false;
  let collecting = false;

  for (const line of lines) {
    if (isFenceLine(line)) {
      if (collecting) result.push(line);
      inFence = !inFence;
      continue;
    }

    const current = inFence ? null : parseMarkdownHeading(line);
    if (current) {
      if (!collecting) {
        if (current.level === target.level && current.title === target.title) {
          collecting = true;
        }
        continue;
      }
      if (current.level <= target.level) break;
    }

    if (collecting) result.push(line);
  }

  return result.join("\n");
}

// 判断指定 heading 是否真实存在，避免代码块或注释里的文本误判
function hasHeading(content, heading) {
  const target = parseHeadingLabel(heading);
  if (!target) return false;
  return visibleMarkdownLines(content).some((line) => {
    const current = parseMarkdownHeading(line);
    return current && current.level === target.level && current.title === target.title;
  });
}

// 提取 evidence 的验证结果，只读取 Verification Commands 表格
function verificationResults(content) {
  const rows = markdownTableRows(section(content, "## Verification Commands"));
  const results = [];
  for (const row of rows) {
    if (isTableHeader(row, ["Command", "Result", "Notes"])) continue;
    const result = cleanTableCell(row[1]).toUpperCase();
    if (["PASS", "FAIL", "SKIPPED"].includes(result)) results.push(result);
  }
  return results;
}

// Requirement Coverage 至少要有一条真实证据，模板占位行不算
function hasRequirementCoverage(content) {
  const rows = markdownTableRows(section(content, "## Requirement Coverage"));
  for (const row of rows) {
    if (isTableHeader(row, ["Requirement", "Evidence"])) continue;
    if (!isPlaceholderValue(row[0]) && !isPlaceholderValue(row[1])) return true;
  }
  return false;
}

// 解析 review 的 Decision 行，忽略代码块中的示例
function reviewDecisions(content) {
  return visibleMarkdownLines(content)
    .map((line) => line.match(/^\s*Decision:\s*(PASS|NEEDS_CHANGES)\b/i))
    .filter(Boolean)
    .map((match) => match[1].toUpperCase());
}

function markdownTableRows(content) {
  const rows = [];
  for (const line of visibleMarkdownLines(content)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 2 || cells.every(isMarkdownSeparatorCell)) continue;
    rows.push(cells);
  }
  return rows;
}

function isTableHeader(row, headers) {
  return headers.every((header, index) => cleanTableCell(row[index]).toLowerCase() === header.toLowerCase());
}

function isMarkdownSeparatorCell(cell) {
  return /^:?-{3,}:?$/.test(cell.trim());
}

function cleanTableCell(cell) {
  return String(cell || "").replace(/`/g, "").trim();
}

function isPlaceholderValue(value) {
  const text = cleanTableCell(value);
  return !text || /^(none|n\/a)$/i.test(text) || /^<[^>]+>$/.test(text);
}

function hasSkippedSpecDelta(delta) {
  return visibleMarkdownLines(delta).some((line) => {
    const match = line.match(/^\s*Skipped:\s*(.+?)\s*$/i);
    return match && !isPlaceholderValue(match[1]);
  });
}

function stripHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, "");
}

function visibleMarkdownContent(content) {
  return visibleMarkdownLines(content).join("\n");
}

function visibleMarkdownLines(content) {
  const lines = [];
  let inFence = false;
  for (const line of content.split(/\r?\n/)) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) lines.push(line);
  }
  return lines;
}

function isFenceLine(line) {
  return /^\s*(```|~~~)/.test(line);
}

function parseHeadingLabel(heading) {
  return parseMarkdownHeading(heading);
}

function parseMarkdownHeading(line) {
  const match = line.match(/^\s*(#{1,6})\s+(.+?)\s*$/);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim() };
}

// 根据产物文件存在情况和任务进度推断变更当前所处阶段
function inferPhase(files, tasks, review, durableSpecs) {
  if (files.debug && !files.contract) return "debug/contract";
  if (!files.contract) return "contract";
  if (files.visual && !files.visualPrototype) return "visual";
  if (!files.tasks) return files.design ? "tasks" : "design/tasks";
  if (tasks && tasks.implementationRemaining > 0) return "tdd-build";
  if (!files.evidence) return "verify";
  if (!files.review) return "review";
  if (review?.decision === "NEEDS_CHANGES") return "needs-changes";
  if (review?.decision !== "PASS") return "review-decision";
  if (durableSpecs?.state === "pending-sync") return "spec-sync";
  return "ready-to-archive";
}

// 根据产物和校验状态推断下一步操作建议
function inferNext(files, tasks, validation, review, durableSpecs) {
  if (!files.contract) return "运行 contract <change>";
  if (files.visual && !files.visualPrototype) return "先生成 visual/prototype.html";
  if (validation.errors > 0) return "先运行 validate 并修复 error";
  if (!files.tasks) return "运行 tasks <change>";
  if (tasks && tasks.implementationRemaining > 0) return "继续 build <change>";
  if (!files.evidence) return "运行 verify <change>";
  if (!files.review) return "运行 review <change>";
  if (review?.decision === "NEEDS_CHANGES") return "修复 review findings 后重新运行 review <change>";
  if (review?.decision !== "PASS") return "补全 review Decision";
  if (durableSpecs?.state === "pending-sync") return "运行 sync <change> 后 archive <change>";
  return "运行 archive <change>";
}

// 返回统一的文件标志结构，用于展示非法变更目录状态
function emptyFileFlags() {
  return {
    debug: false,
    contract: false,
    design: false,
    tasks: false,
    evidence: false,
    review: false,
    visual: false,
    visualPrototype: false,
    specDeltas: false,
    worktree: false,
  };
}

// 解析 review.md 的归档决策，供 status 避免误导进入 archive
function parseReview(filePath) {
  const decisions = reviewDecisions(read(filePath));
  return {
    decision: decisions.length === 1 ? decisions[0] : null,
    decisions,
  };
}

// 将文件存在标志对象格式化为可读字符串
function formatFileFlags(files) {
  return Object.entries(files)
    .map(([name, present]) => `${name}:${present ? "yes" : "no"}`)
    .join(", ");
}

// 推导目标变更名：用户指定则直接返回，否则在唯一活跃变更时自动推导
function resolveChangeName(root, requested) {
  if (requested) return validateChangeName(requested);
  const changes = listDirs(cxPath(root, "changes"));
  if (changes.length === 0) throw new Error("没有活跃变更。");
  if (changes.length > 1) {
    throw new Error(`存在多个活跃变更，请使用 --change 指定: ${changes.join(", ")}`);
  }
  return validateChangeName(changes[0]);
}

// 校验 change-id，避免路径穿越和跨目录访问
function validateChangeName(name) {
  if (!isValidChangeName(name)) {
    throw new Error(`非法 change 名称: ${name}。请使用 kebab-case 小写字母、数字和连字符。`);
  }
  return name;
}

function isValidChangeName(name) {
  return typeof name === "string" && CHANGE_NAME_PATTERN.test(name);
}

// 校验 stage 参数是否为合法值，防止拼写错误进入下游
function validateStage(stage) {
  const valid = new Set([
    "all",
    "debug",
    "contract",
    "visual",
    "design",
    "tasks",
    "build",
    "verify",
    "review",
    "archive",
  ]);
  if (!valid.has(stage)) {
    throw new Error(`未知 stage: ${stage}。可用值: ${Array.from(valid).join(", ")}`);
  }
}

// 确保当前目录在 git 仓库中（worktree 操作的前置条件）
function ensureGitRepo(root) {
  try {
    childProcess.execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: root,
      stdio: "pipe",
    });
  } catch {
    throw new Error("当前目录不是 git 仓库，不能创建 worktree。");
  }
}

// 确保指定路径已被 gitignore（防止 worktree 目录被误提交）
function ensureIgnored(root, relPath) {
  const display = relPath.endsWith("/") ? relPath : `${relPath}/`;
  try {
    childProcess.execFileSync("git", ["check-ignore", "-q", relPath], {
      cwd: root,
      stdio: "pipe",
    });
  } catch {
    throw new Error(`${display} 未被 git ignore。请先将 ${display} 加入 .gitignore。`);
  }
}

// 确保 .cx 目录已初始化（大多数命令的前置条件）
function ensureInitialized(root) {
  if (!fs.existsSync(cxPath(root))) {
    throw new Error("CX 尚未初始化。请先运行 init。");
  }
}

// 列出目录下的子目录名，按字母排序
function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// 递归列出目录下所有 .md 文件（用于扫描 specs/ 下的 durable spec）
function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith(".md")) result.push(full);
    }
  }
  return result.sort();
}

// 从 issues 列表生成校验报告：error 数为 0 则 ok
function reportFromIssues(issues) {
  const summary = countIssues(issues);
  return {
    ok: summary.errors === 0,
    summary,
    issues,
  };
}

// 统计 issues 中的 error 和 warning 数量
function countIssues(issues) {
  return {
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
  };
}

// 创建 error 级别的校验问题
function error(issuePath, message) {
  return { severity: "error", path: issuePath, message };
}

// 创建 warning 级别的校验问题
function warn(issuePath, message) {
  return { severity: "warning", path: issuePath, message };
}

// 拼接 .cx 目录下的子路径
function cxPath(root, ...parts) {
  for (const part of parts) {
    assertSafePathPart(part);
  }
  const base = path.resolve(root, CX_DIR);
  const target = path.resolve(base, ...parts);
  if (!isInsidePath(base, target)) {
    throw new Error(`路径越界: ${target}`);
  }
  return target;
}

function assertSafePathPart(part) {
  if (typeof part !== "string" || part.length === 0 || part === "." || part === ".." || /[\\/]/.test(part)) {
    throw new Error(`非法路径片段: ${part}`);
  }
}

function isInsidePath(base, target) {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// 计算文件相对于 .cx 根目录的路径（用于校验报告展示）
function relCx(root, filePath) {
  return relative(root, filePath);
}

// 计算相对路径，根目录自身返回 "."
function relative(root, filePath) {
  return path.relative(root, filePath) || ".";
}

// 检查路径拼接后文件是否存在
function exists(base, ...parts) {
  return fs.existsSync(path.join(base, ...parts));
}

// 读取文件内容（UTF-8），文件不存在时抛错
function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

// 读取可选文件：存在则返回内容，不存在返回空字符串
function readOptional(filePath) {
  return fs.existsSync(filePath) ? read(filePath) : "";
}

// 解析 evidence.md 中的 durable specs 同步状态
function durableSpecState(content) {
  if (/Durable specs:\s*updated/i.test(content)) return "updated";
  if (/Durable specs:\s*skipped/i.test(content)) return "skipped";
  if (/Durable specs:\s*pending[- ]sync/i.test(content)) return "pending";
  return "unknown";
}

// 向上查找 .cx 根目录：优先从 worktree 路径反推，其次沿目录树向上搜索
function resolveCxRoot(start) {
  const absoluteStart = path.resolve(start);
  // 如果当前在 .cx/worktrees/<name> 子目录中，直接定位原项目根
  const managedWorktreeRoot = rootFromManagedWorktreePath(absoluteStart);
  if (managedWorktreeRoot && fs.existsSync(path.join(managedWorktreeRoot, CX_DIR))) {
    return managedWorktreeRoot;
  }

  // 沿目录树向上搜索 .cx 目录，到 git 根或文件系统根为止
  const gitRoot = gitTopLevel(absoluteStart);
  let current = absoluteStart;
  while (true) {
    if (fs.existsSync(path.join(current, CX_DIR))) return current;
    if (gitRoot && current === gitRoot) return start;
    const parent = path.dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

// 从路径片段中检测是否在 .cx/worktrees/ 子目录下，反推原项目根目录
function rootFromManagedWorktreePath(start) {
  const parts = path.resolve(start).split(path.sep);
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    if (parts[i] === CX_DIR && parts[i + 1] === "worktrees") {
      const rootParts = parts.slice(0, i);
      const root = rootParts.join(path.sep) || path.sep;
      return root;
    }
  }
  return null;
}

// 获取 git 仓库根目录，非 git 仓库返回 null
function gitTopLevel(start) {
  try {
    return childProcess
      .execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd: start,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
      .trim();
  } catch {
    return null;
  }
}

// 输出 JSON 到 stdout（给 AI 消费）
function writeJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

// 返回当前日期字符串 YYYY-MM-DD（用于归档目录命名）
function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 打印 CLI 用法帮助
function printHelp() {
  console.log(`cx usage:
  node scripts/cx.js init [--json]
  node scripts/cx.js status [--json]
  node scripts/cx.js validate [--change <name>] [--stage <stage>] [--json]
  node scripts/cx.js sync [--change <name>] [--dry-run] [--json]
  node scripts/cx.js archive [--change <name>] [--dry-run] [--json]
  node scripts/cx.js worktree [--change <name>] [--dry-run] [--yes] [--json]`);
}

main();
