import { LoaderCircle } from 'lucide-react';

export default function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', type = 'button', disabled = false, ...props }) {
  return (
    <button {...props} type={type} className={`btn btn-${variant} btn-${size} ${className}`} disabled={loading || disabled}>
      {loading && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
