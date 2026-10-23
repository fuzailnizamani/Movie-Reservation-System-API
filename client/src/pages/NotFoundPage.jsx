import { Link } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';

export default function NotFoundPage() {
  return <section className="container not-found page-enter"><Clapperboard size={25} /><span className="eyebrow">WRONG SCREENING</span><h1>404</h1><h2>This page got lost in the multiplex.</h2><Link to="/" className="btn btn-primary">Back to home</Link></section>;
}
