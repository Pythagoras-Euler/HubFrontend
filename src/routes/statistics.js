import { useEffect, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { AppContext } from "../context";
import { Grid, Typography } from "@mui/material";
import { LocalShippingRounded, WidgetsRounded, FlightTakeoffRounded, FlightLandRounded } from "@mui/icons-material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag, faRightFromBracket, faTowerObservation, faTrailer } from "@fortawesome/free-solid-svg-icons";
import DateTimeField from "../components/datetime";
import UserSelect from "../components/userselect";
import Podium from "../components/podium";
import ProfileCharts from "../components/profile-charts";
import ChartRange from "../components/chart-range";
import { profileChartWindow } from "../components/profile-chart-data";
import { makeRequestsAuto } from "../functions";
function replaceUnderscores(str) {
    return str.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
const Statistics = () => {
    const { t: tr } = useTranslation();
    const { apiPath } = useContext(AppContext);
    const [days, setDays] = useState(30);
    const [bounds, setBounds] = useState(() => { const w = profileChartWindow(30); return [w.before - w.ranges * w.interval, w.before]; });
    const [startTime, endTime] = bounds;
    const [selectedUser, setSelectedUser] = useState({ userid: -1000 });
    const [detailStats, setDetailStats] = useState({});
    const total = endTime - startTime;
    const valid = Number.isFinite(total) && total >= 60;
    const ranges = Math.min(100, Math.max(1, Math.ceil(total / 86400)));
    const windowOverride = days ? undefined : { before: endTime, ranges, interval: Math.ceil(total / ranges) };
    const selectDays = value => { const w = profileChartWindow(value); setDays(value); setBounds([w.before - w.ranges * w.interval, w.before]); };
    useEffect(() => {
        let current = true;
        setDetailStats({});
        if (!valid) return;
        makeRequestsAuto([{ url: `${apiPath}/dlog/statistics/details?after=${startTime}&before=${endTime}${selectedUser.userid !== -1000 ? `&userid=${selectedUser.userid}` : ""}`, auth: true }])
            .then(([data]) => { if (current && data && !data.error) setDetailStats(data); }).catch(() => {});
        return () => { current = false; };
    }, [apiPath, startTime, endTime, selectedUser.userid, valid]);
    return (<>
        <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 4 }}><Typography>{tr("start_time")}</Typography><DateTimeField key={`start-${days}`} defaultValue={startTime} onChange={value => { setDays(null); setBounds(previous => [value, previous[1]]); }} fullWidth size="small" /></Grid>
            <Grid size={{ xs: 6, md: 4 }}><Typography>{tr("end_time")}</Typography><DateTimeField key={`end-${days}`} defaultValue={endTime} onChange={value => { setDays(null); setBounds(previous => [previous[0], value]); }} fullWidth size="small" /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><UserSelect users={[selectedUser]} isMulti={false} includeCompany onUpdate={setSelectedUser} /></Grid>
        </Grid>
        {valid ? <ProfileCharts userid={selectedUser.userid} extended showLifetime={false} days={days} onDaysChange={selectDays} windowOverride={windowOverride} /> : <><ChartRange days={days} onChange={selectDays} /><Typography>{tr("invalid_time_range")}</Typography></>}
        <Grid container spacing={2}>
                {detailStats.truck !== undefined && detailStats.truck.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: 4,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <LocalShippingRounded />
                                    &nbsp;&nbsp;{tr("top_trucks")}
                                </Typography>
                            }
                            first={{ name: detailStats.truck[0].name, stat: detailStats.truck[0].count }}
                            second={{ name: detailStats.truck[1].name, stat: detailStats.truck[1].count }}
                            third={{ name: detailStats.truck[2].name, stat: detailStats.truck[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.trailer !== undefined && detailStats.trailer.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: 4,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FontAwesomeIcon icon={faTrailer} />
                                    &nbsp;&nbsp;{tr("top_trailers")}
                                </Typography>
                            }
                            first={{ name: replaceUnderscores(detailStats.trailer[0].unique_id), stat: detailStats.trailer[0].count }}
                            second={{ name: replaceUnderscores(detailStats.trailer[1].unique_id), stat: detailStats.trailer[1].count }}
                            third={{ name: replaceUnderscores(detailStats.trailer[2].unique_id), stat: detailStats.trailer[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.cargo !== undefined && detailStats.cargo.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: 4,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <WidgetsRounded />
                                    &nbsp;&nbsp;{tr("top_cargos")}
                                </Typography>
                            }
                            first={{ name: detailStats.cargo[0].name, stat: detailStats.cargo[0].count }}
                            second={{ name: detailStats.cargo[1].name, stat: detailStats.cargo[1].count }}
                            third={{ name: detailStats.cargo[2].name, stat: detailStats.cargo[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.fine !== undefined && detailStats.fine.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: 4,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FontAwesomeIcon icon={faTowerObservation} />
                                    &nbsp;&nbsp;{tr("top_offences")}
                                </Typography>
                            }
                            first={{ name: replaceUnderscores(detailStats.fine[0].unique_id), stat: detailStats.fine[0].count }}
                            second={{ name: replaceUnderscores(detailStats.fine[1].unique_id), stat: detailStats.fine[1].count }}
                            third={{ name: replaceUnderscores(detailStats.fine[2].unique_id), stat: detailStats.fine[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.ferry !== undefined && detailStats.ferry.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 12,
                            lg: detailStats.fine !== undefined && detailStats.fine.length >= 3 ? 8 : 12,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FontAwesomeIcon icon={faFlag} />
                                    &nbsp;&nbsp;{tr("top_ferry_routes")}
                                </Typography>
                            }
                            first={{ name: detailStats.ferry[0].name, stat: detailStats.ferry[0].count }}
                            second={{ name: detailStats.ferry[1].name, stat: detailStats.ferry[1].count }}
                            third={{ name: detailStats.ferry[2].name, stat: detailStats.ferry[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.source_city !== undefined && detailStats.source_city.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: detailStats.plate_country !== undefined && detailStats.plate_country.length >= 3 ? 4 : 6,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FlightTakeoffRounded />
                                    &nbsp;&nbsp;{tr("top_source_cities")}
                                </Typography>
                            }
                            first={{ name: detailStats.source_city[0].name, stat: detailStats.source_city[0].count }}
                            second={{ name: detailStats.source_city[1].name, stat: detailStats.source_city[1].count }}
                            third={{ name: detailStats.source_city[2].name, stat: detailStats.source_city[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.destination_city !== undefined && detailStats.destination_city.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: detailStats.plate_country !== undefined && detailStats.plate_country.length >= 3 ? 4 : 6,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FlightLandRounded />
                                    &nbsp;&nbsp;{tr("top_destination_cities")}
                                </Typography>
                            }
                            first={{ name: detailStats.destination_city[0].name, stat: detailStats.destination_city[0].count }}
                            second={{ name: detailStats.destination_city[1].name, stat: detailStats.destination_city[1].count }}
                            third={{ name: detailStats.destination_city[2].name, stat: detailStats.destination_city[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.plate_country !== undefined && detailStats.plate_country.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 12,
                            lg: 4,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FontAwesomeIcon icon={faFlag} />
                                    &nbsp;&nbsp;{tr("top_plate_countries")}
                                </Typography>
                            }
                            first={{ name: detailStats.plate_country[0].name, stat: detailStats.plate_country[0].count }}
                            second={{ name: detailStats.plate_country[1].name, stat: detailStats.plate_country[1].count }}
                            third={{ name: detailStats.plate_country[2].name, stat: detailStats.plate_country[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.source_company !== undefined && detailStats.source_company.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: 6,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FontAwesomeIcon icon={faRightFromBracket} flip="horizontal" />
                                    &nbsp;&nbsp;{tr("top_source_companies")}
                                </Typography>
                            }
                            first={{ name: detailStats.source_company[0].name, stat: detailStats.source_company[0].count }}
                            second={{ name: detailStats.source_company[1].name, stat: detailStats.source_company[1].count }}
                            third={{ name: detailStats.source_company[2].name, stat: detailStats.source_company[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
                {detailStats.destination_company !== undefined && detailStats.destination_company.length >= 3 && (
                    <Grid
                        size={{
                            xs: 12,
                            sm: 12,
                            md: 6,
                            lg: 6,
                        }}>
                        <Podium
                            title={
                                <Typography variant="h5" component="div" sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                                    <FontAwesomeIcon icon={faRightFromBracket} />
                                    &nbsp;&nbsp;{tr("top_destination_companies")}
                                </Typography>
                            }
                            first={{ name: detailStats.destination_company[0].name, stat: detailStats.destination_company[0].count }}
                            second={{ name: detailStats.destination_company[1].name, stat: detailStats.destination_company[1].count }}
                            third={{ name: detailStats.destination_company[2].name, stat: detailStats.destination_company[2].count }}
                            fixWidth={true}
                        />
                    </Grid>
                )}
            </Grid>

        </>
    );
};

export default Statistics;
