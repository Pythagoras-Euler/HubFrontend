import { UNKNOWN } from "./delivery-details";
import { Card, CardContent, Grid, Typography } from "@mui/material";

export function vehicleName(vehicle, fallback) {
    return [vehicle?.brand?.name, vehicle?.name].filter(v => typeof v === "string" && v.trim()).join(" ") || vehicle?.unique_id || vehicle?.body_type || fallback;
}

export default function DeliveryVehicles({ detail, tr }) {
    const trailers = Array.isArray(detail.trailers) ? detail.trailers : [];
    return (
        <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Card><CardContent>
                    <Typography variant="subtitle2" color="text.secondary">{tr("truck_model")}</Typography>
                    <Typography>{vehicleName(detail.truck, UNKNOWN)}</Typography>
                    <Typography variant="body2" color="text.secondary">{detail.truck?.license_plate || UNKNOWN}</Typography>
                </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Card><CardContent>
                    <Typography variant="subtitle2" color="text.secondary">{tr("trailer_model")}</Typography>
                    <Typography>{trailers.map(t => vehicleName(t, UNKNOWN)).join(" / ") || UNKNOWN}</Typography>
                    <Typography variant="body2" color="text.secondary">{trailers.map(t => t?.license_plate).filter(Boolean).join(" / ") || UNKNOWN}</Typography>
                </CardContent></Card>
            </Grid>
        </Grid>
    );
}
