import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

export class TextErrorBoundary extends Component<Props> {
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("=== TEXT NODE ERROR ===");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Component Stack:", info.componentStack);
  }

  render() {
    return this.props.children;
  }
}
