import { useCallback, useEffect, useState } from "react";
import { Database, Star, Trash } from "@phosphor-icons/react";
import type { Fact, PaginationMeta } from "@sara/shared-types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingBlock,
  PageHeader,
  PaginationControls,
  Section,
  Select,
  TextArea
} from "../components/ui";
import { factsApi, getApiErrorMessage } from "../services/api/client";
import { formatDateTime } from "../utils/format";

const initialMeta: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

interface FactsForm {
  key: string;
  value: string;
  category: string;
  isImportant: boolean;
}

interface FactsFilters {
  category: string;
  isImportant: "" | "true" | "false";
}

const initialForm: FactsForm = {
  key: "",
  value: "",
  category: "general",
  isImportant: false
};

export function FactsPage() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FactsForm>(initialForm);
  const [filters, setFilters] = useState<FactsFilters>({ category: "", isImportant: "" });

  const loadFacts = useCallback(
    async (page = meta.page) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await factsApi.list({
          page,
          pageSize: meta.pageSize,
          category: filters.category || undefined,
          isImportant:
            filters.isImportant === "" ? undefined : filters.isImportant === "true"
        });

        setFacts(response.data);
        setMeta(response.meta);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [filters.category, filters.isImportant, meta.page, meta.pageSize]
  );

  useEffect(() => {
    void loadFacts(1);
  }, [loadFacts]);

  const onCreateFact = async () => {
    if (!form.key.trim() || !form.value.trim()) {
      setErrorMessage("Fact key and value are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await factsApi.create({
        key: form.key.trim(),
        value: form.value.trim(),
        category: form.category.trim() || "general",
        isImportant: form.isImportant
      });

      setForm(initialForm);
      setSuccessMessage("Fact saved.");
      await loadFacts(1);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onToggleImportant = async (fact: Fact) => {
    try {
      await factsApi.markImportant(fact.id, { isImportant: !fact.isImportant });
      await loadFacts(meta.page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const onDeleteFact = async (id: string) => {
    try {
      await factsApi.remove(id);
      await loadFacts(meta.page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const columns = [
    {
      key: "key",
      header: "Key / Value",
      render: (fact: Fact) => (
        <div>
          <strong>{fact.key}</strong>
          <div className="ui-input-field__hint">{fact.value}</div>
        </div>
      )
    },
    {
      key: "category",
      header: "Category",
      render: (fact: Fact) => <Badge tone="info">{fact.category}</Badge>
    },
    {
      key: "important",
      header: "Important",
      render: (fact: Fact) => (
        <Badge tone={fact.isImportant ? "warning" : "neutral"}>
          {fact.isImportant ? "important" : "normal"}
        </Badge>
      )
    },
    {
      key: "updated",
      header: "Updated",
      render: (fact: Fact) => <span>{formatDateTime(fact.updatedAt)}</span>
    },
    {
      key: "actions",
      header: "Actions",
      render: (fact: Fact) => (
        <div className="inline-actions">
          <Button variant="secondary" size="sm" onClick={() => void onToggleImportant(fact)}>
            <Star weight="duotone" />
            {fact.isImportant ? "Unmark" : "Mark"}
          </Button>
          <Button variant="danger" size="sm" onClick={() => void onDeleteFact(fact.id)}>
            <Trash weight="duotone" />
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Facts"
        description="Persistent memory entries connected to backend facts contracts."
        icon={<Database weight="duotone" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>New Fact</CardTitle>
        </CardHeader>
        <CardContent className="stack-sm">
          <div className="form-grid">
            <Input
              label="Key"
              value={form.key}
              onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
              placeholder="favorite_food"
            />
            <Input
              label="Category"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="preferences"
            />
            <Select
              label="Important"
              value={String(form.isImportant)}
              onChange={(event) =>
                setForm((current) => ({ ...current, isImportant: event.target.value === "true" }))
              }
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
          </div>
          <TextArea
            label="Value"
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            placeholder="Sushi and ramen"
          />
          <div className="form-actions">
            <Button variant="primary" onClick={() => void onCreateFact()} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Fact"}
            </Button>
            {successMessage ? <span className="form-feedback">{successMessage}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Section title="Memory Segments" subtitle="Filter facts by category and importance.">
        <FilterBar
          actions={
            <Button variant="ghost" onClick={() => setFilters({ category: "", isImportant: "" })}>
              Reset filters
            </Button>
          }
        >
          <Input
            label="Category"
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            placeholder="preferences"
          />
          <Select
            label="Important"
            value={filters.isImportant}
            onChange={(event) =>
              setFilters((current) => ({ ...current, isImportant: event.target.value as FactsFilters["isImportant"] }))
            }
          >
            <option value="">All</option>
            <option value="true">Only important</option>
            <option value="false">Only regular</option>
          </Select>
        </FilterBar>

        {errorMessage ? <ErrorState message={errorMessage} onRetry={() => void loadFacts(meta.page)} /> : null}
        {isLoading ? <LoadingBlock label="Loading facts..." /> : null}
        {!isLoading && !errorMessage && facts.length === 0 ? (
          <EmptyState title="No facts found" description="Create facts or adjust filters to see results." />
        ) : null}
        {!isLoading && !errorMessage && facts.length > 0 ? (
          <>
            <DataTable columns={columns} data={facts} rowKey={(fact) => fact.id} />
            <PaginationControls meta={meta} onPageChange={(page) => void loadFacts(page)} />
          </>
        ) : null}
      </Section>
    </div>
  );
}
