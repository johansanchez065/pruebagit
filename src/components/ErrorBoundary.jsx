import { Component } from 'react';

// Catches render-time errors anywhere below it. The most likely real-world
// trigger in this PWA: a tab that's been open since before a deploy tries to
// lazy-load a route chunk (e.g. NewJobPage) whose hashed filename no longer
// exists on the server because the new build replaced it — that 404 throws
// inside React's lazy/Suspense machinery and, with nothing catching it,
// unmounts the entire app to a blank screen with no way back but guessing to
// reload. This shows a button that does that reload instead.
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen">
          <div className="card center-text">
            <p>{this.props.message}</p>
            <button type="button" className="big-btn big-btn--primary" onClick={() => window.location.reload()}>
              {this.props.reloadLabel}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
