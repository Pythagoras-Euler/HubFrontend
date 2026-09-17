import { describe, it, expect } from "vitest";
import { profileChartWindow, profileChartSeries } from "./profile-chart-data";
describe("profile chart date windows", () => {
    it("includes today regardless of the browser timezone", () => {
        const window = profileChartWindow(7, new Date("2026-09-17T10:30:00Z"));
        expect(window.before).toBe(Date.parse("2026-09-18T00:00:00Z") / 1000);
        expect(window.before - window.ranges * window.interval).toBe(Date.parse("2026-09-11T00:00:00Z") / 1000);
    });
    it("keeps yearly charts within the API bucket limit", () => {
        const window = profileChartWindow(365);
        expect(window.ranges).toBeLessThanOrEqual(100);
        expect(window.ranges * window.interval).toBe(365 * 86400);
    });
    it("keeps zero distinct from missing and preserves negative profit", () => {
        const result = profileChartSeries([{ distance: { sum: 0 }, fuel: { sum: null }, profit: { euro: -200, dollar: "bad" }, start_time: 1, end_time: 2 }]);
        expect(result.distance).toEqual([0]); expect(result.fuel).toEqual([null]);
        expect(result.euro).toEqual([-200]); expect(result.dollar).toEqual([null]);
        expect(result.axis).toEqual([{startTime:1,endTime:2}]);
    });
});
