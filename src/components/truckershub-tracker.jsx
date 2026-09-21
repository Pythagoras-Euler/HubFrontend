import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { AppContext } from "../context";
import { checkUserPerm, customAxios as axios, getAuthToken, makeRequestsAuto } from "../functions";

export default function TruckersHubTracker() {
    const { apiPath, curUserPerm } = useContext(AppContext);
    const { t: tr } = useTranslation();
    const [issues, setIssues] = useState([]);
    const [sync, setSync] = useState({});
    const [links, setLinks] = useState({});
    const [webhookPath, setWebhookPath] = useState(null);
    const [key, setKey] = useState("");
    const [configured, setConfigured] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const allowed = checkUserPerm(curUserPerm, ["administrator"]);
    useEffect(() => {
        if (!allowed) return;
        let current = true;
        async function load() {
            const [data] = await makeRequestsAuto([{ url: `${apiPath}/truckershub/settings`, auth: true }]);
            if (current && typeof data?.configured === "boolean") {
                setIssues(data.issues || []); setSync(data.sync || {}); setWebhookPath(data.webhook_path || null); setConfigured(data.configured); setStatus(data.sync?.status || "");
                setError(data.sync?.error || "");
            }
        }
        load(); const timer = setInterval(load, 30000);
        return () => { current = false; clearInterval(timer); };
    }, [apiPath, allowed]);
    if (!allowed) return null;
    async function save(value) {
        setBusy(true); setError("");
        try {
            const result = await axios({ url: `${apiPath}/truckershub/settings`, method: "PUT", headers: { Authorization: `Bearer ${getAuthToken()}` }, data: { api_key: value } });
            if (result.status !== 200) setError(result.data?.error || tr("operation_failed"));
            else { setWebhookPath(result.data.webhook_path || null); setConfigured(result.data.configured); setKey(""); setStatus(value ? "pending" : "disabled"); }
        } catch { setError(tr("operation_failed")); } finally { setBusy(false); }
    }
    async function retry(issue, decision) {
        if (decision === "separate" && !window.confirm(tr("truckershub_confirm_separate"))) return;
        setBusy(true); setError("");
        try {
            const result = await axios({ url: `${apiPath}/truckershub/retry`, method: "POST", headers: { Authorization: `Bearer ${getAuthToken()}` }, data: { provider: issue.provider, sourceid: issue.sourceid, decision, public_id: links[`${issue.provider}:${issue.sourceid}`] } });
            if (result.status === 200) { setIssues(previous => previous.filter(item => item.sourceid !== issue.sourceid || item.provider !== issue.provider)); setStatus("pending"); }
            else setError(result.data?.error || tr("operation_failed"));
        } catch { setError(tr("operation_failed")); } finally { setBusy(false); }
    }
    const labels = { partial: "truckershub_partial", pending: "pending", running: "in_progress", complete: "completed", failed: "operation_failed", disabled: "disabled" };
    return <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
        <Typography variant="h6">{tr("truckershub_deliveries")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{configured ? tr(labels[status] || "configured") : tr("not_configured")}</Typography>
        {configured && <Typography variant="body2" sx={{ mb: 1 }}>{tr("truckershub_progress", { month: sync.month || "-*-*-", imported: sync.imported || 0, linked: sync.linked || 0, failed: sync.failed || 0 })}</Typography>}
        {configured && sync.live_status === "unavailable" && <Typography variant="body2" sx={{ mb: 1 }}>{tr("truckershub_live_unavailable")}</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField type="password" label="TruckersHub API Token" value={key} autoComplete="new-password" onChange={e => setKey(e.target.value)} size="small" fullWidth />
            <Button disabled={busy || !key.trim()} onClick={() => save(key)}>{tr("save")}</Button>
            {configured && <Button disabled={busy} color="warning" onClick={() => save("")}>{tr("disconnect")}</Button>}
        </Stack>
        {configured && webhookPath && <TextField sx={{ mt: 2 }} label="TruckersHub Webhook URL" value={new URL(`${apiPath}${webhookPath}`, window.location.origin).href} slotProps={{ input: { readOnly: true } }} onClick={e => e.target.select()} size="small" fullWidth />}
        {issues.map(issue => <Paper key={`${issue.provider}:${issue.sourceid}`} variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography>{issue.provider === "trucky" ? "Trucky" : "TruckersHub"} #{issue.sourceid} / {tr(issue.state === "review" ? "truckershub_review" : "operation_failed")}</Typography>
            <Typography variant="body2">{issue.driver || "-*-*-"} ? {issue.source || "-*-*-"} ? {issue.destination || "-*-*-"} ? {issue.cargo || "-*-*-"}</Typography>
            {issue.state === "review" ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                <TextField label="Public ID" size="small" value={links[`${issue.provider}:${issue.sourceid}`] || ""} onChange={event => setLinks(previous => ({ ...previous, [`${issue.provider}:${issue.sourceid}`]: event.target.value }))} />
                <Button disabled={busy || !links[`${issue.provider}:${issue.sourceid}`]} onClick={() => retry(issue, "link")}>{tr("truckershub_link_existing")}</Button>
                <Button disabled={busy} onClick={() => retry(issue, "separate")}>{tr("truckershub_import_separate")}</Button>
            </Stack> : <Button disabled={busy} onClick={() => retry(issue)}>{tr("truckershub_retry")}</Button>}
        </Paper>)}
    </Paper>;
}
