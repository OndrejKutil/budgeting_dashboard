import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowLeft, SearchX, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card max-w-2xl w-full p-8 text-center relative z-10 flex flex-col items-center shadow-card border-gradient"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6 p-4 rounded-full bg-muted/50 border border-border/50 relative"
        >
          <SearchX className="h-16 w-16 text-primary" />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -bottom-2 -right-2 bg-destructive text-destructive-foreground p-1.5 rounded-full border-2 border-background"
          >
            <Wallet className="h-5 w-5" />
          </motion.div>
        </motion.div>

        <h1 className="mb-2 text-6xl font-black tracking-tight text-gradient-blurple drop-shadow-sm">
          404
        </h1>

        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Budget Not Found
        </h2>

        <p className="mb-8 text-muted-foreground text-lg leading-relaxed">
          We couldn't find the page you're looking for. <br />
          <span className="italic text-primary/80">"It must have been cut from this month's budget."</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild variant="default" className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
            <Link to="/">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2 bg-background/50 hover:bg-background/80">
            <Link to=".." onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}>
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </motion.div>

      <footer className="absolute bottom-8 text-sm text-muted-foreground/60">
        Error: 404_INSUFFICIENT_FUNDS
      </footer>
    </div>
  );
};

export default NotFound;
