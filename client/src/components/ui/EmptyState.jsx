import { Film } from 'lucide-react';

export default function EmptyState({ title = 'Nothing showing here', detail = 'Try changing your filters or check back soon.', action }) {
  return <div className="empty-state"><Film size={34} aria-hidden="true" /><h3>{title}</h3><p>{detail}</p>{action}</div>;
}
