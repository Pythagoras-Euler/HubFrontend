import { Box, Button, ButtonGroup, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function ChartRange({ days, onChange }) {
    const { t: tr } = useTranslation();
    return <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Typography variant="subtitle2">{days ? tr("profile_recent_days", { days }) : tr("time_range")} · UTC</Typography>
        <ButtonGroup size="small" aria-label={tr("time_range")}>
            {[7, 30, 90, 365].map(value => <Button key={value} variant={days === value ? "contained" : "outlined"} onClick={() => onChange(value)}>{value}{tr("days")}</Button>)}
        </ButtonGroup>
    </Box>;
}
