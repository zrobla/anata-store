type LoadingSpinnerProps = {
  className?: string;
  size?: "sm" | "md";
};

export function LoadingSpinner({ className = "", size = "sm" }: LoadingSpinnerProps) {
  const sizeClass = size === "md" ? "h-4 w-4 border-2" : "h-3.5 w-3.5 border-2";
  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-block animate-spin rounded-full border-current border-r-transparent ${className}`.trim()}
    />
  );
}
