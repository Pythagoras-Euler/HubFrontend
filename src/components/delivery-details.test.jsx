import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { companyLabel, formatDeliveryTime, DeliveryTimes, SpeedDetails, deliveryEventPositions, canReloadRoute } from "./delivery-details";

const tr = key => key;
const convert = (unit, kind, n) => `${Math.round(unit === "imperial" ? n / 1.609344 : n)}${unit === "imperial" ? "mi" : "km"}`;

describe("delivery details with incomplete tracker data", () => {
    it("does not turn missing, empty, nonnumeric or infinite fine speeds into NaN or zero", () => {
        for (const value of [undefined, null, "", " ", "bad", Infinity, -1]) {
            const html = renderToStaticMarkup(<SpeedDetails meta={{ speed: value, speed_limit: value }} tr={tr} convert={convert} />);
            expect(html).toContain("not_provided");
            expect(html).not.toMatch(/NaN|Infinity|0km|undefined/);
        }
    });
    it("preserves supplied zero and converts known m/s values for metric and imperial", () => {
        const html = renderToStaticMarkup(<SpeedDetails meta={{ speed: "25", speed_limit: 0 }} tr={tr} convert={convert} />);
        expect(html).toContain("90km/h");
        expect(html).toContain("0km/h");
        expect(renderToStaticMarkup(<SpeedDetails meta={{ speed: 25 }} unit="imperial" tr={tr} convert={convert} />)).toContain("56mi/h");
    });
    it("keeps supplied depot names/IDs and labels unnamed special transport depots", () => {
        expect(companyLabel({ name: " Depot A ", unique_id: "depot_a" }, true, tr)).toBe("Depot A");
        expect(companyLabel({ name: "", unique_id: "depot_a" }, true, tr)).toBe("depot_a");
        expect(companyLabel({ name: "", unique_id: "" }, true, tr)).toBe("special_depot_not_provided");
        expect(companyLabel(null, false, tr)).toBe("depot_not_provided");
    });
    it("renders both times and uses the offset at the delivery date, including daylight saving", () => {
        const winter = formatDeliveryTime("2025-12-01T12:00:00Z", "Europe/London", "en-GB", "missing");
        const summer = formatDeliveryTime("2025-09-01T12:00:00Z", "Europe/London", "en-GB", "missing");
        expect(winter).toContain("12:00:00");
        expect(summer).toContain("13:00:00");
        const html = renderToStaticMarkup(<DeliveryTimes detail={{ start_time: "2025-09-01T12:00:00Z", stop_time: "2025-09-01T12:30:00Z" }} timeZone="UTC" locale="en-GB" tr={tr} />);
        expect(html).toContain("12:00:00");
        expect(html).toContain("12:30:00");
        expect(html).toContain("UTC");
        expect(formatDeliveryTime(null, "UTC", "en", "missing")).toBe("missing");
        expect(formatDeliveryTime("broken", "UTC", "en", "missing")).toBe("missing");
        expect(formatDeliveryTime("2025-09-01T12:00:00Z", "bad-zone", "en", "missing")).toContain("UTC");
    });
    it("extracts only valid event positions, deduplicates, and excludes missing locations", () => {
        const events = [null, {}, { location: null }, { location: { x: null, z: 5 } },
            { location: { x: 0, z: 0 } }, { location: { x: "-10", z: "20" } },
            { location: { x: -10, z: 20 } }, { location: { x: 0, z: 50 } }];
        expect(deliveryEventPositions(events)).toEqual([[-10, 20], [0, 50]]);
        expect(deliveryEventPositions(undefined)).toEqual([]);
    });
    it("offers TrackSim route refresh only for TrackSim deliveries without telemetry", () => {
        expect(canReloadRoute("tracksim", "")).toBe(true);
        expect(canReloadRoute("tracksim", "v5...")).toBe(false);
        expect(canReloadRoute("trucky", "")).toBe(false);
        expect(canReloadRoute("custom", "")).toBe(false);
    });
});
