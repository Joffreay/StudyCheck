import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_EXCLUSION_REASONS = [
  {
    code: "OFF_TOPIC_TITLE",
    label: "Hors sujet (titre)",
    description: "Théâtre littéraire, média, musique, improvisation technique.",
  },
  {
    code: "NON_HEALTH_POPULATION",
    label: "Population non soignante",
    description: "Critère P. Patients, doctorants en sciences, professions non médicales.",
  },
  {
    code: "NO_THEATRICAL_IMPROV",
    label: "Pas d'improvisation théâtrale (B)",
    description: "L'intervention n'emploie pas les techniques de l'improvisation théâtrale.",
  },
  {
    code: "NON_IMPROVISER_PARTICIPANT",
    label: "Participant non improvisateur (A)",
    description: "Le participant évalué reçoit l'improvisation d'un tiers.",
  },
  {
    code: "PREDEFINED_CLINICAL_SITUATION",
    label: "Situation clinique prédéfinie (C)",
    description: "Théâtre-forum, jeu de rôle scénarisé, ECOS.",
  },
  {
    code: "DOCUMENT_TYPE",
    label: "Type de document",
    description: "Éditorial, commentaire, perspective sans données, résumé de congrès seul, revue.",
  },
  {
    code: "LANGUAGE",
    label: "Langue",
    description: "Hors anglais et français.",
  },
  {
    code: "RETRACTED",
    label: "Article rétracté",
    description: "Signalé par Zotero ou la base source.",
  },
  {
    code: "DUPLICATE",
    label: "Doublon",
    description: "Doublon confirmé lors de l'agrégation des bases.",
  },
];

async function upsertReader(email: string, name: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: UserRole.READER },
    create: { email, name, passwordHash, role: UserRole.READER },
  });
}

async function main() {
  const reader1Email = process.env.READER1_EMAIL ?? "lecteur1@studycheck.local";
  const reader1Password = process.env.READER1_PASSWORD ?? "lecteur1";
  const reader2Email = process.env.READER2_EMAIL ?? "lecteur2@studycheck.local";
  const reader2Password = process.env.READER2_PASSWORD ?? "lecteur2";

  const project = await prisma.reviewProject.upsert({
    where: { id: "default-project" },
    update: {
      title: "Improvisation théâtrale en formation des professionnels et étudiants en santé",
      description: "Revue de portée — pré-tri sur titres et résumés",
    },
    create: {
      id: "default-project",
      title: "Improvisation théâtrale en formation des professionnels et étudiants en santé",
      description: "Revue de portée — pré-tri sur titres et résumés",
    },
  });

  await upsertReader(reader1Email, "Lecteur 1", reader1Password);
  await upsertReader(reader2Email, "Lecteur 2", reader2Password);

  for (const [index, reason] of DEFAULT_EXCLUSION_REASONS.entries()) {
    await prisma.exclusionReason.upsert({
      where: {
        projectId_code: {
          projectId: project.id,
          code: reason.code,
        },
      },
      update: {
        label: reason.label,
        description: reason.description,
        sortOrder: index,
        isActive: true,
      },
      create: {
        projectId: project.id,
        code: reason.code,
        label: reason.label,
        description: reason.description,
        sortOrder: index,
      },
    });
  }

  console.log("Seed terminé.");
  console.log(`Projet: ${project.id}`);
  console.log(`Lecteur 1: ${reader1Email}`);
  console.log(`Lecteur 2: ${reader2Email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
