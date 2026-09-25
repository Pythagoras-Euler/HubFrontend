import { Children, cloneElement, isValidElement, useState } from "react";
import { ClickAwayListener, SpeedDial } from "@mui/material";

export default function ClickSpeedDial({ children, ...props }) {
    const [open, setOpen] = useState(false);
    return <ClickAwayListener onClickAway={() => setOpen(false)}>
        <SpeedDial {...props} open={open}
            onOpen={(event, reason) => { if (reason === "toggle") setOpen(true); }}
            onClose={(event, reason) => { if (reason === "toggle" || reason === "escapeKeyDown") setOpen(false); }}>
            {Children.toArray(children).map(child => isValidElement(child) ? cloneElement(child, {
                onClick: event => {
                    try { child.props.onClick?.(event); }
                    finally { setOpen(false); }
                },
            }) : child)}
        </SpeedDial>
    </ClickAwayListener>;
}
