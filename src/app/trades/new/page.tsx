import { TradeEntryForm } from "@/components/trade/TradeEntryForm";
import { PageTransition } from "@/components/motion/PageTransition";
import { PageHeader } from "@/components/ui/FormSection";

export default function NewTradePage() {
  return (
    <PageTransition className="space-y-10">
      <PageHeader
        title="New Trade"
        description="Enter the essentials — everything else is calculated automatically in real time."
      />
      <TradeEntryForm />
    </PageTransition>
  );
}
