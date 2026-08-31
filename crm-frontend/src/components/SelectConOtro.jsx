import { useState } from "react";

/**
 * Select con opción "Otro": si lo que el cliente necesita no está en la lista,
 * el usuario elige "Otro" y captura el valor a mano (texto libre).
 *
 * - `options`: arreglo de strings, o de objetos { value, label }.
 * - El valor guardado siempre es el texto final (sea de la lista o personalizado).
 * - Al editar una cotización, si el valor guardado no está en la lista, se muestra
 *   automáticamente en modo "Otro" con el texto ya cargado.
 */
export default function SelectConOtro({
  value,
  onChange,
  options = [],
  placeholder = "Seleccione...",
  className = "qt-input",
  otherLabel = "Otro (especificar)…",
  otherPlaceholder = "Escribe la opción…",
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const values = opts.map((o) => o.value);

  const hasValue = value !== undefined && value !== null && value !== "";
  const valueInList = hasValue && values.includes(value);

  const [otherMode, setOtherMode] = useState(hasValue && !valueInList);
  const [justPicked, setJustPicked] = useState(false);

  const showOther = otherMode || (hasValue && !valueInList);

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "__otro__") {
      setJustPicked(true);
      setOtherMode(true);
      onChange("");
    } else {
      setJustPicked(false);
      setOtherMode(false);
      onChange(v);
    }
  };

  return (
    <>
      <select
        className={className}
        value={showOther ? "__otro__" : (value || "")}
        onChange={handleSelect}
      >
        <option value="">{placeholder}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        <option value="__otro__">{otherLabel}</option>
      </select>

      {showOther && (
        <input
          className={className}
          style={{ marginTop: 6 }}
          type="text"
          placeholder={otherPlaceholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={justPicked}
        />
      )}
    </>
  );
}
