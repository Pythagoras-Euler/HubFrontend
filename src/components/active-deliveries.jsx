import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionSummary, AccordionDetails, Chip, Stack, Typography } from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { AppContext } from "../context";
import { makeRequestsAuto } from "../functions";
import DeliveryVehicles from "./delivery-vehicles";
import { UNKNOWN, formatDeliveryTime } from "./delivery-details";

export default function ActiveDeliveries() {
    const { apiPath, userSettings } = useContext(AppContext);
    const { t: tr, i18n } = useTranslation();
    const [jobs, setJobs] = useState([]);
    useEffect(() => {
        let active = true;
        async function load() {
            const [result] = await makeRequestsAuto([{ url: `${apiPath}/trucky/active`, auth: "prefer" }]);
            if (active && Array.isArray(result?.list)) setJobs(result.list);
        }
        load(); const timer = setInterval(load, 60000);
        return () => { active = false; clearInterval(timer); };
    }, [apiPath]);
    if (!jobs.length) return null;
    return <Stack spacing={1} sx={{ my: 2 }}>
        <Typography variant="h6">{tr("in_progress")} ({jobs.length})</Typography>
        {jobs.map(job => <Accordion key={job.trackerid}>
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Chip color={job.stale ? "warning" : "info"} size="small" label={tr(job.stale ? "sync_delayed" : "in_progress")} />
                    <Typography>Trucky #{job.trackerid} · {job.driver || UNKNOWN}</Typography>
                    <Typography>{job.source?.city || UNKNOWN} → {job.destination?.city || UNKNOWN}</Typography>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Typography>{tr("cargo")}: {job.cargo || UNKNOWN}</Typography>
                <Typography>{tr("source_company")}: {job.source?.company || UNKNOWN} · {tr("destination_company")}: {job.destination?.company || UNKNOWN}</Typography>
                <Typography>{tr("transport_started_at")}: {formatDeliveryTime(job.start_time, userSettings.display_timezone, i18n.language, UNKNOWN)}</Typography>
                <Typography>{tr("transport_ended_at")}: {UNKNOWN}</Typography>
                <DeliveryVehicles detail={job} tr={tr} />
            </AccordionDetails>
        </Accordion>)}
    </Stack>;
}
