import { workflowSteps } from "../homeData";

function WorkflowSection() {
  return (
    <section className="landing-section workflow-section">
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
