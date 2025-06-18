
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import { SegmentTracking } from "@/types/database";

interface QuotaSegmentsTableProps {
  segmentTracking: SegmentTracking[];
}

const QuotaSegmentsTable = ({ segmentTracking }: QuotaSegmentsTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quota Segments Performance</CardTitle>
        <CardDescription>Real-time tracking of demographic segment performance</CardDescription>
      </CardHeader>
      <CardContent>
        {segmentTracking.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Target %</TableHead>
                <TableHead>Current Count</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Cost (AUD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segmentTracking.map((tracking) => (
                <TableRow key={tracking.id}>
                  <TableCell>
                    <div className="font-medium">
                      {tracking.segment?.segment_name || 'Unknown Segment'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {tracking.segment?.segment_code || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tracking.segment?.category || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tracking.segment?.population_percent?.toFixed(1) || '0.0'}%
                  </TableCell>
                  <TableCell>
                    {tracking.current_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={tracking.completion_rate * 100} 
                        className="w-20 h-2" 
                      />
                      <span className="text-sm">
                        {(tracking.completion_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    A${tracking.cost_tracking.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600">No segment tracking data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuotaSegmentsTable;
