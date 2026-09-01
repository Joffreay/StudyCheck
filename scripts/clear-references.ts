import { PrismaClient } from "@prisma/client";
import { clearProjectReferences } from "../src/lib/references/clear-project";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.reviewProject.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) {
    console.log("Aucun projet trouvé.");
    return;
  }

  const summary = await clearProjectReferences(project.id);
  console.log(summary);
}

main().finally(() => prisma.$disconnect());
