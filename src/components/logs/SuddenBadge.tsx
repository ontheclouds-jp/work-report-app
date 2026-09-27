/** 突発業務の日報であることを示すバッジ。 */
export function SuddenBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-orange-500/60 bg-orange-950/50 px-2 py-0.5 text-xs font-semibold text-orange-300 ${className}`}
    >
      ⚡突発
    </span>
  );
}
