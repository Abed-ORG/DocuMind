import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ArrowUp } from "lucide-react";
import FeatureGrid from "./components/FeatureGrid";
import HeroSection from "./components/HeroSection";
import LandingFooter from "./components/LandingFooter";
import WorkflowSection from "./components/WorkflowSection";
import "../HomePage.css";

function HomePage() {
  const { isAuthenticated } = useAuth();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateBackToTop = () => {
      setShowBackToTop(window.scrollY > 280);
    };

    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });

    return () => window.removeEventListener("scroll", updateBackToTop);
  }, []);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      <HeroSection isAuthenticated={isAuthenticated} />

      <main>
        <FeatureGrid />
        <WorkflowSection />
      </main>

      <LandingFooter />

      <button
        className={`back-to-top-button ${showBackToTop ? "is-visible" : ""}`}
        type="button"
        aria-label="Back to top"
        onClick={handleBackToTop}
      >
        <ArrowUp size={26} strokeWidth={3} />
      </button>
    </div>
  );
}

export default HomePage;
