import { PrismaClient } from "@prisma/client";
import { importBibliographicFile } from "../src/lib/import/service";
import { SAMPLE_RIS } from "../tests/fixtures/bibliographic";

const prisma = new PrismaClient();

async function main() {
  const summary = await importBibliographicFile({
    projectId: "default-project",
    filename: "sample.ris",
    format: "RIS",
    sourceDatabase: "PubMed",
    content: SAMPLE_RIS,
  });

  const references = await prisma.reference.findMany({
    where: { projectId: "default-project" },
    include: {
      sources: true,
      scoringResults: { orderBy: { computedAt: "desc" }, take: 1 },
      tags: true,
    },
  });

  console.log("Import:", summary);
  console.log(
    "Références:",
    references.map((ref) => ({
      title: ref.title,
      score: ref.scoringResults[0]?.scoreTotal,
      tags: ref.tags.map((tag) => tag.tagCode),
      sources: ref.sources.length,
    })),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
