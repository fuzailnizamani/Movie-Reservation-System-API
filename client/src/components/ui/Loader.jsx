import { LoaderCircle } from 'lucide-react';

export default function Loader({ label = 'Loading…' }) {
  return <div className="loader-wrap" role="status"><LoaderCircle className="spin" size={30} /><span>{label}</span></div>;
}
