import { PrismaClient } from "@prisma/client";
import { rescoreProject } from "../src/lib/scoring/service";

const prisma = new PrismaClient();

async function main() {
  const projectId = process.argv[2];

  if (!projectId) {
    const projects = await prisma.reviewProject.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            references: {
              where: { isCanonical: true, mergedIntoId: null },
            },
          },
        },
      },
    });

    if (projects.length === 0) {
      console.error("Aucun projet trouvé.");
      process.exit(1);
    }

    if (projects.length === 1) {
      const project = projects[0];
      console.log(`Projet: ${project.title} (${project._count.references} références)`);
      const summary = await rescoreProject(project.id);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log("Projets disponibles :");
    for (const project of projects) {
      console.log(`- ${project.id} | ${project.title} | ${project._count.references} refs`);
    }
    console.error("\nUsage: npx tsx scripts/rescore-project.ts <projectId>");
    process.exit(1);
  }

  const summary = await rescoreProject(projectId);
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
