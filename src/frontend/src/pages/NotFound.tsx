import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 lg:px-16 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center py-16">
        {/* Left: Big 404 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col"
        >
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-6 block">
            Error 404
          </span>
          <h1 className="font-display font-black text-[clamp(7rem,20vw,14rem)] leading-none tracking-tighter text-foreground select-none">
            404
          </h1>
          <div className="mt-6 h-px bg-border/50 w-full" />
          <p className="mt-4 font-mono text-xs text-muted-foreground/50 tracking-widest uppercase">
            404_INSUFFICIENT_FUNDS
          </p>
        </motion.div>

        {/* Right: Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col"
        >
          <h2 className="text-3xl font-display font-bold tracking-tight text-foreground mb-3">
            Budget Not Found
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-3">
            We couldn't find the page you're looking for.
          </p>
          <p className="text-base text-primary/70 italic font-serif mb-10">
            "It must have been cut from this month's budget."
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Return Home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to=".." onClick={(e) => { e.preventDefault(); window.history.back(); }}>
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;

