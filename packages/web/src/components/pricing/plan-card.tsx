import { Check, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanDefinition } from "@/lib/pricing";

interface PlanCardProps {
  readonly plan: PlanDefinition;
  readonly currentPlan: string | null;
  readonly action: React.ReactNode;
}

/** 料金プランカード */
export function PlanCard({ plan, currentPlan, action }: PlanCardProps) {
  const isCurrent = currentPlan === plan.id;

  return (
    <Card
      className={cn(
        "flex flex-col",
        plan.highlighted && "border-primary shadow-md",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          {plan.highlighted && <Badge className="bg-warm-coral text-white border-transparent">おすすめ</Badge>}
          {isCurrent && <Badge variant="outline">利用中</Badge>}
        </div>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-2">
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-sm text-muted-foreground">
            {plan.priceNote}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature.text} className="flex items-center gap-2 text-sm">
              {feature.included ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : (
                <X className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(!feature.included && "text-muted-foreground")}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>{action}</CardFooter>
    </Card>
  );
}
