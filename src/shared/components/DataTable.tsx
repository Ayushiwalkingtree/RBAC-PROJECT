import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { ReactNode } from 'react';

type Column<T> = {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
};

export const DataTable = <T,>({ columns, rows, getRowId }: DataTableProps<T>) => (
  <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell key={column.id} sx={{ fontWeight: 800 }}>
              {column.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={getRowId(row)}
            hover
            sx={{ transition: 'background-color 160ms ease, transform 160ms ease' }}
          >
            {columns.map((column) => (
              <TableCell key={column.id}>{column.render(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);
