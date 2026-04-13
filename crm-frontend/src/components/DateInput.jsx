import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import GlobalStyles from "@mui/material/GlobalStyles";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useState, useEffect } from "react";

function useIsDark() {
    const [dark, setDark] = useState(() => document.body.classList.contains("dark"));
    useEffect(() => {
        const obs = new MutationObserver(() =>
            setDark(document.body.classList.contains("dark"))
        );
        obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);
    return dark;
}

export default function DateInput({ value, onChange, minDate }) {
    const dark = useIsDark();
    const parsed = value ? dayjs(value) : null;

    const inputBg = dark ? "#0f172a" : "#ffffff";
    const inputColor = dark ? "#f1f5f9" : "#111827";
    const borderColor = dark ? "#334155" : "#d1d5db";
    const iconColor = dark ? "#94a3b8" : "#6b7280";
    const paperBg = dark ? "#1e293b" : "#ffffff";
    const paperBorder = dark ? "#334155" : "#e5e7eb";
    const dayColor = dark ? "#f1f5f9" : "#111827";
    const dayHoverBg = dark ? "#253347" : "#f0fdf4";
    const weekLabel = dark ? "#64748b" : "#9ca3af";
    const disabledColor = dark ? "#475569" : "#d1d5db";

    return (
        <>
            {/*
                MUI X v8 + MUI v7 class names.
                Se usa GlobalStyles para inyectar CSS real en el <head>
                y ganar la batalla de especificidad contra emotion.
            */}
            <GlobalStyles styles={{
                // ─── INPUT: contenedor ───────────────────────────────────────
                // v8 puede usar MuiPickersTextField o MuiFormControl como raíz
                ".MuiPickersTextField-root, .MuiFormControl-root:has(.MuiPickersInputBase-root)": {
                    width: "100%",
                },

                // Fondo del input
                ".MuiPickersInputBase-root": {
                    backgroundColor: `${inputBg} !important`,
                    borderRadius: "8px !important",
                    fontSize: "13px !important",
                    fontFamily: "inherit !important",
                },

                // Borde (fieldset)
                ".MuiPickersInputBase-root fieldset": {
                    borderColor: `${borderColor} !important`,
                },
                ".MuiPickersInputBase-root:hover fieldset": {
                    borderColor: "#16a34a !important",
                },
                ".MuiPickersInputBase-root.Mui-focused fieldset": {
                    borderColor: "#16a34a !important",
                    borderWidth: "1px !important",
                },

                // ─── INPUT: texto DD/MM/YYYY (son <span>, no <input>) ────────
                // v8 mantiene MuiPickersSectionList
                ".MuiPickersSectionList-root": {
                    padding: "8.5px 12px !important",
                    color: `${inputColor} !important`,
                    fontFamily: "inherit !important",
                    fontSize: "13px !important",
                },
                ".MuiPickersSectionList-section": {
                    color: `${inputColor} !important`,
                },
                ".MuiPickersSectionList-sectionContent": {
                    color: `${inputColor} !important`,
                },
                ".MuiPickersSectionList-sectionSeparator": {
                    color: `${inputColor} !important`,
                },
                // Sección activa (cuando el usuario está editando DD, MM o YYYY)
                ".MuiPickersSectionList-section[data-active='true'] .MuiPickersSectionList-sectionContent": {
                    backgroundColor: "#16a34a !important",
                    color: "#ffffff !important",
                    borderRadius: "2px",
                },

                // ─── INPUT: ícono calendario ─────────────────────────────────
                ".MuiPickersInputBase-root .MuiInputAdornment-root button": {
                    color: `${iconColor} !important`,
                },
                ".MuiPickersInputBase-root .MuiInputAdornment-root svg": {
                    color: `${iconColor} !important`,
                    fill: `${iconColor} !important`,
                    fontSize: "18px !important",
                },

                // ─── POPOVER: papel ───────────────────────────────────────────
                ".MuiPickersPopper-root .MuiPaper-root": {
                    backgroundColor: `${paperBg} !important`,
                    border: `1px solid ${paperBorder} !important`,
                    borderRadius: "12px !important",
                    boxShadow: dark
                        ? "0 8px 32px rgba(0,0,0,0.5) !important"
                        : "0 8px 32px rgba(0,0,0,0.15) !important",
                },

                // ─── POPOVER: calendario ──────────────────────────────────────
                ".MuiPickersPopper-root .MuiDateCalendar-root": {
                    backgroundColor: `${paperBg} !important`,
                    color: `${dayColor} !important`,
                },

                // Header mes/año
                ".MuiPickersPopper-root .MuiPickersCalendarHeader-label": {
                    color: `${dayColor} !important`,
                    fontWeight: "600 !important",
                    fontSize: "14px !important",
                    fontFamily: "inherit !important",
                },
                ".MuiPickersPopper-root .MuiPickersCalendarHeader-switchViewButton": {
                    color: `${iconColor} !important`,
                },
                ".MuiPickersPopper-root .MuiPickersCalendarHeader-switchViewButton svg": {
                    fill: `${iconColor} !important`,
                },

                // Flechas
                ".MuiPickersPopper-root .MuiPickersArrowSwitcher-button": {
                    color: `${iconColor} !important`,
                },
                ".MuiPickersPopper-root .MuiPickersArrowSwitcher-button svg": {
                    fill: `${iconColor} !important`,
                },

                // Etiquetas L M X J V S D
                ".MuiPickersPopper-root .MuiDayCalendar-weekDayLabel": {
                    color: `${weekLabel} !important`,
                    fontFamily: "inherit !important",
                    fontSize: "12px !important",
                },

                // Días
                ".MuiPickersPopper-root .MuiPickersDay-root": {
                    color: `${dayColor} !important`,
                    backgroundColor: "transparent !important",
                    fontFamily: "inherit !important",
                    fontSize: "13px !important",
                },
                ".MuiPickersPopper-root .MuiPickersDay-root:hover": {
                    backgroundColor: `${dayHoverBg} !important`,
                },
                ".MuiPickersPopper-root .MuiPickersDay-root:focus": {
                    backgroundColor: `${dayHoverBg} !important`,
                },

                // Día seleccionado
                ".MuiPickersPopper-root .MuiPickersDay-root.Mui-selected": {
                    backgroundColor: "#16a34a !important",
                    color: "#ffffff !important",
                },
                ".MuiPickersPopper-root .MuiPickersDay-root.Mui-selected:hover": {
                    backgroundColor: "#15803d !important",
                },

                // Hoy sin seleccionar
                ".MuiPickersPopper-root .MuiPickersDay-today:not(.Mui-selected)": {
                    border: "1px solid #16a34a !important",
                    color: "#16a34a !important",
                    backgroundColor: "transparent !important",
                },

                // Días fuera del mes
                ".MuiPickersPopper-root .MuiPickersDay-dayOutsideMonth": {
                    color: `${disabledColor} !important`,
                },

                // Días deshabilitados
                ".MuiPickersPopper-root .MuiPickersDay-root.Mui-disabled": {
                    color: `${disabledColor} !important`,
                    opacity: "0.45 !important",
                },

                // ─── POPOVER: vista AÑO ───────────────────────────────────────
                ".MuiPickersPopper-root .MuiYearCalendar-root": {
                    backgroundColor: `${paperBg} !important`,
                },
                ".MuiPickersPopper-root .MuiPickersYear-yearButton": {
                    color: `${dayColor} !important`,
                    fontFamily: "inherit !important",
                },
                ".MuiPickersPopper-root .MuiPickersYear-yearButton:hover": {
                    backgroundColor: `${dayHoverBg} !important`,
                },
                ".MuiPickersPopper-root .MuiPickersYear-yearButton.Mui-selected": {
                    backgroundColor: "#16a34a !important",
                    color: "#ffffff !important",
                },
                ".MuiPickersPopper-root .MuiPickersYear-yearButton.Mui-disabled": {
                    color: `${disabledColor} !important`,
                    opacity: "0.45 !important",
                },

                // ─── POPOVER: vista MES ───────────────────────────────────────
                ".MuiPickersPopper-root .MuiMonthCalendar-root": {
                    backgroundColor: `${paperBg} !important`,
                },
                ".MuiPickersPopper-root .MuiPickersMonth-monthButton": {
                    color: `${dayColor} !important`,
                    fontFamily: "inherit !important",
                },
                ".MuiPickersPopper-root .MuiPickersMonth-monthButton:hover": {
                    backgroundColor: `${dayHoverBg} !important`,
                },
                ".MuiPickersPopper-root .MuiPickersMonth-monthButton.Mui-selected": {
                    backgroundColor: "#16a34a !important",
                    color: "#ffffff !important",
                },

                // ─── POPOVER: footer ──────────────────────────────────────────
                ".MuiPickersPopper-root .MuiDialogActions-root": {
                    backgroundColor: `${paperBg} !important`,
                },
                ".MuiPickersPopper-root .MuiDialogActions-root button": {
                    color: "#16a34a !important",
                    fontFamily: "inherit !important",
                },
            }} />

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <DatePicker
                    value={parsed}
                    onChange={(newVal) => onChange(newVal ? newVal.format("YYYY-MM-DD") : "")}
                    minDate={minDate ? dayjs(minDate) : undefined}
                    slotProps={{
                        textField: {
                            size: "small",
                            fullWidth: true,
                            sx: {
                                // Estos sx sirven como fallback / refuerzo
                                "& .MuiPickersInputBase-root": {
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    fontFamily: "inherit",
                                    backgroundColor: inputBg,
                                },
                                "& .MuiPickersSectionList-root": {
                                    color: inputColor,
                                    fontFamily: "inherit",
                                    fontSize: "13px",
                                },
                                "& fieldset": { borderColor },
                                "&:hover fieldset": { borderColor: "#16a34a" },
                                "& .MuiPickersInputBase-root.Mui-focused fieldset": {
                                    borderColor: "#16a34a",
                                    borderWidth: "1px",
                                },
                                "& .MuiIconButton-root": { color: iconColor },
                                "& .MuiSvgIcon-root": { fontSize: "18px", color: iconColor },
                            },
                        },
                    }}
                />
            </LocalizationProvider>
        </>
    );
}