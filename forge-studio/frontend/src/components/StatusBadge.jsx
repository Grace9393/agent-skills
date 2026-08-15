import { statusMeta } from "../lib/util";

export default function StatusBadge({ status }) {
  const s = statusMeta(status);
  return (
    <span
      className="inline-flex flex-none items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[11px] font-bold"
      style={{ color: s.color, background: s.color + "22" }}
    >
      <span className="h-[7px] w-[7px] rounded-full bg-current" />
      {s.label}
    </span>
  );
}
