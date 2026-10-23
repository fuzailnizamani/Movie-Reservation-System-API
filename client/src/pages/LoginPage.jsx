import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Clapperboard } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { errorMessage } from "../api/axiosClient";
import Button from "../components/ui/Button";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const submit = async (values) => {
    try {
      await signIn(values);
      toast.success("Welcome back");
      navigate(location.state?.from?.pathname || "/movies", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-art">
        <div className="auth-art-copy">
          <span className="brand-mark">
            <Clapperboard size={20} />
          </span>
          <span className="eyebrow">THE NIGHT IS YOURS</span>
          <h1>
            Meet me
            <br />
            at the movies.
          </h1>
          <p>Big stories. Better seats. Your kind of night.</p>
        </div>
        <span className="auth-photo-credit">
          REELHOUSE · EST. FOR STORY LOVERS
        </span>
      </div>

      <div className="auth-form-side">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to home
        </Link>

        <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
          <span className="eyebrow">MEMBER ACCESS</span>
          <h2>
            Welcome back<span className="brand-dot">.</span>
          </h2>
          <p className="muted">Sign in to find your next favorite.</p>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <small className="field-error">{errors.email.message}</small>
            )}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              {...register("password")}
            />
            {errors.password && (
              <small className="field-error">{errors.password.message}</small>
            )}
          </label>

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="full-width"
          >
            Sign in <span aria-hidden="true">→</span>
          </Button>

          <p className="auth-switch">
            New to Reelhouse? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
