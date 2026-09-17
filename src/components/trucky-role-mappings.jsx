import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { AppContext } from "../context";
import { checkUserPerm, customAxios as axios, getAuthToken, makeRequestsAuto } from "../functions";

export default function TruckyRoleMappings() {
    const { apiPath, curUserPerm } = useContext(AppContext);
    const { t: tr } = useTranslation();
    const [data, setData] = useState({ list: [], roles: [] });
    const [choices, setChoices] = useState({});
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const allowed = checkUserPerm(curUserPerm, ["administrator"]);
    async function load() {
        const [result] = await makeRequestsAuto([{ url: `${apiPath}/trucky/role-mappings`, auth: true }]);
        if (result?.list) setData(result);
    }
    useEffect(() => { if (allowed) load(); }, [apiPath, allowed]);
    if (!allowed) return null;
    async function save(row, choice) {
        setBusy(true); setError("");
        try {
            const result = await axios({ url: `${apiPath}/trucky/role-mappings/${row.companyid}/${row.source_roleid}`, method: "PUT", headers: { Authorization: `Bearer ${getAuthToken()}` }, data: choice });
            if (result.status !== 200) setError(result.data?.error || tr("operation_failed"));
            else await load();
        } finally { setBusy(false); }
    }
    return <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
        <Typography variant="h6">{tr("trucky_role_mapping")}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {!data.list.length && <Typography>{tr("no_pending_roles")}</Typography>}
        <Stack spacing={2} sx={{ mt: 1 }}>
            {data.list.map(row => {
                const key = `${row.companyid}:${row.source_roleid}`;
                const choice = choices[key] || { action: row.confirmed ? "map" : "create", name: row.source_name, target_roleid: row.target_roleid || "" };
                const change = values => setChoices({ ...choices, [key]: { ...choice, ...values } });
                return <Stack key={key} direction={{ xs: "column", md: "row" }} spacing={1} sx={{ alignItems: { md: "center" } }}>
                    <Typography sx={{ minWidth: 160 }}>{row.source_name} · {tr(row.confirmed ? "mapped" : "pending_confirmation")}</Typography>
                    <TextField select size="small" label={tr("action")} value={choice.action} onChange={e => change({ action: e.target.value })} sx={{ minWidth: 150 }}>
                        <MenuItem value="create">{tr("create_role")}</MenuItem><MenuItem value="map">{tr("map_existing_role")}</MenuItem><MenuItem value="trainee">{tr("assign_trainee")}</MenuItem>
                    </TextField>
                    {choice.action === "create" && <TextField size="small" label={tr("role_name")} value={choice.name} onChange={e => change({ name: e.target.value })} />}
                    {choice.action === "map" && <TextField select size="small" label={tr("role")} value={choice.target_roleid} onChange={e => change({ target_roleid: e.target.value })} sx={{ minWidth: 150 }}>
                        {data.roles.map(role => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}
                    </TextField>}
                    <Button disabled={busy || (choice.action === "map" && choice.target_roleid === "")} onClick={() => save(row, choice)}>{tr("confirm")}</Button>
                </Stack>;
            })}
        </Stack>
    </Paper>;
}
