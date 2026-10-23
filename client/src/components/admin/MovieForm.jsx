import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';

const schema = z.object({ title: z.string().trim().min(1, 'Title is required'), duration_minutes: z.coerce.number().int().positive('Use a positive duration'), release_date: z.string().min(1, 'Release date is required'), genre: z.string().optional(), description: z.string().optional(), poster: z.string().optional() });
export default function MovieForm({ initial = {}, onSubmit, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { title: initial.title || '', duration_minutes: initial.duration_minutes || 100, release_date: initial.release_date?.slice(0, 10) || '', genre: initial.genre || '', description: initial.description || '', poster: initial.poster || '' } });
  return <form className="admin-form" onSubmit={handleSubmit(async (values) => { await onSubmit({ ...values, genre: values.genre || null, description: values.description || null, poster: values.poster || null }); })} noValidate>
    <label className="field"><span>Title</span><input {...register('title')} />{errors.title && <small className="field-error">{errors.title.message}</small>}</label>
    <div className="form-columns"><label className="field"><span>Duration (minutes)</span><input type="number" {...register('duration_minutes')} />{errors.duration_minutes && <small className="field-error">{errors.duration_minutes.message}</small>}</label><label className="field"><span>Release date</span><input type="date" {...register('release_date')} />{errors.release_date && <small className="field-error">{errors.release_date.message}</small>}</label></div>
    <label className="field"><span>Genre</span><input placeholder="Drama, comedy…" {...register('genre')} /></label><label className="field"><span>Poster URL</span><input type="url" placeholder="https://…" {...register('poster')} /></label><label className="field"><span>Description</span><textarea rows="4" {...register('description')} /></label>
    <div className="modal-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" loading={isSubmitting}>Save movie</Button></div>
  </form>;
}
