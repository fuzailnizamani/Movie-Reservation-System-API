import { Search, SlidersHorizontal } from 'lucide-react';

export default function MovieFilters({ search, setSearch, genre, setGenre, genres, showArchived, setShowArchived, isAdmin }) {
  return <div className="filter-bar"><label className="search-box"><Search size={18} /><span className="sr-only">Search movies</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles" /></label>
    <label className="select-wrap"><SlidersHorizontal size={16} /><span className="sr-only">Filter genre</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="">All genres</option>{genres.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    {isAdmin && <label className="toggle-control"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label>}
  </div>;
}
