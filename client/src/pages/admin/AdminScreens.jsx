import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Edit2,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createScreen,
  createScreenSeats,
  archiveScreen,
  getScreens,
  restoreScreen,
  updateScreen,
} from "../../api/screensApi";
import { errorMessage } from "../../api/axiosClient";
import ScreenForm from "../../components/admin/ScreenForm";
import SeatCategoryPricingForm from "../../components/admin/SeatCategoryPricingForm";
import DataTable from "../../components/admin/DataTable";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";

export default function AdminScreens() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [pricingScreen, setPricingScreen] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [actioningScreenId, setActioningScreenId] = useState(null);

  const load = useCallback(
    () =>
      getScreens(showArchived)
        .then(setScreens)
        .catch((error) => toast.error(errorMessage(error)))
        .finally(() => setLoading(false)),
    [showArchived],
  );
  useEffect(() => {
    load();
  }, [load]);

  const save = async ({ name, total_capacity, rowLetters, seatsPerRow }) => {
    try {
      if (editing?.id) {
        await updateScreen(editing.id, { name });
      } else {
        const screen = await createScreen({ name, total_capacity });
        await createScreenSeats(screen.id, { rowLetters, seatsPerRow });
      }
      toast.success(
        editing?.id ? "Screen name updated" : "Screen and seat map created",
      );
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const archive = async (screen) => {
    if (
      !window.confirm(
        `Archive "${screen.name}"? This removes it from future scheduling and preserves its seats, completed showtimes, reservations, receipts, and payment history. Screens with upcoming or running showtimes cannot be archived.`,
      )
    )
      return;
    setActioningScreenId(screen.id);
    try {
      const result = await archiveScreen(screen.id);
      toast.success(result.message || "Screen archived");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActioningScreenId(null);
    }
  };
  const restore = async (screen) => {
    setActioningScreenId(screen.id);
    try {
      const result = await restoreScreen(screen.id);
      toast.success(result.message || "Screen restored");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActioningScreenId(null);
    }
  };

  if (loading) return <Loader label="Loading screens…" />;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">AUDITORIUMS</span>
          <h1>Screens</h1>
          <p>Manage rooms, seats, and seat-category surcharges.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Add screen
        </button>
      </div>
      <div className="admin-page-actions">
        <button
          className="btn btn-secondary"
          onClick={() => setShowArchived((current) => !current)}
        >
          {showArchived ? "Show active screens" : "Show archived screens"}
        </button>
      </div>
      <DataTable
        columns={["Screen", "Capacity", "ID", "Status", "Actions"]}
        rows={screens}
        renderRow={(screen) => (
          <tr key={screen.id}>
            <td className="cell-title">{screen.name}</td>
            <td>{screen.total_capacity} seats</td>
            <td>#{screen.id}</td>
            <td>{screen.is_archived ? "Archived" : "Active"}</td>
            <td>
              <div className="table-actions">
                {!screen.is_archived && (
                  <>
                    <button
                      className="icon-button"
                      aria-label={`Configure seat categories for ${screen.name}`}
                      title="Seat categories and surcharges"
                      onClick={() => setPricingScreen(screen)}
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${screen.name}`}
                      onClick={() => setEditing(screen)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="icon-button danger-icon"
                      aria-label={`Archive ${screen.name}`}
                      title="Archive screen"
                      disabled={actioningScreenId === screen.id}
                      aria-busy={actioningScreenId === screen.id}
                      onClick={() => archive(screen)}
                    >
                      <Archive size={16} />
                    </button>
                  </>
                )}
                {screen.is_archived && (
                  <button
                    className="icon-button"
                    aria-label={`Restore ${screen.name}`}
                    title="Restore screen"
                    disabled={actioningScreenId === screen.id}
                    aria-busy={actioningScreenId === screen.id}
                    onClick={() => restore(screen)}
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )}
      />
      <Modal
        open={Boolean(editing)}
        title={editing?.id ? "Edit screen name" : "Create a screen"}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <ScreenForm
            initial={editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(pricingScreen)}
        title={`Seat categories · ${pricingScreen?.name || ""}`}
        onClose={() => setPricingScreen(null)}
      >
        {pricingScreen && (
          <SeatCategoryPricingForm
            screen={pricingScreen}
            onCancel={() => setPricingScreen(null)}
          />
        )}
      </Modal>
    </section>
  );
}
