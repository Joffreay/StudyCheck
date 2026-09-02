import type { PrismaScrFlow } from "./prisma-scr-types";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function section(title: string, rows: Array<[string, string | number]>): string[] {
  return [
    title,
    "metric,value",
    ...rows.map(([metric, value]) => `${escapeCsvCell(metric)},${escapeCsvCell(value)}`),
    "",
  ];
}

export function prismaScrToCsv(flow: PrismaScrFlow): string {
  const lines: string[] = [
    ...section("metadata", [
      ["project_id", flow.projectId],
      ["project_title", flow.projectTitle],
      ["generated_at", flow.generatedAt],
      ["phase", flow.phase],
    ]),
    "identification_by_source,source_database,records_identified,import_batch_count",
    ...flow.identification.bySource.map((source) =>
      [
        "source",
        escapeCsvCell(source.sourceDatabase),
        source.recordsIdentified,
        source.importBatchCount,
      ].join(","),
    ),
    "",
    ...section("identification_totals", [
      ["total_records_identified", flow.identification.totalRecordsIdentified],
    ]),
    ...section("deduplication", [
      ["duplicates_removed", flow.deduplication.duplicatesRemoved],
      ["records_after_deduplication", flow.deduplication.recordsAfterDeduplication],
    ]),
    "screening_by_reader,reader_id,reader_name,pending,screened,retain,exclude,uncertain,proceeding",
    ...flow.screening.byReader.map((reader) =>
      [
        "reader",
        escapeCsvCell(reader.readerId),
        escapeCsvCell(reader.readerName),
        reader.pending,
        reader.screened,
        reader.retain,
        reader.exclude,
        reader.uncertain,
        reader.proceeding,
      ].join(","),
    ),
    "",
    ...section("screening_consensus", [
      ["both_pending", flow.screening.consensus.bothPending],
      ["both_retain", flow.screening.consensus.bothRetain],
      ["both_exclude", flow.screening.consensus.bothExclude],
      ["both_uncertain", flow.screening.consensus.bothUncertain],
      ["disagreement", flow.screening.consensus.disagreement],
      ["one_reader_pending", flow.screening.consensus.onePending],
      ["proceeding_to_full_text", flow.screening.consensus.proceedingToFullText],
      ["excluded_at_screening", flow.screening.consensus.excludedAtScreening],
    ]),
    "exclusion_reasons,reader_name,reason_code,reason_label,count",
    ...flow.exclusionReasons.map((reason) =>
      [
        "reason",
        escapeCsvCell(reason.readerName),
        escapeCsvCell(reason.reasonCode),
        escapeCsvCell(reason.reasonLabel),
        reason.count,
      ].join(","),
    ),
    "",
    ...section("eligibility", [
      ["reports_proceeding_from_screening", flow.eligibility.reportsProceedingFromScreening],
      ["note", flow.eligibility.note],
    ]),
    ...section("included", [
      ["count", flow.included.count],
      ["note", flow.included.note],
    ]),
    "import_batches,filename,source_database,format,records_total,records_imported,records_skipped,imported_at",
    ...flow.imports.map((batch) =>
      [
        "batch",
        escapeCsvCell(batch.filename),
        escapeCsvCell(batch.sourceDatabase),
        escapeCsvCell(batch.format),
        batch.recordsTotal,
        batch.recordsImported,
        batch.recordsSkipped,
        escapeCsvCell(batch.importedAt),
      ].join(","),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

export function prismaScrToMarkdownSummary(flow: PrismaScrFlow): string {
  const sourceLines = flow.identification.bySource
    .map((source) => `- ${source.sourceDatabase} : ${source.recordsIdentified}`)
    .join("\n");

  const readerLines = flow.screening.byReader
    .map(
      (reader) =>
        `- **${reader.readerName}** : ${reader.screened} examinées · ${reader.retain} conservées · ${reader.exclude} exclues · ${reader.uncertain} incertaines · ${reader.pending} en attente`,
    )
    .join("\n");

  return `# Flux PRISMA-ScR — ${flow.projectTitle}

Généré le ${new Date(flow.generatedAt).toLocaleString("fr-FR")}

## Identification
${sourceLines || "- Aucun import"}
- **Total identifié** : ${flow.identification.totalRecordsIdentified}

## Déduplication
- **Doublons retirés** : ${flow.deduplication.duplicatesRemoved}
- **Records après déduplication** : ${flow.deduplication.recordsAfterDeduplication}

## Screening (titre / résumé)
${readerLines || "- Aucun lecteur"}

### Consensus (accord des deux lecteurs)
- Accord RETAIN : ${flow.screening.consensus.bothRetain}
- Accord EXCLUDE : ${flow.screening.consensus.bothExclude}
- Accord UNCERTAIN : ${flow.screening.consensus.bothUncertain}
- Désaccord : ${flow.screening.consensus.disagreement}
- En attente (≥1 lecteur) : ${flow.screening.consensus.onePending + flow.screening.consensus.bothPending}
- **Vers texte intégral (double RETAIN)** : ${flow.screening.consensus.proceedingToFullText}

## Éligibilité / Inclusion
- ${flow.eligibility.note}
- ${flow.included.note}
`;
}
