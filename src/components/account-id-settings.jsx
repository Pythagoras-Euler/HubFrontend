import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionSummary, AccordionDetails, Alert, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Typography, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, Tabs, Tab, Switch, FormControlLabel } from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { AppContext } from "../context";
import { customAxios as axios, getAuthToken, checkUserPerm } from "../functions";

const errors = {
    invalid_public_id: "ID 必须为 4–6 位英文字母或数字。",
    public_id_forbidden: "该 ID 不符合账号命名规则。",
    public_id_unavailable: "该 ID 已被使用或仍在保留期内。",
    public_id_cooldown: "当前仍在修改冷却期内。",
    public_id_unchanged: "新 ID 与当前 ID 相同。",
    reason_required: "请填写解除冷却的原因。",
    forbidden: "没有执行此操作的权限。",
    rule_exists: "相同禁用规则已经存在。",
};

export default function AccountIDSettings({ uid, admin = false }) {
    const { apiPath, curUserPerm } = useContext(AppContext);
    const { i18n } = useTranslation();
    const zh = i18n.language?.startsWith("zh");
    const t = (cn, en) => zh ? cn : en;
    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [status, setStatus] = useState(null);
    const [value, setValue] = useState("");
    const [confirm, setConfirm] = useState(false);
    const [tab, setTab] = useState(0);
    const [target, setTarget] = useState(String(uid ?? ""));
    const [searchID, setSearchID] = useState("");
    const [history, setHistory] = useState({ list: [], total_items: 0 });
    const [page, setPage] = useState(1);
    const [audit, setAudit] = useState({ list: [], total_items: 0 });
    const [auditPage, setAuditPage] = useState(1);
    const [reason, setReason] = useState("");
    const [rules, setRules] = useState([]);
    const [rule, setRule] = useState({ word: "", mode: "exact", enabled: true, note: "" });
    const [preview, setPreview] = useState(null);
    const [deleteID, setDeleteID] = useState(null);
    const canManage = checkUserPerm(curUserPerm, ["administrator", "manage_account_ids"]);
    const canHistory = checkUserPerm(curUserPerm, ["administrator", "view_account_id_history"]);
    const canRules = checkUserPerm(curUserPerm, ["administrator", "manage_account_id_rules"]);
    const date = n => n ? new Date(n * 1000).toLocaleString() : "—";

    async function request(path, method = "GET", data) {
        const response = await axios({ url: `${apiPath}${path}`, method, data, headers: { Authorization: `Bearer ${getAuthToken()}` } });
        if (!response || response.status < 200 || response.status >= 300 || response.data?.error) {
            const code = response?.data?.error || "request_failed";
            throw new Error(zh ? (errors[code] || code) : code.replaceAll("_", " "));
        }
        return response.data;
    }
    async function run(action) {
        setBusy(true); setMessage(null);
        try { await action(); } catch (error) { setMessage({ severity: "error", text: error.message }); }
        finally { setBusy(false); }
    }
    async function loadHistory(nextPage = 1) {
        const query = new URLSearchParams({ page: nextPage });
        if (target) query.set("uid", target);
        if (searchID) query.set("public_id", searchID);
        setHistory(await request(`/admin/account-ids/history?${query}`)); setPage(nextPage);
    }
    async function loadAudit(nextPage = 1) {
        const query = new URLSearchParams({ page: nextPage });
        if (target) query.set("uid", target);
        setAudit(await request(`/admin/account-ids/audit?${query}`)); setAuditPage(nextPage);
    }
    async function load() {
        if (!admin) setStatus(await request("/user/account-id"));
        else {
            if (!canHistory && !canManage && canRules) setTab(1);
            if (canManage && target) setStatus(await request(`/admin/account-ids/status?uid=${encodeURIComponent(target)}`));
            if (canHistory) await loadHistory();
            if (canRules) setRules((await request("/admin/account-ids/rules")).list);
        }
    }
    if (admin && !canManage && !canHistory && !canRules) return null;
    return <Accordion expanded={expanded} onChange={(_, open) => { setExpanded(open); if (open) run(load); }} sx={{ my: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
            <Typography>{admin ? t("更多管理 · ID 管理", "More management · Account IDs") : t("账号标识", "Account identity")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <Stack spacing={2}>
                {message && <Alert severity={message.severity} role="status">{message.text}</Alert>}
                {!admin && <>
                    <Typography>{t("当前个人 ID：", "Current account ID: ")}{status?.public_id || "—"}</Typography>
                    <Typography variant="body2" color="text.secondary">{t("4–6 位英文字母或数字，不区分大小写。每 6 个自然月可修改一次；默认分配后可立即自定义一次。旧 ID 修改后立即失效，并保留占用 72 小时。", "Use 4–6 letters or digits, case insensitive. Change once every 6 calendar months; your first custom change is available immediately. The previous ID stops resolving immediately and is reserved for 72 hours.")}</Typography>
                    {status && !status.can_change && <Alert severity="info">{t("下次可修改：", "Next change: ")}{date(status.next_change_at)}</Alert>}
                    {status?.change_credit && <Alert severity="info">{t("管理员已授予一次冷却豁免，成功修改后消耗。", "You have one administrator cooldown waiver, consumed after a successful change.")}</Alert>}
                    <TextField label={t("新个人 ID", "New account ID")} value={value} onChange={e => { setValue(e.target.value.toUpperCase()); setMessage(null); }} slotProps={{ htmlInput: { maxLength: 6 } }} disabled={busy || !status?.can_change} />
                    <Stack direction="row" spacing={1}>
                        <Button disabled={busy || !status?.can_change || !/^[A-Z0-9]{4,6}$/.test(value)} onClick={() => run(async () => { const result = await request(`/user/account-id/availability?public_id=${encodeURIComponent(value)}`); setMessage({ severity: result.available ? "success" : "warning", text: result.available ? t("该 ID 当前可用，提交时会再次检查。", "Available now; checked again on submission.") : t("该 ID 不可用或被禁用。", "This ID is unavailable or forbidden.") }); })}>{t("检查可用性", "Check availability")}</Button>
                        <Button disabled={busy || !status?.can_change || value === status?.public_id || !/^[A-Z0-9]{4,6}$/.test(value)} onClick={() => setConfirm(true)}>{t("修改 ID", "Change ID")}</Button>
                    </Stack>
                </>}
                {admin && <>
                    <Tabs value={tab} onChange={(_, next) => { setTab(next); if (next === 2) run(() => loadAudit()); }} variant="scrollable">
                        <Tab label={t("使用记录", "Usage history")} disabled={!canHistory && !canManage} />
                        <Tab label={t("禁用词", "Denylist")} disabled={!canRules} />
                        <Tab label={t("管理审计", "Admin audit")} disabled={!canHistory} />
                    </Tabs>
                    {(tab === 0 || tab === 2) && <>
                        <TextField label={t("账号 UID（留空查询全部）", "Account UID (empty for all)")} disabled={busy} value={target} onChange={e => { setTarget(e.target.value); setStatus(null); }} />
                        {tab === 0 && <TextField label={t("当前或历史 ID（可选）", "Current or historical ID (optional)")} value={searchID} onChange={e => setSearchID(e.target.value.toUpperCase())} />}
                        <Button disabled={busy} onClick={() => run(async () => { if (tab === 2) await loadAudit(); else { if (canHistory) await loadHistory(); if (canManage && target) setStatus(await request(`/admin/account-ids/status?uid=${encodeURIComponent(target)}`)); } })}>{t("查询", "Search")}</Button>
                    </>}
                    {tab === 0 && <>
                        {canManage && target && status && <Accordion><AccordionSummary expandIcon={<ExpandMoreRounded />}>{t("冷却管理", "Cooldown management")}</AccordionSummary><AccordionDetails><Stack spacing={2}>
                            <Typography>{status.public_id} · {t("下次可修改：", "Next change: ")}{date(status.next_change_at)}{status.change_credit ? t(" · 已有一次豁免", " · Waiver granted") : ""}</Typography>
                            <TextField label={t("解除原因（必填）", "Reason (required)")} value={reason} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 256 } }} />
                            <Button disabled={busy || !reason.trim() || status.change_credit} onClick={() => run(async () => { setStatus(await request("/admin/account-ids/credit", "POST", { uid: Number(target), reason })); setReason(""); setMessage({ severity: "success", text: t("已授予一次修改豁免。", "One change waiver granted.") }); })}>{t("授予一次修改豁免", "Grant one change waiver")}</Button>
                        </Stack></AccordionDetails></Accordion>}
                        {canHistory && <>
                            <Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow>{["UID", "ID", t("开始", "Started"), t("结束", "Ended"), t("占用截止", "Reserved until"), t("来源", "Source"), t("当前 ID", "Current ID"), t("现持有者 UID", "Current holder UID")].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{history.list.map(row => <TableRow key={row.id}><TableCell>{row.uid}</TableCell><TableCell>{row.public_id}</TableCell><TableCell>{date(row.started_at)}</TableCell><TableCell>{date(row.ended_at)}</TableCell><TableCell>{date(row.reserved_until)}</TableCell><TableCell>{row.source}</TableCell><TableCell>{row.current_id}</TableCell><TableCell>{row.claim_reserved_until === null || row.claim_reserved_until > Date.now() / 1000 ? row.claim_owner_uid : "—"}</TableCell></TableRow>)}</TableBody></Table></Box>
                            <Stack direction="row"><Button disabled={busy || page <= 1} onClick={() => run(() => loadHistory(page - 1))}>{t("上一页", "Previous")}</Button><Typography sx={{ p: 1 }}>{page} / {Math.max(1, Math.ceil(history.total_items / 50))}</Typography><Button disabled={busy || page * 50 >= history.total_items} onClick={() => run(() => loadHistory(page + 1))}>{t("下一页", "Next")}</Button></Stack>
                        </>}
                    </>}
                    {tab === 1 && canRules && <>
                        <Alert severity="info">{t("新增规则不自动修改已有 ID。先预览受影响账号，再保存规则。", "New rules do not rename existing accounts. Preview affected accounts before saving.")}</Alert>
                        <TextField label={t("禁用词（1–6 位字母数字）", "Word (1–6 letters or digits)")} disabled={busy} value={rule.word} onChange={e => { setRule({ ...rule, word: e.target.value.toUpperCase() }); setPreview(null); }} />
                        <TextField select label={t("匹配方式", "Match mode")} disabled={busy} value={rule.mode} onChange={e => { setRule({ ...rule, mode: e.target.value }); setPreview(null); }}><MenuItem value="exact">{t("完全匹配", "Exact")}</MenuItem><MenuItem value="contains">{t("包含匹配", "Contains")}</MenuItem></TextField>
                        <FormControlLabel control={<Switch disabled={busy} checked={!!rule.enabled} onChange={(_, enabled) => { setRule({ ...rule, enabled }); setPreview(null); }} />} label={t("启用规则", "Enabled")} />
                        <TextField label={t("内部备注", "Internal note")} value={rule.note} onChange={e => setRule({ ...rule, note: e.target.value })} slotProps={{ htmlInput: { maxLength: 256 } }} />
                        <Stack direction="row"><Button disabled={busy || !/^[A-Z0-9]{1,6}$/.test(rule.word)} onClick={() => run(async () => setPreview(await request("/admin/account-ids/preview", "POST", rule)))}>{t("预览影响", "Preview impact")}</Button><Button disabled={busy || !preview} onClick={() => run(async () => { await request("/admin/account-ids/rules", "PUT", { ...rule, enabled: !!rule.enabled }); setRules((await request("/admin/account-ids/rules")).list); setRule({ word: "", mode: "exact", enabled: true, note: "" }); setPreview(null); })}>{t("保存规则", "Save rule")}</Button><Button disabled={busy} onClick={() => { setRule({ word: "", mode: "exact", enabled: true, note: "" }); setPreview(null); }}>{t("清空", "Clear")}</Button></Stack>
                        {preview && <Alert severity={preview.total_items ? "warning" : "info"}>{t("当前命中账号数：", "Affected accounts: ")}{preview.total_items}<Box>{preview.list.map(row => <Typography key={row.uid} variant="body2">{row.public_id} · {row.name} · UID {row.uid}</Typography>)}</Box></Alert>}
                        {rules.map(row => <Stack direction="row" spacing={1} key={row.id} alignItems="center"><Typography sx={{ flex: 1 }}>{row.word} · {row.mode} · {row.enabled ? t("启用", "Enabled") : t("停用", "Disabled")} · {row.note}</Typography><Button disabled={busy} onClick={() => { setRule({ ...row, enabled: !!row.enabled }); setPreview(null); }}>{t("编辑", "Edit")}</Button><Button color="error" disabled={busy} onClick={() => setDeleteID(row.id)}>{t("删除", "Delete")}</Button></Stack>)}
                    </>}
                    {tab === 2 && canHistory && <>
                        {audit.list.map(row => <Box key={row.id}><Typography variant="body2">{date(row.timestamp)} · {row.action} · {t("操作人 UID", "Actor UID")} {row.actor_uid} · {t("目标 UID", "Target UID")} {row.target_uid ?? "—"}</Typography><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{JSON.stringify(row.detail)}</Typography></Box>)}
                        <Stack direction="row"><Button disabled={busy || auditPage <= 1} onClick={() => run(() => loadAudit(auditPage - 1))}>{t("上一页", "Previous")}</Button><Typography sx={{ p: 1 }}>{auditPage}</Typography><Button disabled={busy || auditPage * 50 >= audit.total_items} onClick={() => run(() => loadAudit(auditPage + 1))}>{t("下一页", "Next")}</Button></Stack>
                    </>}
                </>}
            </Stack>
        </AccordionDetails>
        <Dialog open={confirm} onClose={() => !busy && setConfirm(false)}><DialogTitle>{t("确认修改个人 ID", "Confirm account ID change")}</DialogTitle><DialogContent>{message?.severity === "error" && <Alert severity="error">{message.text}</Alert>}<Typography>{status?.public_id} → {value}</Typography><Typography>{t("修改后旧主页立即失效，下次修改需等待 6 个自然月。", "Your previous profile URL stops resolving immediately. Your next change is available in 6 calendar months.")}</Typography></DialogContent><DialogActions><Button disabled={busy} onClick={() => setConfirm(false)}>{t("取消", "Cancel")}</Button><Button disabled={busy} onClick={() => run(async () => { const result = await request("/user/account-id", "PATCH", { public_id: value }); setStatus(result); setConfirm(false); window.location.assign("/settings/profile"); })}>{t("确认修改", "Confirm change")}</Button></DialogActions></Dialog>
        <Dialog open={deleteID !== null} onClose={() => !busy && setDeleteID(null)}><DialogTitle>{t("删除禁用规则？", "Delete denylist rule?")}</DialogTitle><DialogActions><Button disabled={busy} onClick={() => setDeleteID(null)}>{t("取消", "Cancel")}</Button><Button disabled={busy} color="error" onClick={() => run(async () => { await request(`/admin/account-ids/rules?id=${deleteID}`, "DELETE"); setDeleteID(null); setRules((await request("/admin/account-ids/rules")).list); })}>{t("删除", "Delete")}</Button></DialogActions></Dialog>
    </Accordion>;
}
