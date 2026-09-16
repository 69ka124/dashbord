import type { InputHTMLAttributes } from "react";

type FormFieldProps = {
  label: string;
  name: string;
  className?: string;
  wrapperClassName?: string;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "defaultValue" | "required" | "list" | "placeholder" | "step"
>;

export function FormField({
  label,
  name,
  className,
  wrapperClassName,
  placeholder,
  ...inputProps
}: FormFieldProps) {
  return (
    <label className={`form-field ${wrapperClassName ?? ""}`.trim()}>
      <span className="form-field-label">{label}</span>
      <input
        className={`field ${className ?? ""}`.trim()}
        name={name}
        placeholder={placeholder ?? label}
        aria-label={label}
        {...inputProps}
      />
    </label>
  );
}
