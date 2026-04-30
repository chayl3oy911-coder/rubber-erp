import { toggleFarmerActiveAction } from "@/modules/farmer/actions";
import { farmerT } from "@/modules/farmer/i18n";

const t = farmerT();

type Props = {
  farmerId: string;
  isActive: boolean;
  compact?: boolean;
};

export function ToggleActiveForm({ farmerId, isActive, compact = false }: Props) {
  const action = toggleFarmerActiveAction.bind(null, farmerId, !isActive);

  const sizeCls = compact ? "h-8 px-3 text-xs" : "h-9 px-3 text-sm";
  const colorCls = isActive
    ? "border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-500/10"
    : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-zinc-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10";

  return (
    <form action={action}>
      <button
        type="submit"
        className={`inline-flex items-center justify-center rounded-lg border font-medium transition-colors ${sizeCls} ${colorCls}`}
      >
        {isActive ? t.actions.deactivate : t.actions.activate}
      </button>
    </form>
  );
}
