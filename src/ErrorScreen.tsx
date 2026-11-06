import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** A render failure shows a readable message instead of a blank window. */
export class ErrorScreen extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Cauldron failed to draw:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="crash">
          <h1>Cauldron hit a problem</h1>
          <p>{this.state.error.message}</p>
          <p className="crash-hint">
            Reload with ⌘R. If it happens again, the details are in the console.
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}
