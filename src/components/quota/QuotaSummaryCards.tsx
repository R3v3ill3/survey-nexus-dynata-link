
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineItem } from "@/types/database";

interface QuotaSummaryCardsProps {
  lineItems: LineItem[];
  quotaSegmentsCount: number;
}

const QuotaSummaryCards = ({ lineItems, quotaSegmentsCount }: QuotaSummaryCardsProps) => {
  const totalQuota = lineItems.reduce((sum, item) => sum + item.quota, 0);
  const totalCompleted = lineItems.reduce((sum, item) => sum + item.completed, 0);
  const totalCost = lineItems.reduce((sum, item) => sum + (item.completed * (item.cost_per_complete || 0)), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">Total Quota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900">{totalQuota.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">Target responses</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{totalCompleted.toLocaleString()}</div>
          <Progress value={totalQuota > 0 ? (totalCompleted / totalQuota) * 100 : 0} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">Total Cost (AUD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">A${totalCost.toFixed(2)}</div>
          <div className="text-sm text-slate-500 mt-1">Current spend</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">Quota Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">{quotaSegmentsCount}</div>
          <div className="text-sm text-slate-500 mt-1">Active segments</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotaSummaryCards;
