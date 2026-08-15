import { useCallback } from "react";

// Textarea that grows with its content up to maxHeight, submits on Enter
// (Shift+Enter for a newline).
export default function AutoGrowTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  maxHeight = 160,
  className = "",
}) {
  const grow = useCallback(
    (el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(maxHeight, el.scrollHeight) + "px";
    },
    [maxHeight]
  );

  return (
    <textarea
      rows={1}
      value={value}
      placeholder={placeholder}
      className={className}
      style={{ maxHeight }}
      onChange={(e) => {
        grow(e.target);
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
    />
  );
}
