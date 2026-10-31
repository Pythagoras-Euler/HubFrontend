// Isolated UI fixture; not an entry point in production builds.
import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline, Container, Typography } from "@mui/material";
import { AppContext } from "../context";
import { customAxios } from "../functions";
import i18n from "../i18n";
import AccountIDSettings from "../components/account-id-settings";

await i18n.changeLanguage("zh");
const state = { public_id: "AB12", can_change: true, next_change_at: null, change_credit: false };
const rules = [];
window.idTestRequests = [];
customAxios.defaults.adapter = async config => {
    const outer = new URL(config.url, location.origin);
    const url = new URL(outer.searchParams.get("url") || config.url, location.origin);
    const path = url.pathname;
    const body = config.data ? JSON.parse(config.data) : {};
    window.idTestRequests.push({ path, method: config.method, body });
    let data = {};
    if (path.endsWith("/availability")) data = { available: true };
    else if (path.endsWith("/account-id") || path.endsWith("/status")) {
        if (config.method === "patch") Object.assign(state, { public_id: body.public_id, can_change: false, change_credit: false });
        data = { ...state };
    } else if (path.endsWith("/credit")) {
        Object.assign(state, { can_change: true, change_credit: true }); data = { ...state };
    } else if (path.endsWith("/history")) data = { list: [{ id: 1, uid: 1, public_id: "AB12", started_at: 1800000000, ended_at: null, source: "system", current_id: "AB12", claim_owner_uid: 1, claim_reserved_until: null }], total_items: 1 };
    else if (path.endsWith("/audit")) data = { list: [{ id: 1, actor_uid: 2, target_uid: 1, action: "grant_credit", detail: { reason: "本地测试" }, timestamp: 1800000000 }], total_items: 1 };
    else if (path.endsWith("/preview")) data = { list: [], total_items: 0 };
    else if (path.endsWith("/rules")) {
        if (config.method === "put") {
            const existing = rules.findIndex(r => r.id === body.id);
            if (existing >= 0) rules[existing] = body;
            else rules.push({ ...body, id: rules.length + 1 });
        }
        if (config.method === "delete") rules.splice(rules.findIndex(r => r.id === Number(url.searchParams.get("id"))), 1);
        data = { list: [...rules] };
    }
    return { data, status: 200, statusText: "OK", headers: {}, config };
};
const dark = new URLSearchParams(location.search).has("dark");
createRoot(document.getElementById("root")).render(<ThemeProvider theme={createTheme({ palette: { mode: dark ? "dark" : "light" } })}><CssBaseline /><AppContext.Provider value={{ apiPath: "http://local.test/hub", curUserPerm: ["administrator"] }}><Container maxWidth="md" sx={{ py: 4 }}><Typography variant="h5">个人资料 · 本地交互测试</Typography><AccountIDSettings uid={1} /><AccountIDSettings uid={1} admin /></Container></AppContext.Provider></ThemeProvider>);
