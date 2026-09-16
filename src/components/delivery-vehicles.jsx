import { Card, CardContent, Grid, Typography } from "@mui/material";

export function vehicleName(vehicle, fallback) {
    return [vehicle?.brand?.name, vehicle?.name].filter(Boolean).join(" ") || fallback;
}

export default function DeliveryVehicles({ detail, tr }) {
    const trailers = Array.isArray(detail.trailers) ? detail.trailers : [];
    return (
        <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Card><CardContent>
                    <Typography variant="subtitle2" color="text.secondary">{tr("truck_model")}</Typography>
                    <Typography>{vehicleName(detail.truck, tr("unknown"))}</Typography>
                    <Typography variant="body2" color="text.secondary">{detail.truck?.license_plate || "—"}</Typography>
                </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Card><CardContent>
                    <Typography variant="subtitle2" color="text.secondary">{tr("trailer_model")}</Typography>
                    <Typography>{trailers.map(t => vehicleName(t, tr("unknown"))).join(" / ") || tr("unknown")}</Typography>
                    <Typography variant="body2" color="text.secondary">{trailers.map(t => t?.license_plate).filter(Boolean).join(" / ") || "—"}</Typography>
                </CardContent></Card>
            </Grid>
        </Grid>
    );
}
