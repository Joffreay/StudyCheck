import { PrismaClient } from "@prisma/client";
import { detectTitleDuplicates } from "../src/lib/duplicates/service";

const prisma = new PrismaClient();

async function main() {
  const projectId = process.argv[2];

  if (!projectId) {
    const projects = await prisma.reviewProject.findMany({
      select: { id: true, title: true },
    });

    if (projects.length === 0) {
      console.error("Aucun projet trouvé.");
      process.exit(1);
    }

    if (projects.length === 1) {
      const result = await detectTitleDuplicates(projects[0].id);
      console.log(JSON.stringify({ project: projects[0].title, ...result }, null, 2));
      return;
    }

    for (const project of projects) {
      console.log(`- ${project.id} | ${project.title}`);
    }
    console.error("\nUsage: npx tsx scripts/detect-duplicates.ts <projectId>");
    process.exit(1);
  }

  const result = await detectTitleDuplicates(projectId);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
