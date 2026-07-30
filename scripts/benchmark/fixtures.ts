type CatalogOptions = {
  readonly changed?: boolean;
  readonly count: number;
};

export const mediumJson = JSON.stringify(makeCatalog({ count: 120 }));
export const largeJson = JSON.stringify(makeCatalog({ count: 1_200 }));
export const sparseChangeJson = JSON.stringify(makeCatalog({ count: 1_200, changed: true }));
export const arrayJson = JSON.stringify(makeRows(1_500));

const insertedRows = makeRows(1_500);
insertedRows.splice(750, 0, makeRow(-1));
export const arrayInsertionJson = JSON.stringify(insertedRows);

function makeCatalog({ changed = false, count }: CatalogOptions) {
  return {
    version: changed ? 2 : 1,
    metadata: {
      generatedBy: "leafnode-benchmark",
      stable: true,
    },
    rows: makeRows(count, changed),
  };
}

function makeRows(count: number, changed = false) {
  return Array.from({ length: count }, (_, index) => {
    const row = makeRow(index);
    if (!changed || index % 211 !== 0) return row;
    return {
      ...row,
      label: `${row.label}-changed`,
      metrics: { ...row.metrics, score: row.metrics.score + 1 },
      note: "added",
    };
  });
}

function makeRow(index: number) {
  return {
    id: `row-${index}`,
    label: `Fixture row ${index}`,
    enabled: index % 3 !== 0,
    metrics: {
      rank: index,
      score: (index * 17) % 101,
    },
    tags: [`group-${index % 7}`, `bucket-${index % 13}`],
  };
}
