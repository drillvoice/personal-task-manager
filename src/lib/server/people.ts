import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organisations, people } from "@/lib/db/schema";

export type PersonWithOrg = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
  orgId: string | null;
  orgName: string | null;
};

export type OrganisationRow = {
  id: string;
  name: string;
  notes: string;
};

export type ContactOption = { id: string; name: string };

export async function loadPeopleData(userId: string): Promise<{
  people: PersonWithOrg[];
  orgs: OrganisationRow[];
}> {
  const [personRows, orgRows] = await Promise.all([
    db
      .select({ person: people, orgName: organisations.name })
      .from(people)
      .leftJoin(organisations, eq(people.organisationId, organisations.id))
      .where(eq(people.userId, userId))
      .orderBy(asc(people.name)),
    db
      .select({
        id: organisations.id,
        name: organisations.name,
        notes: organisations.notes,
      })
      .from(organisations)
      .where(eq(organisations.userId, userId))
      .orderBy(asc(organisations.name)),
  ]);

  return {
    people: personRows.map((r) => ({
      id: r.person.id,
      name: r.person.name,
      role: r.person.role,
      email: r.person.email,
      phone: r.person.phone,
      notes: r.person.notes,
      orgId: r.person.organisationId,
      orgName: r.orgName ?? null,
    })),
    orgs: orgRows,
  };
}

export async function loadContactOptions(userId: string): Promise<{
  people: ContactOption[];
  orgs: ContactOption[];
}> {
  const [personRows, orgRows] = await Promise.all([
    db
      .select({ id: people.id, name: people.name })
      .from(people)
      .where(eq(people.userId, userId))
      .orderBy(asc(people.name)),
    db
      .select({ id: organisations.id, name: organisations.name })
      .from(organisations)
      .where(eq(organisations.userId, userId))
      .orderBy(asc(organisations.name)),
  ]);
  return { people: personRows, orgs: orgRows };
}
