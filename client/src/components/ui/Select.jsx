export default function Select({ label, error, helper, id, options, className = '', ...props }) {
  const selectId = id || props.name;
  return <label className={`field ${className}`} htmlFor={selectId}><span>{label}</span><select id={selectId} aria-invalid={Boolean(error)} aria-describedby={error ? `${selectId}-error` : helper ? `${selectId}-help` : undefined} {...props}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error && <small id={`${selectId}-error`} className="field-error">{error}</small>}{helper && !error && <small id={`${selectId}-help`} className="field-hint">{helper}</small>}</label>;
}
