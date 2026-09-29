import { CATEGORY_STYLES, Category } from "@/lib/types";

export function CategoryBadge({ category }: { category: Category }) {
  const s = CATEGORY_STYLES[category];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.badge}`}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
      {category}
    </span>
  );
}
