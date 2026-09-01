export type ParsedReference = {
  title: string;
  abstract?: string;
  keywords: string[];
  meshTerms: string[];
  language?: string;
  publicationType?: string;
  year?: number;
  authors: Array<{ family?: string; given?: string; initials?: string }>;
  doi?: string;
  pmid?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  sourceDatabase?: string;
  externalIds: Record<string, string>;
  rawRecord: Record<string, unknown>;
};

export type ParseResult = {
  references: ParsedReference[];
  errors: Array<{ line?: number; message: string }>;
};

export type ImportFormat = "RIS" | "NBIB" | "CSV";

export type CsvColumnMapping = {
  title: string;
  abstract?: string;
  keywords?: string;
  meshTerms?: string;
  language?: string;
  publicationType?: string;
  year?: string;
  authors?: string;
  doi?: string;
  pmid?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
};

export const DEFAULT_CSV_MAPPING: CsvColumnMapping = {
  title: "title",
  abstract: "abstract",
  keywords: "keywords",
  meshTerms: "mesh_terms",
  language: "language",
  publicationType: "publication_type",
  year: "year",
  authors: "authors",
  doi: "doi",
  pmid: "pmid",
  journal: "journal",
  volume: "volume",
  issue: "issue",
  pages: "pages",
};
