import { useContext, useEffect, useState } from "react";
import { Alert, Avatar, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AppContext } from "../context";
import { customAxios as axios, getAuthToken } from "../functions";

export default function AvatarSettings() {
    const { apiPath, curUser, setUsers } = useContext(AppContext);
    const { t: tr } = useTranslation();
    const [source, setSource] = useState("existing");
    const [url, setUrl] = useState("");
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        let active = true;
        axios({url:`${apiPath}/user/avatar`,headers:{Authorization:`Bearer ${getAuthToken()}`}}).then(r => {
            if (!active) return;
            if (r.status !== 200) throw Error(tr("operation_failed"));
            setSource(r.data.source);setUrl(r.data.url || "");
        }).catch(() => {if (active) setMessage({severity:"error",text:tr("operation_failed")});});
        return () => {active=false;};
    }, [apiPath]);
    async function save() {
        if (busy) return;
        if (source === "upload" && (!file || file.size > 2*1024*1024)) {
            setMessage({severity:"error",text:tr("avatar_limits")});return;
        }
        setBusy(true);setMessage(null);
        try {
            const response = await axios({url:`${apiPath}/user/avatar/${source}`,method:"PUT",
                headers:{Authorization:`Bearer ${getAuthToken()}`,"Content-Type":source === "upload" ? "application/octet-stream" : "application/json"},
                data:source === "upload" ? await file.arrayBuffer() : {url}});
            if (response.status !== 200) throw Error(response.data?.error || tr("operation_failed"));
            setUsers(users => ({...users,[curUser.uid]:{...users[curUser.uid],avatar:response.data.avatar}}));
            setMessage({severity:"success",text:tr("profile_updated")});
        } catch (error) {
            setMessage({severity:"error",text:error.response?.data?.error || error.message || tr("operation_failed")});
        } finally {setBusy(false);}
    }
    return <Stack spacing={2}>
        <Avatar src={curUser.avatar} sx={{width:72,height:72}} />
        <TextField select fullWidth label={tr("avatar_source")} value={source} disabled={busy} onChange={e => {setSource(e.target.value);setMessage(null);}}>
            <MenuItem value="existing" disabled>{tr("avatar_current")}</MenuItem>
            <MenuItem value="truckersmp">TruckersMP</MenuItem><MenuItem value="steam">Steam</MenuItem><MenuItem value="discord">Discord</MenuItem>
            <MenuItem value="external">{tr("avatar_external")}</MenuItem><MenuItem value="upload">{tr("avatar_upload")}</MenuItem>
        </TextField>
        {source === "external" && <TextField label={tr("avatar_url")} value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://" />}
        {source === "upload" && <Button component="label" disabled={busy}>{file?.name || tr("avatar_choose_file")}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {setFile(e.target.files?.[0] || null);setMessage(null);}} /></Button>}
        {(source === "upload" || source === "external") && <Typography variant="caption">{tr("avatar_limits")}</Typography>}
        <Button variant="contained" onClick={save} disabled={busy || source === "existing" || (source === "upload" && !file) || (source === "external" && !url)}>{tr("save_avatar")}</Button>
        {message && <Alert severity={message.severity}>{message.text}</Alert>}
    </Stack>;
}
