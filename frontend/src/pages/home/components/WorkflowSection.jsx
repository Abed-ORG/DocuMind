import { workflowSteps } from "../homeData";
import useInView from "../hooks/useInView";
import RobotPet from "../../workspaces/components/dashboard/RobotPet";

function WorkflowSection() {
  const [sectionRef, isInView] = useInView();

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="landing-section workflow-section"
    >
      <div className="workflow-background" aria-hidden="true">
        <span className="workflow-document workflow-document-1" />
        <span className="workflow-document workflow-document-2" />
      </div>

      <div
        className={[
          "section-robot-stage",
          "workflow-robot-stage",
          isInView ? "has-teleported" : "",
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
          <p className="landing-eyebrow">How It Works</p>
          <h2>From upload to insight in three steps</h2>
          <p>
            A compact flow for creating a workspace, processing files,
            and using AI with citations.
          </p>
        </div>

        <div className="workflow-grid">
          {workflowSteps.map(({ step, title, description }) => (
            <article className="workflow-card" key={step}>
              <span className="workflow-step">{step}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WorkflowSection;
