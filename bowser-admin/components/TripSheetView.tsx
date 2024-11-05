// FuelRecordCard.tsx
import { Card } from './ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './ui/button';
import { Edit, Trash, Eye } from 'lucide-react';
import { TripSheet } from '@/types';
import Loading from '@/app/loading';

interface FuelRecordCardProps {
  record?: TripSheet;
}

const FuelRecordCard: React.FC<FuelRecordCardProps> = ({ record }) => {
  if (!record) {
    return <Loading />;
  }

  return (
    <Card className="p-4 shadow-lg">
      <Table className="min-w-full border">
        <TableCaption className="text-2xl font-bold mb-4">Trip Sheets</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-2 border">Trip Sheet ID</TableHead>
            <TableHead className="px-4 py-2 border">Generation Date</TableHead>
            <TableHead className="px-4 py-2 border">Bowser Reg No</TableHead>
            <TableHead className="px-4 py-2 border">Odometer Start</TableHead>
            <TableHead className="px-4 py-2 border">Destination</TableHead>
            <TableHead className="px-4 py-2 border">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="border-b">
            <TableCell className="px-4 py-2">{record.tripSheetId}</TableCell>
            <TableCell className="px-4 py-2">{record.tripSheetGenerationDateTime}</TableCell>
            <TableCell className="px-4 py-2">{record.bowser?.regNo}</TableCell>
            <TableCell className="px-4 py-2">{record.bowserOdometerStartReading ?? 'N/A'}</TableCell>
            <TableCell className="px-4 py-2">{record.fuelingAreaDestination ?? 'N/A'}</TableCell>
            <TableCell className="px-4 py-2 flex space-x-2">
              <Button variant="secondary" className="p-1">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="default" className="p-1">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="destructive" className="p-1">
                <Trash className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
};

export default FuelRecordCard;