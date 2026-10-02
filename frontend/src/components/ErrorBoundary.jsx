import { Component } from "react";

/**
 * ErrorBoundary — the last line of defence against a white screen.
 *
 * The original app had no error boundary anywhere. Combined with a missing
 * `Navigate` import in App.jsx, any render-time throw produced a permanently
 * blank page with no recovery except a manual refresh — on the checkout page,
 * that is a lost sale.
 *
 * Two are mounted: one around the whole app (catches provider failures) and one
 * around the routed page (so a single bad page doesn't take the Header, search
 * box and Footer with it — a shopper can still navigate away or reload).
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // In production this is where a Sentry-style reporter would be called.
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  reset() {
    this.setState({ error: null, info: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isRoute = Boolean(this.props.resetKeys && this.props.resetKeys.length);

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-[60vh] flex items-center justify-center px-4 py-12 bg-stone-50"
      >
        <div className="max-w-md w-full text-center">
          <div
            aria-hidden="true"
            className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-3xl mb-5"
          >
            !
          </div>

          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            Something went wrong
          </h1>

          <p className="text-stone-600 mb-6">
            This part of the page didn't load properly. Your cart is safe — nothing
            has been lost.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isRoute && (
              <button
                type="button"
                onClick={this.reset}
                className="px-6 py-3 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 min-h-[48px]"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 font-semibold hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-300 min-h-[48px]"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="px-6 py-3 rounded-xl text-teal-800 font-semibold hover:bg-teal-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 min-h-[48px]"
            >
              Back to home
            </button>
          </div>

          {import.meta.env.DEV && error?.message && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm text-stone-500 hover:text-stone-700">
                Developer details
              </summary>
              <pre className="mt-3 p-3 bg-stone-100 rounded-lg text-xs overflow-auto text-stone-700 whitespace-pre-wrap">
                {error.message}
                {this.state.info?.componentStack || ""}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;