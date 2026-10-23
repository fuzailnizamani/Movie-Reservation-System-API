import { Link, useSearchParams } from 'react-router-dom';
import { CircleAlert, RotateCcw } from 'lucide-react';

export default function PaymentCancelPage() {
  const [params] = useSearchParams(); const reservationId = params.get('reservation_id');
  return <section className="container section success-wrap page-enter"><div className="success-mark success-mark-warning"><CircleAlert size={35} /></div><span className="eyebrow">CHECKOUT INTERRUPTED</span><h1>Payment not completed.</h1><p>Your seats may remain on hold for up to 10 minutes. Cancelling payment does not release them immediately.</p><div className="success-actions">{reservationId && <Link className="btn btn-primary" to={`/checkout/${reservationId}`}><RotateCcw size={16} /> Retry payment</Link>}<Link className="btn btn-secondary" to="/reservations">My reservations</Link></div></section>;
}
