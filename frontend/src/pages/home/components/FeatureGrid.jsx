import { features } from "../homeData";
import useInView from "../hooks/useInView";
import RobotPet from "../../workspaces/components/dashboard/RobotPet";

function FeatureGrid() {
  const [sectionRef, isInView] = useInView();

  return (
    <section
      ref={sectionRef}
      id="features"
      className="landing-section"
    >
      <div
        className={[
          "section-robot-stage",
          "features-robot-stage",
          isInView ? "has-dived" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        <RobotPet
          canSleep={false}
          className="section-robot-pet"
          trackCursor={false}
        />
      </div>

      <div className="landing-container">
        <div className="section-heading">
          <p className="landing-eyebrow">Features</p>
          <h2>Designed for evidence-heavy work</h2>
          <p>
            Every surface keeps documents, answers, and citations close
            together so review work stays traceable.
          </p>
        </div>

        <div className="features-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureGrid;
