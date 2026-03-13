import type { ReactNode } from "react";

export interface DataColumn<TItem> {
  key: string;
  header: string;
  render: (item: TItem) => ReactNode;
  className?: string;
}

interface DataTableProps<TItem> {
  columns: DataColumn<TItem>[];
  data: TItem[];
  rowKey: (item: TItem) => string;
}

export function DataTable<TItem>({ columns, data, rowKey }: DataTableProps<TItem>) {
  return (
    <div className="ui-data-table__wrapper">
      <table className="ui-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={rowKey(item)}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
