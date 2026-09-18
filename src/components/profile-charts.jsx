import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Grid, Typography } from "@mui/material";
import { RouteRounded, LocalGasStationRounded, EuroRounded, AttachMoneyRounded, LocalShippingRounded, PermContactCalendarRounded } from "@mui/icons-material";
import { AppContext } from "../context";
import { makeRequestsAuto, ConvertUnit, TSep } from "../functions";
import StatCard from "./statcard";
import { profileChartWindow, profileChartSeries } from "./profile-chart-data";
import ChartRange from "./chart-range";

export default function ProfileCharts({ userid, extended = false, showLifetime = true, days: selectedDays, onDaysChange, windowOverride }) {
    const { apiPath, userSettings } = useContext(AppContext);
    const { t: tr } = useTranslation();
    const [localDays, setLocalDays] = useState(30);
    const days = selectedDays === undefined ? localDays : selectedDays;
    const setDays = onDaysChange || setLocalDays;
    const [series, setSeries] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let current = true;
        setSeries(null); setError(false);
        const params = new URLSearchParams({ ...(windowOverride || profileChartWindow(days)), sum_up: false });
        if (userid !== undefined && userid !== null && userid !== -1000) params.set("userid", userid);
        makeRequestsAuto([{ url: `${apiPath}/dlog/statistics/chart?${params}`, auth: "prefer" }]).then(([data]) => {
            if (!current) return;
            setError(!Array.isArray(data));
            if (Array.isArray(data)) setSeries(profileChartSeries(data));
        }).catch(() => { if (current) setError(true); });
        return () => { current = false; };
    }, [apiPath, userid, days, windowOverride?.before, windowOverride?.ranges, windowOverride?.interval]);
    const cards = [
        ...(extended ? [["drivers", "chart_new_drivers", <PermContactCalendarRounded />, TSep], ["jobs", "jobs", <LocalShippingRounded />, TSep]] : []),
        ["distance", "distance", <RouteRounded />, value => ConvertUnit(userSettings.unit, "km", value)],
        ["fuel", "fuel", <LocalGasStationRounded />, value => ConvertUnit(userSettings.unit, "l", value)],
        ["euro", "profit_ets2", <EuroRounded />, value => `€${TSep(value)}`],
        ["dollar", "profit_ats", <AttachMoneyRounded />, value => `$${TSep(value)}`],
    ];
    return <Box sx={{ mb: 2 }}>
        <ChartRange days={days} onChange={setDays} />
        {!series && <Typography>{tr(error ? "operation_failed" : "loading")}</Typography>}
        {series && <Grid container spacing={2}>{cards.map(([key, label, icon, format]) => <Grid key={key} size={{ xs: 12, sm: 6, lg: extended ? 4 : 6 }}>
            <StatCard icon={icon} title={tr(label)} inputs={series[key]} latest={format(series[key].reduce((sum, v) => sum + (v ?? 0), 0))}
                originalInputs={series[key].map(value => value === null ? "-*-*-" : format(value))} xAxis={series.axis}
                emptyText={key === "drivers" ? tr("chart_no_new_drivers") : series.activity[key === "euro" || key === "dollar" ? key : "all"] ? undefined : tr("profile_no_activity")} color={key === "fuel" ? "#e39a20" : key === "distance" || key === "jobs" ? "#2196f3" : "#2eaa78"} size="small" height="100px" />
        </Grid>)}</Grid>}
        {showLifetime && <Typography variant="subtitle2" sx={{ mt: 2 }}>{tr("profile_lifetime_stats")}</Typography>}
    </Box>;
}
