import { Component } from "react";
import {
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useLocation } from "react-router";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error("React error boundary caught an error:", error, info);
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.error &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({
        error: null,
      });
    }
  }

  handleRetry = () => {
    this.setState({
      error: null,
    });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <section className="app-error-boundary" role="alert">
        <div className="app-error-card">
          <AlertCircle size={34} />
          <h1>Something went wrong</h1>
          <p>
            This part of DocuMind failed to render. Retry the view or
            navigate away to continue working.
          </p>
          <button
            className="secondary-action"
            type="button"
            onClick={this.handleRetry}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </section>
    );
  }
}

function RouteErrorBoundary({ children }) {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      {children}
    </ErrorBoundary>
  );
}

export default RouteErrorBoundary;
