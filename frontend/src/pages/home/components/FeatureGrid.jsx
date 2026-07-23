import { features } from "../homeData";

function FeatureGrid() {
  return (
    <section id="features" className="landing-section">
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
