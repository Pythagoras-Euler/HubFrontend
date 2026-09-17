export function profileChartWindow(days, now = new Date()) {
    const before = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) / 1000;
    const binDays = days > 100 ? 5 : 1;
    return { before, ranges: Math.ceil(days / binDays), interval: binDays * 86400 };
}
export function profileChartSeries(rows) {
    const number = v => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
    return {
        activity: {
            all: rows.some(r => Number(r.job?.sum) > 0),
            euro: rows.some(r => Number(r.job?.ets2) > 0),
            dollar: rows.some(r => Number(r.job?.ats) > 0),
        },
        distance: rows.map(r => number(r.distance?.sum)), fuel: rows.map(r => number(r.fuel?.sum)),
        euro: rows.map(r => number(r.profit?.euro)), dollar: rows.map(r => number(r.profit?.dollar)),
        axis: rows.map(r => ({ endTime: r.end_time, startTime: r.start_time })),
    };
}
