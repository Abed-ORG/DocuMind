import { useAuth } from "../../context/AuthContext";
import FeatureGrid from "./components/FeatureGrid";
import HeroSection from "./components/HeroSection";
import LandingFooter from "./components/LandingFooter";
import WorkflowSection from "./components/WorkflowSection";
import "../HomePage.css";

function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-page">
      <HeroSection isAuthenticated={isAuthenticated} />

      <main>
        <FeatureGrid />
        <WorkflowSection />
      </main>

      <LandingFooter />
    </div>
  );
}

export default HomePage;
