// API userid values are public strings; negative numbers are system actors.
export const isMemberID = value => typeof value === "string" && value.length >= 4 && value.length <= 6 && !/[^A-Z0-9]/i.test(value);
export const normalizeAccountID = value => String(value || "").toUpperCase();

// A 4–6 character name can look like an ID. Return null so the caller can
// continue its existing name search; retain short numeric TruckersMP searches.
export async function findAccountByID(value, fetchProfile, membersOnly = false) {
    const queries = [];
    if (isMemberID(value)) queries.push({ public_user_id: normalizeAccountID(value) });
    if (/^[0-9]{5,10}$/.test(value)) queries.push({ truckersmpid: value });
    for (const query of queries) {
        const profile = await fetchProfile(query);
        if (profile && !profile.error && profile.uid != null && (!membersOnly || isMemberID(profile.userid))) return profile;
    }
    return null;
}
