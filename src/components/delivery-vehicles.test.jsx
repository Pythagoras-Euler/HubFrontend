import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DeliveryVehicles, { vehicleName } from "./delivery-vehicles";

describe("delivery vehicles", () => {
    it("shows truck, every trailer and their plates directly on the page", () => {
        const html = renderToStaticMarkup(<DeliveryVehicles tr={key => key} detail={{
            truck: { brand: { name: "Volvo" }, name: "FH16", license_plate: "TRUCK123" },
            trailers: [
                { brand: { name: "Krone" }, name: "Dry Liner", license_plate: "TRAILER1" },
                { brand: null, name: "Dolly", license_plate: "TRAILER2" },
            ],
        }} />);
        for (const text of ["Volvo FH16", "Krone Dry Liner", "Dolly", "TRUCK123", "TRAILER1", "TRAILER2"])
            expect(html).toContain(text);
    });

    it("renders safely for empty, null and partially missing historical vehicles", () => {
        for (const detail of [{}, { truck: null, trailers: null }, { truck: { name: "Scania" }, trailers: [null, {}] }]) {
            const html = renderToStaticMarkup(<DeliveryVehicles detail={detail} tr={key => key} />);
            expect(html).toContain("-*-*-");
            expect(html).not.toContain("undefined");
        }
        expect(vehicleName({ name: "Scania" }, "unknown")).toBe("Scania");
        expect(vehicleName({ name: "", unique_id: "krone.dryliner", body_type: "dryvan" }, "-*-*-")).toBe("krone.dryliner");
        expect(vehicleName({ name: null, body_type: "lowbed" }, "-*-*-")).toBe("lowbed");
    });
});
