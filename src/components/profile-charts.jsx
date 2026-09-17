import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Button, ButtonGroup, Grid, Typography } from "@mui/material";
import { RouteRounded, LocalGasStationRounded, EuroRounded, AttachMoneyRounded } from "@mui/icons-material";
import { AppContext } from "../context";
import { makeRequestsAuto, ConvertUnit, TSep } from "../functions";
import StatCard from "./statcard";
import { profileChartWindow, profileChartSeries } from "./profile-chart-data";

export default function ProfileCharts({ userid }) {
    const { apiPath, userSettings } = useContext(AppContext);
    const { t: tr } = useTranslation();
    const [days, setDays] = useState(30);
    const [series, setSeries] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let current = true;
        setSeries(null); setError(false);
        const params = new URLSearchParams({ userid, ...profileChartWindow(days), sum_up: false });
        makeRequestsAuto([{ url: `${apiPath}/dlog/statistics/chart?${params}`, auth: "prefer" }]).then(([data]) => {
            if (!current) return;
            setError(!Array.isArray(data));
            if (Array.isArray(data)) setSeries(profileChartSeries(data));
        });
        return () => { current = false; };
    }, [apiPath, userid, days]);
    const cards = [
        ["distance", "distance", <RouteRounded />, value => ConvertUnit(userSettings.unit, "km", value)],
        ["fuel", "fuel", <LocalGasStationRounded />, value => ConvertUnit(userSettings.unit, "l", value)],
        ["euro", "profit_ets2", <EuroRounded />, value => `€${TSep(value)}`],
        ["dollar", "profit_ats", <AttachMoneyRounded />, value => `$${TSep(value)}`],
    ];
    return <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
            <Typography variant="subtitle2">{tr("profile_recent_days", { days })} · UTC</Typography>
            <ButtonGroup size="small" aria-label={tr("time_range")}>
                {[7, 30, 90, 365].map(value => <Button key={value} variant={days === value ? "contained" : "outlined"} onClick={() => setDays(value)}>{value}{tr("days")}</Button>)}
            </ButtonGroup>
        </Box>
        {!series && <Typography>{tr(error ? "operation_failed" : "loading")}</Typography>}
        {series && <Grid container spacing={2}>{cards.map(([key, label, icon, format]) => <Grid key={key} size={{ xs: 12, sm: 6 }}>
            <StatCard icon={icon} title={tr(label)} inputs={series[key]} latest={format(series[key].reduce((sum, v) => sum + (v ?? 0), 0))}
                originalInputs={series[key].map(value => value === null ? "-*-*-" : format(value))} xAxis={series.axis}
                emptyText={series.activity[key === "euro" || key === "dollar" ? key : "all"] ? undefined : tr("profile_no_activity")} color={key === "fuel" ? "#e39a20" : key === "distance" ? "#2196f3" : "#2eaa78"} size="small" height="100px" />
        </Grid>)}</Grid>}
        <Typography variant="subtitle2" sx={{ mt: 2 }}>{tr("profile_lifetime_stats")}</Typography>
    </Box>;
}
