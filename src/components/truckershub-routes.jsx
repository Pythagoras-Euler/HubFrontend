import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { AppContext } from "../context";
import { checkUserPerm, customAxios as axios, getAuthToken, makeRequestsAuto } from "../functions";

export default function TruckersHubRoutes() {
    const { apiPath, curUserPerm } = useContext(AppContext);
    const { t: tr } = useTranslation();
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
            const [data] = await makeRequestsAuto([{ url: `${apiPath}/truckershub/routes/settings`, auth: true }]);
            if (current && typeof data?.configured === "boolean") {
                setConfigured(data.configured); setStatus(data.sync?.status || "");
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
            const result = await axios({ url: `${apiPath}/truckershub/routes/settings`, method: "PUT", headers: { Authorization: `Bearer ${getAuthToken()}` }, data: { api_key: value } });
            if (result.status !== 200) setError(result.data?.error || tr("operation_failed"));
            else { setConfigured(result.data.configured); setKey(""); setStatus(value ? "pending" : "disabled"); }
        } finally { setBusy(false); }
    }
    const labels = { pending: "pending", running: "in_progress", complete: "completed", failed: "operation_failed", disabled: "disabled" };
    return <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
        <Typography variant="h6">{tr("truckershub_routes")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{configured ? tr(labels[status] || "configured") : tr("not_configured")}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField type="password" label="TruckersHub API Token" value={key} autoComplete="new-password" onChange={e => setKey(e.target.value)} size="small" fullWidth />
            <Button disabled={busy || !key.trim()} onClick={() => save(key)}>{tr("save")}</Button>
            {configured && <Button disabled={busy} color="warning" onClick={() => save("")}>{tr("disconnect")}</Button>}
        </Stack>
    </Paper>;
}
