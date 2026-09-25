import { useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppContext } from "../context";

import { Card, Box, Grid, Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography, TextField, MenuItem } from "@mui/material";

import { makeRequestsAuto } from "../functions";
import UserCard from "../components/usercard";
import TileMap from "../components/tilemap";

const Map = () => {

    const { t: tr } = useTranslation();
    const { apiPath, webConfig, users, memberUIDs, dlogDetailsCache } = useContext(AppContext);
    const allMembers = memberUIDs.map(uid => users[uid]);

    const [servers, setServers] = useState([]);
    const [serverId, setServerId] = useState('');
    const server = servers.find(item => item.id === serverId);
    const [points, setPoints] = useState([]);
    const [boundary, setBoundary] = useState({});
    const [displayUser, setDisplayUser] = useState({});
    const [orangeOnly, setOrangeOnly] = useState(false);
    const handleToggleVtcOnly = useCallback(() => setOrangeOnly(value => !value), []);
    const boundaryRef = useRef(boundary);
    boundaryRef.current = boundary;
    const memberIds = allMembers.filter(Boolean).map(member => String(member.truckersmpid));
    const membersRef = useRef(memberIds);
    membersRef.current = memberIds;
    useEffect(() => {
        let active = true;
        async function load() {
            const [data] = await makeRequestsAuto([{url: `${apiPath}/map/servers`, auth:false}]);
            if (!active || !Array.isArray(data?.servers)) return;
            setServers(data.servers);
            setServerId(current => data.servers.some(s => s.id === current) ? current : (data.servers.find(s => s.online)?.id ?? data.servers[0]?.id ?? ''));
        }
        load(); const timer = setInterval(load, 300000);
        return () => {active=false; clearInterval(timer);};
    }, [apiPath]);
    useEffect(() => {
        let active = true, running = false;
        const controller = new AbortController();
        setPoints([]); setBoundary({}); boundaryRef.current = {};
        async function load() {
            const b = boundaryRef.current;
            if (running || !server?.online || !server.mapid || b.x1 === undefined) return;
            running = true;
            try {
                const response = await fetch(`https://tracker.ets2map.com/v3/area?x1=${b.x1}&y1=${b.y2}&x2=${b.x2}&y2=${b.y1}&server=${server.mapid}`, {signal:controller.signal});
                if (!response.ok) throw Error('Map feed unavailable');
                const data = await response.json();
                if (active) setPoints((Array.isArray(data.Data) ? data.Data : []).map(item => ({x:item.X,y:item.Y,color:membersRef.current.includes(String(item.MpId)) ? '#f39621' : '#158CFB',info:{...item}})));
            } catch {if (active) setPoints([]);} finally {running=false;}
        }
        const timer = setInterval(load,5000);
        return () => {active=false;controller.abort();clearInterval(timer);};
    }, [server?.id, server?.mapid, server?.online]);

    const cityIDs = useMemo(() => {
        let ids = {};
        if (dlogDetailsCache.source_city !== undefined) {
            for (let i = 0; i < dlogDetailsCache["source_city"].length; i++) {
                ids[dlogDetailsCache["source_city"][i]["unique_id"]] = dlogDetailsCache["source_city"][i]["name"];
            }
        }
        if (dlogDetailsCache.destination_city !== undefined) {
            for (let i = 0; i < dlogDetailsCache["destination_city"].length; i++) {
                ids[dlogDetailsCache["destination_city"][i]["unique_id"]] = dlogDetailsCache["destination_city"][i]["name"];
            }
        }
        return ids;
    }, [dlogDetailsCache]);

    const companyIDs = useMemo(() => {
        let ids = {};
        if (dlogDetailsCache.source_company !== undefined) {
            for (let i = 0; i < dlogDetailsCache["source_company"].length; i++) {
                ids[dlogDetailsCache["source_company"][i]["unique_id"]] = dlogDetailsCache["source_company"][i]["name"];
            }
        }
        if (dlogDetailsCache.destination_company !== undefined) {
            for (let i = 0; i < dlogDetailsCache["destination_company"].length; i++) {
                ids[dlogDetailsCache["destination_company"][i]["unique_id"]] = dlogDetailsCache["destination_company"][i]["name"];
            }
        }
        return ids;
    }, [dlogDetailsCache]);

    const cargoIDs = useMemo(() => {
        let ids = {};
        if (dlogDetailsCache.cargo !== undefined) {
            for (let i = 0; i < dlogDetailsCache["cargo"].length; i++) {
                ids[dlogDetailsCache["cargo"][i]["unique_id"]] = dlogDetailsCache["cargo"][i]["name"];
            }
        }
        return ids;
    }, [dlogDetailsCache]);

    const handlePointClick = useCallback(data => {
        let info = data.info;
        if (info.Job !== undefined && info.Job.LoadName !== "") {
            if (cargoIDs[info.Job.LoadName.replace("cargo.", "")] !== undefined) {
                info.cargo = cargoIDs[info.Job.LoadName.replace("cargo.", "")];
            } else {
                info.cargo = info.Job.LoadName.replace("cargo.", "");
            }
            if (companyIDs[info.Job.SourceCompany.replace("company.permanent.", "")] !== undefined && cityIDs[info.Job.SourceCity.replace("city.", "")] !== undefined) {
                info.source = companyIDs[info.Job.SourceCompany.replace("company.permanent.", "")] + ", " + cityIDs[info.Job.SourceCity.replace("city.", "")];
            } else {
                info.source = info.Job.SourceCompany.replace("company.permanent.", "") + ", " + info.Job.SourceCity.replace("city.", "");
            }
            if (companyIDs[info.Job.DestinationCompany.replace("company.permanent.", "")] !== undefined && cityIDs[info.Job.DestinationCity.replace("city.", "")] !== undefined) {
                info.destination = companyIDs[info.Job.DestinationCompany.replace("company.permanent.", "")] + ", " + cityIDs[info.Job.DestinationCity.replace("city.", "")];
            } else {
                info.destination = info.Job.DestinationCompany.replace("company.permanent.", "") + ", " + info.Job.DestinationCity.replace("city.", "");
            }
        }
        for (let i = 0; i < allMembers.length; i++) {
            if (allMembers[i].truckersmpid === info.MpId) {
                setDisplayUser({ ...info, ...allMembers[i] });
                return;
            }
        }
        setDisplayUser(info);
    }, []);

    return (
        <Card>
            <Box sx={{p:2}}>
                <TextField select fullWidth label="TruckersMP" value={serverId} onChange={event => setServerId(event.target.value)}>
                    {servers.map(item => <MenuItem key={item.id} value={item.id}>{item.game} / {item.name}{item.online ? '' : ` (${tr("offline")})`}</MenuItem>)}
                </TextField>
            </Box>
            {server && <Box sx={{p:2}}>
                <TileMap key={`${server.id}:${server.promods}`} tilesUrl={`https://map.charlws.com/${server.game.toLowerCase()}/${server.promods ? 'promods' : 'base'}/tiles`}
                    title={<>{server.game} / {server.name}<br/>{!server.online || !server.mapid ? tr("live_data_feed_no_data") :
                        <span style={{cursor:'pointer'}} onClick={handleToggleVtcOnly}>{orangeOnly ? tr("showing_vtc_drivers_only") : tr("showing_all_players")}&nbsp;{tr("click_to_toggle")}</span>}</>}
                    points={points} onBoundaryChange={setBoundary} onPointClick={handlePointClick} showOrangeOnly={orangeOnly}/>
            </Box>}
            <Dialog open={displayUser.MpId !== undefined} onClose={() => setDisplayUser({})}>
                <DialogTitle>
                    {displayUser.userid === undefined ? (
                        <>{tr("truckersmp_player")}</>
                    ) : (
                        <>
                            {webConfig.name} {tr("driver")}
                        </>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid size={4}>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                {tr("name")}
                            </Typography>
                            <Typography variant="body2">{displayUser.userid === undefined ? <>{displayUser.Name}</> : <UserCard user={displayUser} />}</Typography>
                        </Grid>
                        <Grid size={4}>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                TruckersMP
                            </Typography>
                            <Typography variant="body2">
                                <a href={`https://truckersmp.com/user/${displayUser.MpId}`} target="_blank" rel="noreferrer">
                                    {displayUser.MpId}
                                </a>
                            </Typography>
                        </Grid>
                        <Grid size={4}>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                {tr("player_id")}
                            </Typography>
                            <Typography variant="body2">{displayUser.PlayerId}</Typography>
                        </Grid>
                        <Grid size={4}>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                X
                            </Typography>
                            <Typography variant="body2">{displayUser.X}</Typography>
                        </Grid>
                        <Grid size={4}>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                Y
                            </Typography>
                            <Typography variant="body2">{displayUser.Y}</Typography>
                        </Grid>
                        <Grid size={4}>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                {tr("heading")}
                            </Typography>
                            <Typography variant="body2">{displayUser.Heading}</Typography>
                        </Grid>
                        {displayUser.Job !== undefined && (
                            <>
                                {displayUser.cargo === undefined && (
                                    <>
                                        <Grid size={4}>
                                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                                {tr("status")}
                                            </Typography>
                                            <Typography variant="body2">{tr("free_roaming")}</Typography>
                                        </Grid>
                                    </>
                                )}
                                {displayUser.cargo !== undefined && (
                                    <>
                                        <Grid size={4}>
                                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                                {tr("cargo")}
                                            </Typography>
                                            <Typography variant="body2">{displayUser.cargo}</Typography>
                                        </Grid>
                                        <Grid size={4}>
                                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                                {tr("source")}
                                            </Typography>
                                            <Typography variant="body2">{displayUser.source}</Typography>
                                        </Grid>
                                        <Grid size={4}>
                                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                                {tr("destination")}
                                            </Typography>
                                            <Typography variant="body2">{displayUser.destination}</Typography>
                                        </Grid>
                                    </>
                                )}
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setDisplayUser({});
                        }}>
                        {tr("close")}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

export default Map;
