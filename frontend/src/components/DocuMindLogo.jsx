import documindLogo from "../assets/documind-logo.png";

function DocuMindLogo({ className = "" }) {
  return (
    <img
      className={className}
      src={documindLogo}
      alt="DocuMind"
    />
  );
}

export default DocuMindLogo;
