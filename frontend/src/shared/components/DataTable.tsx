import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
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
  getRowSx?: (row: T) => SxProps<Theme> | undefined;
};

export const DataTable = <T,>({ columns, rows, getRowId, getRowSx }: DataTableProps<T>) => (
  <TableContainer
    component={Paper}
    elevation={0}
    sx={{
      border: 1,
      borderColor: 'divider',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(24, 36, 51, 0.04)',
    }}
  >
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell key={column.id}>
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
            sx={{
              transition: 'background-color 160ms ease',
              '&:last-child td': { borderBottom: 0 },
              ...getRowSx?.(row),
            }}
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
