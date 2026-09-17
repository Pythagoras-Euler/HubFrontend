export const UNKNOWN = "-*-*-";

import { Typography } from "@mui/material";

export function finiteNumber(value) {
    if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export function companyLabel(company, special, tr) {
    const name = company?.name?.trim();
    const id = company?.unique_id?.trim();
    return name || id || UNKNOWN;
}

export function formatDeliveryTime(value, timeZone, locale, fallback) {
    if (!value) return fallback;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return fallback;
    const options = { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" };
    try {
        return new Intl.DateTimeFormat(locale, { ...options, timeZone: timeZone || "UTC" }).format(date);
    } catch {
        return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
    }
}

export function DeliveryTimes({ detail, timeZone, locale, tr }) {
    return <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
        {tr("transport_started_at")}: {formatDeliveryTime(detail?.start_time, timeZone, locale, UNKNOWN)}
        <br />
        {tr("transport_ended_at")}: {formatDeliveryTime(detail?.stop_time, timeZone, locale, UNKNOWN)}
    </Typography>;
}

export function SpeedDetails({ meta = {}, unit, convert, tr, maximum = false }) {
    const speed = finiteNumber(maximum ? meta.max_speed : meta.speed);
    const limit = finiteNumber(meta.speed_limit);
    const display = number => number !== null && number >= 0 ? `${convert(unit, "km", number * 3.6)}/h` : UNKNOWN;
    return <>
        {tr(maximum ? "max_speed" : "speed")}: {display(speed)}
        <br />
        {tr("limit")}: {display(limit)}
    </>;
}

// These are isolated event coordinates. Never connect them into an invented route.
export function deliveryEventPositions(events) {
    const positions = [];
    const seen = new Set();
    for (const event of events || []) {
        const x = finiteNumber(event?.location?.x);
        const z = finiteNumber(event?.location?.z);
        if (x === null || z === null || (x === 0 && z === 0)) continue;
        const key = `${x},${z}`;
        if (!seen.has(key)) positions.push([x, z]);
        seen.add(key);
    }
    return positions;
}

export function canReloadRoute(tracker, telemetry) {
    return tracker === "tracksim" && !telemetry;
}
