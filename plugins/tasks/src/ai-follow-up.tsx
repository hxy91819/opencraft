import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { SegmentedControl, SettingsButton, SettingsSelect, SettingsTextInput } from "@opencraft/extension-react";
import { useIntl } from "@opencraft/i18n/react";
import type { TaskConversation, TaskDetail, TaskMember, TasksRequestPort } from "@opencraft/appserver-protocol";
import { activeFollowUpTask, FOLLOW_UP_LANES, followUpProjection, followUpTaskKey, readFollowUpEvents, type FollowUpProjection } from "./ai-follow-up-model";
import { MemberAvatar } from "./member-avatar";
import "./ai-follow-up.scss";

export interface FollowUpSelection { readonly scope: string; readonly search: string }
type CachedProjection = { key: string; status: string; value: FollowUpProjection; failed: boolean };

/** A read-only projection; task status, activity and navigation retain their existing owners. */
export function AIFollowUp({ tasks, members, activity, port, ownerFilter, onOwnerFilterChange, selection, onSelectionChange, myMemberId, onOpenTask, onOpenConversation }: {
  tasks: readonly TaskDetail[];
  members: readonly TaskMember[];
  activity: boolean;
  port: TasksRequestPort;
  ownerFilter: string;
  onOwnerFilterChange(value: string): void;
  selection: FollowUpSelection;
  onSelectionChange(value: FollowUpSelection): void;
  myMemberId: string | null;
  onOpenTask(task: TaskDetail): void;
  onOpenConversation?: (link: TaskConversation) => void;
}) {
  const zh = useIntl().locale.startsWith("zh");
  const text = (cn: string, en: string) => zh ? cn : en;
  const candidates = tasks.filter(activeFollowUpTask);
  const ownerName = (id: string | null | undefined) => members.find(member => member.id === id)?.name ?? id ?? text("未分配", "Unassigned");
  const ownerIds = [...new Set(candidates.flatMap(task => task.assigneeId ? [task.assigneeId] : []))];
  if (ownerFilter.startsWith("member:") && !ownerIds.includes(ownerFilter.slice(7))) ownerIds.push(ownerFilter.slice(7));
  const taskKey = JSON.stringify(candidates.map(task => [task.id, followUpTaskKey(task)]));
  const cache = useRef(new Map<string, CachedProjection>());
  const [reports, setReports] = useState<ReadonlyMap<string, CachedProjection>>(new Map());
  const [checking, setChecking] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const reader = useMemo(() => ({ request: port.request }), [port.request]);
  useEffect(() => {
    let live = true;
    const rows = candidates;
    const changed = rows.filter(task => cache.current.get(task.id)?.key !== followUpTaskKey(task));
    if (!activity) { setChecking(false); return; }
    setChecking(changed.length > 0);
    void (async () => {
      let cursor = 0;
      const results = new Map(cache.current);
      await Promise.all(Array.from({ length: Math.min(4, changed.length) }, async () => {
        while (live && cursor < changed.length) {
          const task = changed[cursor++]!;
          try { results.set(task.id, { key: followUpTaskKey(task), status: task.status, value: followUpProjection(task, await readFollowUpEvents(reader, task.id)), failed: false }); }
          catch { results.set(task.id, { key: followUpTaskKey(task), status: task.status, value: followUpProjection(task), failed: true }); }
        }
      }));
      if (live) {
        const ids = new Set(rows.map(task => task.id));
        for (const id of results.keys()) if (!ids.has(id)) results.delete(id);
        cache.current = results; setReports(results); setChecking(false);
      }
    })();
    return () => { live = false; };
    // The serialized authority key fences changed rows; browsing filters never trigger reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskKey, activity, reader, refresh]);
  const projection = (task: TaskDetail): FollowUpProjection => {
    const cached = activity ? reports.get(task.id) : undefined;
    if (cached?.key === followUpTaskKey(task)) return cached.value;
    // Retain the last-known lane during a same-status refresh, but never show its old clock as current.
    if (cached && !cached.failed && cached.status === task.status) return { ...cached.value, readyAt: null };
    return followUpProjection(task);
  };
  const unverified = (task: TaskDetail) => !activity || reports.get(task.id)?.key !== followUpTaskKey(task) || reports.get(task.id)?.failed;
  const unavailable = candidates.some(task => reports.get(task.id)?.failed && reports.get(task.id)?.key === followUpTaskKey(task)) || !activity;
  const query = selection.search.trim().toLocaleLowerCase();
  const active = candidates.filter(task => {
    const p = projection(task);
    const judge = p.report?.judgeId;
    return (!ownerFilter || (ownerFilter === "unassigned" ? !task.assigneeId : task.assigneeId === ownerFilter.slice(7)))
      && (selection.scope !== "mine" || !!myMemberId && p.lane === "needs" && judge === myMemberId)
      && (selection.scope !== "owned" || !!myMemberId && task.assigneeId === myMemberId)
      && (!query || [task.title, task.id, p.decision, p.report?.artifact].join(" ").toLocaleLowerCase().includes(query));
  });
  const titles = { todo: "Todo", working: "Working", needs: "Needs you", review: "In review", ready: "Ready to merge" };
  const descriptions = {
    todo: text("尚未开始，等待启动", "Not started · awaiting execution"),
    working: text("任务推进与实际执行", "Work in progress"),
    needs: text("材料就绪，待人判断或行动", "Ready for human judgment or action"),
    review: text("审阅与验证", "Review and verification"),
    ready: text("明确记录的可合入交付", "Reported ready for integration"),
  };
  const duration = (at: number) => {
    const minutes = Math.max(0, Math.floor((now - at) / 60_000)), hours = Math.floor(minutes / 60), days = Math.floor(hours / 24);
    return days ? text(`${days} 天${hours % 24 ? ` ${hours % 24} 小时` : ""}`, `${days}d ${hours % 24}h`)
      : hours ? text(`${hours} 小时`, `${hours}h`) : text(`${minutes} 分钟`, `${minutes}m`);
  };
  const retry = () => { for (const [id, entry] of cache.current) if (entry.failed) cache.current.delete(id); setRefresh(n => n + 1); };
  return <section className="tasks-ai-follow-up" aria-label={text("AI 跟进", "AI follow-up")}>
    <p className="tasks-ai-follow-up__intro">{text("让 AI 持续推进，让人及时判断。", "Keep work moving; make human decisions timely.")}</p>
    <div className="tasks-ai-follow-up__toolbar">
      <SegmentedControl label={text("跟进范围", "Follow-up scope")} value={selection.scope} onValueChange={scope => onSelectionChange({ ...selection, scope })} options={[
        { value: "all", label: text("全部事项", "All work") }, { value: "mine", label: text("待我判断", "Needs me") }, { value: "owned", label: text("我负责的", "My work") },
      ]} />
      <div className="tasks-ai-follow-up__filters">
        <SettingsTextInput type="search" aria-label={text("搜索跟进事项", "Search follow-up tasks")} placeholder={text("搜索事项或材料…", "Search tasks or materials…")} value={selection.search} onChange={e => onSelectionChange({ ...selection, search: e.target.value })} />
        <label><span>Owner</span><SettingsSelect aria-label={text("按 Owner 筛选", "Filter by owner")} value={ownerFilter} onChange={e => onOwnerFilterChange(e.target.value)}>
          <option value="">{text("所有 Owner", "All owners")}</option><option value="unassigned">{text("未分配", "Unassigned")}</option>
          {ownerIds.map(id => <option key={id} value={`member:${id}`}>{ownerName(id)}</option>)}
        </SettingsSelect></label>
      </div>
    </div>
    <div className="tasks-ai-follow-up__summary">
      <span>{text(`当前 ${active.length} 项`, `${active.length} tasks`)}{selection.scope !== "all" && !myMemberId ? text(" · 请先在任务筛选中关联我的成员身份", " · Link your member identity in task filters first") : ""}</span>
      <span>{text("Needs you 按本轮等待排序", "Needs you · longest wait first")}</span>
    </div>
    <div className="tasks-ai-follow-up__feedback" role="status" aria-live="polite">
      {checking ? text("正在核实协作记录…", "Checking collaboration records…") : unavailable ? <>{text("部分协作记录暂不可用；未推断执行或等待时间。", "Some records are unavailable; execution and waiting are not inferred.")} {activity ? <SettingsButton variant="quiet" onClick={retry}>{text("重新核实", "Retry")}</SettingsButton> : null}</> : null}
    </div>
    <div className="tasks-ai-follow-up__board" aria-busy={checking}>
      {FOLLOW_UP_LANES.map(lane => {
        const items = active.filter(task => projection(task).lane === lane).sort((a, b) => lane === "needs"
          ? (projection(a).readyAt ?? Infinity) - (projection(b).readyAt ?? Infinity) || a.id.localeCompare(b.id)
          : a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
        return <section key={lane} className={`tasks-ai-follow-up__column tasks-ai-follow-up__column--${lane}`} aria-label={titles[lane]}>
          <header><div><span className="tasks-ai-follow-up__dot" aria-hidden="true" /><h3>{titles[lane]}</h3><span className="tasks-ai-follow-up__count">{items.length}</span></div><p>{descriptions[lane]}</p></header>
          {!items.length ? <p className="tasks-ai-follow-up__empty">{text("暂无事项", "No tasks")}</p> : <ul>{items.map(task => {
            const p = projection(task), owner = ownerName(task.assigneeId);
            const status = p.report ? p.report.summary : p.lane === "todo" ? text("尚未开始", "Not started") : p.lane === "working" ? text("任务进行中 · 执行方式未核实", "In progress · execution unverified") : p.lane === "needs" ? text("等待人判断", "Awaiting judgment") : text("待审阅 · 方式未核实", "Review · method unverified");
            const wait = p.lane === "needs" && unverified(task) ? text("正在核实本轮等待…", "Checking current wait…") : p.readyAt !== null ? text(`等待 ${duration(p.readyAt)}`, `Waiting ${duration(p.readyAt)}`)
              : text(`${duration(p.updatedAt)}前更新`, `Updated ${duration(p.updatedAt)} ago`);
            return <li className="tasks-ai-follow-up__item" key={task.id} data-ai-follow-up-task-id={task.id}>
              <div className="tasks-ai-follow-up__content">
                <h4>{task.title}</h4>
                {p.lane === "needs" ? <p className="tasks-ai-follow-up__decision">{p.decision}</p> : null}
                {p.report ? <p className="tasks-ai-follow-up__artifact" title={p.report.artifact}>{p.report.artifact}</p> : null}
                <div className="tasks-ai-follow-up__state"><span title={status}>{status}</span><span className={p.readyAt !== null ? "tasks-ai-follow-up__wait" : undefined}><Clock size={12} aria-hidden="true" />{wait}</span></div>
                {p.lane === "review" && unverified(task) ? <span className="tasks-ai-follow-up__unknown">{text("交接尚未核实 · 不计人工等待", "Handoff unverified · no human wait clock")}</span> : null}
                {p.lane === "needs" ? <span className="tasks-ai-follow-up__judge">{text("本轮判断人：", "Current judge: ")}{p.report ? p.report.judgeId ? ownerName(p.report.judgeId) : text("待认领", "Unclaimed") : text("未单独记录", "Not recorded separately")}</span> : null}
                <span className="tasks-ai-follow-up__owner" title={`Owner: ${owner}`}><MemberAvatar member={members.find(m => m.id === task.assigneeId)} name={owner} assigned={!!task.assigneeId} /><span>{owner}</span></span>
              </div>
              <footer>
                <SettingsButton type="button" variant={task.conversations.length && onOpenConversation ? "quiet" : "primary"} onClick={() => onOpenTask(task)} aria-label={text(`查看详情：${task.title}`, `View details: ${task.title}`)}>{text("查看详情", "View details")}</SettingsButton>
                {task.conversations.length && onOpenConversation ? task.conversations.length === 1 ? <SettingsButton type="button" variant="primary" onClick={() => onOpenConversation(task.conversations[0]!)} aria-label={text(`进入会话：${task.title}`, `Open conversation: ${task.title}`)}>{text("进入会话", "Open chat")}</SettingsButton> : <DropdownMenu.Root><DropdownMenu.Trigger asChild><SettingsButton type="button" variant="primary" aria-label={text(`选择关联会话：${task.title}`, `Choose conversation: ${task.title}`)}>{text("进入会话", "Open chat")} ({task.conversations.length})</SettingsButton></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="tasks-card-menu" sideOffset={4}>{task.conversations.map((link, i) => <DropdownMenu.Item key={JSON.stringify([link.serverId, link.threadId])} onSelect={() => onOpenConversation(link)}>{text(`关联会话 ${i + 1}`, `Linked conversation ${i + 1}`)}</DropdownMenu.Item>)}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root> : null}
              </footer>
            </li>;
          })}</ul>}
        </section>;
      })}
    </div>
    <p className="tasks-ai-follow-up__footnote">{text("人工等待从本轮材料就绪开始，评论与改派不重置。可合入不代表已合并或已发布。", "Human waiting starts when this round is ready; comments and reassignment do not reset it. Ready to merge does not mean merged or deployed.")}</p>
  </section>;
}
