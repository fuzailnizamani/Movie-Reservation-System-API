export default function Input({ label, error, helper, id, className = '', ...props }) {
  const inputId = id || props.name;
  return <label className={`field ${className}`} htmlFor={inputId}><span>{label}</span><input id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-help` : undefined} {...props} />{error && <small id={`${inputId}-error`} className="field-error">{error}</small>}{helper && !error && <small id={`${inputId}-help`} className="field-hint">{helper}</small>}</label>;
}
