import { PrismaClient } from "@prisma/client";
import { listReferences, getProjectFilterOptions } from "../src/lib/screening/service";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const project = await prisma.reviewProject.findFirst();
  if (!user || !project) {
    console.log("missing seed");
    return;
  }

  try {
    const result = await listReferences({
      projectId: project.id,
      userId: user.id,
      page: 1,
      pageSize: 50,
      sort: "score_desc",
    });
    const options = await getProjectFilterOptions(project.id);
    console.log("OK", result.total, "refs", options.sourceDatabases.length, "sources");
  } catch (error) {
    console.error("ERR", error);
    process.exitCode = 1;
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
