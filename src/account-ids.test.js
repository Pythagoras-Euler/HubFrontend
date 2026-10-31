import { describe, expect, it, vi } from "vitest";
import { isMemberID, normalizeAccountID, findAccountByID } from "./account-ids";

describe("public member identifiers", () => {
    it("accepts alphanumeric strings without numeric coercion", () => {
        for (const id of ["AB12", "abcd", "0000", "123456", "ABCDEF"]) expect(isMemberID(id)).toBe(true);
    });
    it("does not treat system actors or legacy numeric IDs as members", () => {
        for (const id of [null, undefined, -1, -1000, 123, 1234, "123", "AB_1", "ABCDEFG", "ＡBCD", "ABCD\n"]) expect(isMemberID(id)).toBe(false);
    });
    it("normalizes profile routes without losing leading zeroes", () => {
        expect(normalizeAccountID("00ab")).toBe("00AB");
        expect(normalizeAccountID(undefined)).toBe("");
    });
    it("queries the normalized public ID", async () => {
        const profile = { uid: 1, userid: "00AB" };
        const fetch = vi.fn().mockResolvedValue(profile);
        expect(await findAccountByID("00ab", fetch, true)).toBe(profile);
        expect(fetch).toHaveBeenCalledWith({ public_user_id: "00AB" });
    });
    it("allows the caller to fall back to names such as Alice", async () => {
        const fetch = vi.fn().mockResolvedValue({ error: "not_found" });
        expect(await findAccountByID("Alice", fetch)).toBe(null);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("preserves numeric TruckersMP searches after a public ID miss", async () => {
        const profile = { uid: 1, userid: "AB12" };
        const fetch = vi.fn().mockResolvedValueOnce({ error: "not_found" }).mockResolvedValueOnce(profile);
        expect(await findAccountByID("123456", fetch, true)).toBe(profile);
        expect(fetch.mock.calls).toEqual([[{ public_user_id: "123456" }], [{ truckersmpid: "123456" }]]);
    });
    it("finds external accounts without treating them as members", async () => {
        const profile = { uid: 3, userid: null, public_user_id: "EXT1" };
        const fetch = vi.fn().mockResolvedValue(profile);
        expect(await findAccountByID("EXT1", fetch)).toBe(profile);
        expect(await findAccountByID("EXT1", fetch, true)).toBe(null);
    });
});
