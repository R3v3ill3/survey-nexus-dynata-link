
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Info } from "lucide-react";
import { SegmentTracking, QuotaSegment } from "@/types/database";

interface QuotaSegmentsTableProps {
  quotaSegments: QuotaSegment[];
  segmentTracking: SegmentTracking[];
}

const QuotaSegmentsTable = ({ quotaSegments, segmentTracking }: QuotaSegmentsTableProps) => {
  // Create a map of segment tracking data for quick lookup
  const trackingMap = new Map(segmentTracking.map(t => [t.segment_id, t]));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quota Segments Performance</CardTitle>
        <CardDescription>Real-time tracking of demographic segment performance</CardDescription>
      </CardHeader>
      <CardContent>
        {quotaSegments.length > 0 ? (
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
              {quotaSegments.map((segment) => {
                const tracking = trackingMap.get(segment.id);
                return (
                  <TableRow key={segment.id}>
                    <TableCell>
                      <div className="font-medium">
                        {segment.segment_name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {segment.segment_code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {segment.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {segment.population_percent?.toFixed(1) || '0.0'}%
                    </TableCell>
                    <TableCell>
                      {tracking?.current_count || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(tracking?.completion_rate || 0) * 100} 
                          className="w-20 h-2" 
                        />
                        <span className="text-sm">
                          {((tracking?.completion_rate || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      A${(tracking?.cost_tracking || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <div className="space-y-2">
              <p className="text-slate-600 font-medium">No quota segments configured</p>
              <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                <Info className="h-4 w-4" />
                <p>Create a quota configuration to define demographic segments for this project</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuotaSegmentsTable;
