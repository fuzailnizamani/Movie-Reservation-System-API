import { useEffect, useRef, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Link, useParams } from "react-router-dom";
import { LockKeyhole, ArrowLeft, CircleAlert } from "lucide-react";
import toast from "react-hot-toast";
import { createPaymentIntent, getReservation } from "../api/reservationsApi";
import { errorMessage } from "../api/axiosClient";
import CountdownTimer from "../components/reservations/CountdownTimer";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import { formatShowtime } from "../utils/showtimeDateTime";

const publishableKey = (
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
).trim();
const publishableMode = publishableKey.startsWith("pk_live_")
  ? "live"
  : publishableKey.startsWith("pk_test_")
    ? "test"
    : null;
const stripePromise = publishableMode ? loadStripe(publishableKey) : null;

const formatPrice = (amount, currency = "usd") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

const appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#e50914",
    colorBackground: "#1c1c28",
    colorText: "#f5f5f7",
    colorDanger: "#ef4444",
    borderRadius: "8px",
    fontFamily: "Inter, sans-serif",
  },
};

function PaymentForm({
  reservationId,
  amount,
  currency,
  expired,
  onElementError,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [elementReady, setElementReady] = useState(false);
  const [elementLoadError, setElementLoadError] = useState(false);
  const submittingRef = useRef(false);

  const handleLoadError = () => {
    setElementReady(false);
    setElementLoadError(true);
    setMessage(
      "The payment form could not load. Verify the publishable key matches the backend Stripe account and mode.",
    );
    onElementError();
  };

  const pay = async (event) => {
    event.preventDefault();
    if (
      !stripe ||
      !elements ||
      !elementReady ||
      elementLoadError ||
      expired ||
      submittingRef.current
    ) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setMessage("");

    const returnUrl = `${window.location.origin}/payment/success?reservation_id=${reservationId}`;
    let redirecting = false;

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (result.error) {
        setMessage(result.error.message || "Payment could not be confirmed.");
      } else if (
        ["succeeded", "processing"].includes(result.paymentIntent?.status)
      ) {
        redirecting = true;
        window.location.assign(returnUrl);
      } else {
        setMessage("Stripe did not return a completed payment status.");
      }
    } catch (error) {
      setMessage(error.message || "Payment could not be confirmed.");
    } finally {
      if (!redirecting) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={pay} className="payment-form">
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setElementReady(true)}
        onLoadError={handleLoadError}
      />

      {message && (
        <p className="notice notice-danger">
          <CircleAlert size={17} /> {message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={submitting}
        disabled={
          !stripe ||
          !elements ||
          !elementReady ||
          elementLoadError ||
          expired ||
          submitting
        }
        className="full-width"
      >
        Pay {formatPrice(amount || 0, currency)}
      </Button>

      <p className="secure-note">
        <LockKeyhole size={14} /> Secure payment powered by Stripe
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const { reservationId } = useParams();
  const [reservation, setReservation] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    (async () => {
      try {
        const item = await getReservation(reservationId);
        setReservation(item);

        if (item.status !== "pending_payment") {
          setCheckoutError("This reservation is no longer awaiting payment.");
          return;
        }

        if (!stripePromise) {
          setCheckoutError(
            "Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in client/.env and restart Vite.",
          );
          return;
        }

        const stripe = await stripePromise;

        if (!stripe) {
          throw new Error(
            "Stripe.js could not initialize. Verify the publishable key in client/.env.",
          );
        }

        const intent = await createPaymentIntent(reservationId);

        if (
          !intent ||
          typeof intent.clientSecret !== "string" ||
          !intent.paymentIntentId ||
          !intent.clientSecret.startsWith(
            `${intent.paymentIntentId}_secret_`,
          ) ||
          Number(intent.reservationId) !== Number(reservationId)
        ) {
          throw new Error("The payment service returned an invalid response.");
        }

        if (typeof intent.livemode !== "boolean") {
          throw new Error(
            "The payment service did not identify its Stripe mode.",
          );
        }

        if (intent.livemode !== (publishableMode === "live")) {
          throw new Error(
            "The frontend and backend Stripe keys use different modes. Use matching test keys or matching live keys.",
          );
        }

        setClientSecret(intent.clientSecret);
      } catch (error) {
        setCheckoutError(errorMessage(error));
        toast.error(errorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId]);

  if (loading) return <Loader label="Preparing secure checkout…" />;

  if (!reservation)
    return (
      <section className="container section">
        <EmptyState
          title="Reservation not found"
          detail="This checkout could not be loaded."
        />
      </section>
    );

  return (
    <section className="container section page-enter">
      <Link className="back-link" to="/reservations">
        <ArrowLeft size={16} /> My reservations
      </Link>

      <div className="checkout-heading">
        <span className="eyebrow">FINAL STEP</span>
        <h1>
          Make it a movie night<span className="brand-dot">.</span>
        </h1>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="checkout-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">RESERVATION #{reservation.id}</span>
                <h2>{reservation.movie_name || "Your movie reservation"}</h2>
              </div>
              <span className="checkout-hold">
                Hold expires in{" "}
                <CountdownTimer
                  createdAt={reservation.created_at}
                  onExpire={() => setExpired(true)}
                />
              </span>
            </div>

            <p className="checkout-details">
              {reservation.start_time
                ? formatShowtime(reservation.start_time)
                : "Showtime details"}{" "}
              {reservation.end_time
                ? `– ${formatShowtime(reservation.end_time, {
                    timeStyle: "short",
                  })}`
                : ""}
            </p>

            <div className="checkout-seats">
              {(reservation.seats || []).filter(Boolean).map((seat) => (
                <span key={seat}>{seat}</span>
              ))}
            </div>
            <div className="checkout-price-list">
              {(reservation.seat_details || []).map((seat) => (
                <div key={seat.label}>
                  <span>
                    {seat.label} ·{" "}
                    {(seat.category || "standard").replace(/_/g, " ")}
                  </span>
                  <strong>
                    {formatPrice(seat.priceCents, reservation.currency)}
                  </strong>
                </div>
              ))}
              <div className="checkout-total">
                <span>Total</span>
                <strong>
                  {formatPrice(reservation.amount || 0, reservation.currency)}
                </strong>
              </div>
            </div>
          </div>

          {expired ? (
            <div className="notice notice-danger">
              <CircleAlert size={18} />
              <div>
                <strong>Your seat hold expired.</strong>
                <p>Start over and choose available seats again.</p>
                <Link to="/showtimes" className="text-link">
                  Browse showtimes
                </Link>
              </div>
            </div>
          ) : checkoutError ? (
            <div className="notice notice-danger">
              <CircleAlert size={18} />
              <div>
                <strong>{checkoutError || "Payment is unavailable."}</strong>
                <p>
                  <Link to="/reservations" className="text-link">
                    Return to reservations
                  </Link>
                </p>
              </div>
            </div>
          ) : clientSecret && stripePromise ? (
            <div className="checkout-panel">
              <h2>Payment details</h2>
              <p className="muted">
                Your payment information is processed securely by Stripe.
              </p>
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance }}
              >
                <PaymentForm
                  reservationId={reservationId}
                  amount={reservation.amount}
                  currency={reservation.currency}
                  expired={expired}
                  onElementError={() => {
                    setCheckoutError(
                      "Stripe could not initialize this PaymentIntent. Verify the publishable key and backend secret key belong to the same Stripe account and mode.",
                    );
                  }}
                />
              </Elements>
            </div>
          ) : (
            <div className="notice notice-danger">
              <CircleAlert size={18} /> Payment form is initializing…
            </div>
          )}
        </div>

        <aside className="checkout-summary">
          <span className="eyebrow">ORDER SUMMARY</span>

          <div className="summary-line">
            <span>Reservation</span>
            <span>#{reservation.id}</span>
          </div>

          <div className="summary-line">
            <span>Seats selected</span>
            <span>{(reservation.seats || []).filter(Boolean).length}</span>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>
              {formatPrice(reservation.amount || 0, reservation.currency)}
            </strong>
          </div>

          <p className="demo-note">
            Seat prices are confirmed by the server and saved with this
            reservation. Cancellation does not automatically issue a refund.
          </p>
        </aside>
      </div>
    </section>
  );
}
