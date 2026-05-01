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
        Pagina {meta.page} de {meta.totalPages} • {meta.total} itens
      </span>
      <div className="ui-pagination__actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPreviousPage}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNextPage}
        >
          Proxima
        </Button>
      </div>
    </div>
  );
}
