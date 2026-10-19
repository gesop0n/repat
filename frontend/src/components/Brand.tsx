import { cn } from "@/lib/utils";

// サービス名のロゴ。末尾のドットだけ primary の色にする
export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block font-brand leading-none font-[750] tracking-[-0.065em]",
        className,
      )}
    >
      repat<span className="text-primary">.</span>
    </span>
  );
}
