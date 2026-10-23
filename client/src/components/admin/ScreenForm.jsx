import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';

const schema = z.object({ name: z.string().trim().min(1, 'Screen name is required'), rows: z.coerce.number().int().min(1).max(26), seatsPerRow: z.coerce.number().int().min(1).max(30) });
export default function ScreenForm({ initial = {}, onSubmit, onCancel }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { name: initial.name || '', rows: 8, seatsPerRow: 10 } });
  const rows = Number(watch('rows') || 0); const count = Number(watch('seatsPerRow') || 0);
  return <form className="admin-form" onSubmit={handleSubmit(async ({ name, rows: rowCount, seatsPerRow }) => { const rowLetters = Array.from({ length: rowCount }, (_, index) => String.fromCharCode(65 + index)); await onSubmit({ name, total_capacity: rowCount * seatsPerRow, rowLetters, seatsPerRow }); })} noValidate>
    <label className="field"><span>Screen name</span><input placeholder="Main auditorium" {...register('name')} />{errors.name && <small className="field-error">{errors.name.message}</small>}</label>{!initial.id && <><div className="form-columns"><label className="field"><span>Rows</span><input type="number" min="1" max="26" {...register('rows')} /></label><label className="field"><span>Seats per row</span><input type="number" min="1" max="30" {...register('seatsPerRow')} /></label></div><p className="field-hint">Capacity preview: {rows * count} seats. Seat rows are labeled starting with A.</p></>}
    <div className="modal-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" loading={isSubmitting}>{initial.id ? 'Save name' : 'Create screen'}</Button></div>
  </form>;
}
