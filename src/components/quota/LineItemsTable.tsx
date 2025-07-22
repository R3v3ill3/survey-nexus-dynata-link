
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { LineItem } from "@/types/database";

interface LineItemsTableProps {
  lineItems: LineItem[];
  loading: boolean;
  onCreateClick: () => void;
  tierInfo?: any;
  projectId?: string;
}

const LineItemsTable = ({ lineItems, loading, onCreateClick, tierInfo, projectId }: LineItemsTableProps) => {
  const getStatusColor = (status: LineItem["status"]) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "overquota": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: LineItem["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "overquota": return <AlertTriangle className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const calculateProgress = (completed: number, quota: number) => {
    return Math.min((completed / quota) * 100, 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              Australian Line Item Management
            </CardTitle>
            <CardDescription>
              Define targeting criteria and monitor quota fulfillment across all channels
            </CardDescription>
          </div>
          <LineItemCreateButton 
            onCreateClick={onCreateClick}
            tierInfo={tierInfo}
            currentCount={lineItems.length}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading && lineItems.length === 0 ? (
          <div className="text-center py-8">Loading line items...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Item</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Targeting</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Cost per Complete (AUD)</TableHead>
                <TableHead>Total Cost (AUD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{item.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.channel_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-600">
                      <div>{item.targeting.country || 'AU'} • {item.targeting.gender}</div>
                      <div>Age: {item.targeting.ageRange?.[0] || 18}-{item.targeting.ageRange?.[1] || 65}</div>
                      {item.targeting.income && <div>Income: {item.targeting.income}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1">{item.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.completed} / {item.quota}</span>
                        <span>{calculateProgress(item.completed, item.quota).toFixed(0)}%</span>
                      </div>
                      <Progress value={calculateProgress(item.completed, item.quota)} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">A${(item.cost_per_complete || 0).toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">A${(item.completed * (item.cost_per_complete || 0)).toFixed(2)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// Line Item Create Button Component
interface LineItemCreateButtonProps {
  onCreateClick: () => void;
  tierInfo?: any;
  currentCount: number;
}

const LineItemCreateButton = ({ onCreateClick, tierInfo, currentCount }: LineItemCreateButtonProps) => {
  if (!tierInfo) {
    return (
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Create Line Item
      </Button>
    );
  }

  const maxLineItems = tierInfo.max_line_items_per_project;
  const hasReachedLimit = maxLineItems !== -1 && currentCount >= maxLineItems;

  if (hasReachedLimit) {
    return (
      <div className="text-center">
        <div className="text-sm text-muted-foreground mb-2">
          Line item limit reached ({currentCount}/{maxLineItems})
        </div>
        <Button disabled variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Line Item
        </Button>
      </div>
    );
  }

  return (
    <div>
      {maxLineItems !== -1 && (
        <div className="text-sm text-muted-foreground mb-2">
          Line items: {currentCount}/{maxLineItems}
        </div>
      )}
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Create Line Item
      </Button>
    </div>
  );
};

export default LineItemsTable;
