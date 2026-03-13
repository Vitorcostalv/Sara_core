import type { PaginationMeta } from "@sara/shared-types";
import { Button } from "./Button";

interface PaginationControlsProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ meta, onPageChange }: PaginationControlsProps) {
  return (
    <div className="ui-pagination">
      <span className="ui-pagination__summary">
        Page {meta.page} of {meta.totalPages} • {meta.total} items
      </span>
      <div className="ui-pagination__actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPreviousPage}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
