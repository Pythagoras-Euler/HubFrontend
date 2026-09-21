import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionSummary, AccordionDetails, Chip, Stack, Typography, Button, ButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { AppContext } from "../context";
import { makeRequestsAuto, customAxios as axios, getAuthToken } from "../functions";
import DeliveryVehicles from "./delivery-vehicles";
import { UNKNOWN, formatDeliveryTime } from "./delivery-details";

export default function ActiveDeliveries() {
    const { apiPath, userSettings } = useContext(AppContext);
    const { t: tr, i18n } = useTranslation();
    const [jobs, setJobs] = useState([]);
    const [closed, setClosed] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [refresh, setRefresh] = useState(0);
    async function abandon() {
        if (!confirm || busy) return;
        setBusy(true); setError("");
        try {
            const response = await axios({url: `${apiPath}/deliveries/active/${confirm.tracker}/${confirm.trackerid}/abandon`, method:"POST", headers:{Authorization:`Bearer ${getAuthToken()}`}, data:{confirmed:true}});
            if (response.status === 200) { setConfirm(null); setRefresh(value => value + 1); }
            else setError(response.data?.error || tr("operation_failed"));
        } catch { setError(tr("operation_failed")); } finally { setBusy(false); }
    }
    useEffect(() => {
        let active = true;
        async function load() {
            const [result] = await makeRequestsAuto([{ url: `${apiPath}/deliveries/active?include_closed=${closed}`, auth: "prefer" }]);
            if (active && Array.isArray(result?.list)) setJobs(result.list);
        }
        load(); const timer = setInterval(load, 60000);
        return () => { active = false; clearInterval(timer); };
    }, [apiPath, closed, refresh]);

    return <Stack spacing={1} sx={{ my: 2 }}>
        <Typography variant="h6">{tr("active_transports")}</Typography>
        <ButtonGroup size="small"><Button variant={!closed ? "contained" : "outlined"} onClick={() => setClosed(false)}>{tr("in_progress")}</Button><Button variant={closed ? "contained" : "outlined"} onClick={() => setClosed(true)}>{tr("closed_transports")}</Button></ButtonGroup>
        {error && <Alert severity="error">{error}</Alert>}
        {!jobs.length && <Typography color="text.secondary">{tr("no_transports")}</Typography>}
        <Dialog open={Boolean(confirm)} onClose={() => !busy && setConfirm(null)}>
            <DialogTitle>{tr("abandon_transport")}</DialogTitle>
            <DialogContent><Typography>{tr("confirm_abandon_transport")}</Typography><Typography>{confirm?.driver} #{confirm?.trackerid}</Typography></DialogContent>
            <DialogActions><Button disabled={busy} onClick={() => setConfirm(null)}>{tr("cancel")}</Button><Button variant="contained" color="error" disabled={busy} onClick={abandon}>{tr("confirm_abandon")}</Button></DialogActions>
        </Dialog>
        {jobs.map(job => <Accordion key={`${job.tracker}:${job.trackerid}`}>
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Chip color={job.stale ? "warning" : "info"} size="small" label={tr(job.status !== "in_progress" ? "transport_" + job.status : job.stale ? "sync_delayed" : "in_progress")} />
                    <Typography>{(job.trackers || [job.tracker]).map(name => name === "truckershub" ? "TruckersHub" : "Trucky").join(" / ")} #{job.trackerid} · {job.driver || UNKNOWN}</Typography>
                    <Typography>{job.source?.city || UNKNOWN} → {job.destination?.city || UNKNOWN}</Typography>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Typography>{tr("cargo")}: {job.cargo || UNKNOWN}</Typography>
                <Typography>{tr("source_company")}: {job.source?.company || UNKNOWN} · {tr("destination_company")}: {job.destination?.company || UNKNOWN}</Typography>
                <Typography>{tr("transport_started_at")}: {formatDeliveryTime(job.start_time, userSettings.display_timezone, i18n.language, UNKNOWN)}</Typography>
                <Typography>{tr("transport_ended_at")}: {UNKNOWN}</Typography>
                <DeliveryVehicles detail={job} tr={tr} />
                {job.can_abandon && <Button sx={{mt: 2}} variant="contained" color="warning" onClick={() => { setError(""); setConfirm(job); }}>{tr("abandon_transport")}</Button>}
            </AccordionDetails>
        </Accordion>)}
    </Stack>;
}
