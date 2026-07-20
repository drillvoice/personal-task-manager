import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groups,
  meetingAttendees,
  meetings,
  organisations,
  people,
  personGroups,
} from "@/lib/db/schema";

// Recent meetings shown on a person's detail panel are capped — the panel is a
// quick reference, not a full history.
const RECENT_MEETINGS_PER_PERSON = 6;

export type PersonMeeting = {
  id: string;
  title: string;
  meetingDate: string;
  status: "upcoming" | "completed";
};

export type PersonWithOrg = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
  orgId: string | null;
  orgName: string | null;
  groups: ContactOption[];
  meetings: PersonMeeting[];
};

export type OrganisationRow = {
  id: string;
  name: string;
  notes: string;
};

export type ContactOption = { id: string; name: string };

export type GroupOption = { id: string; name: string; memberIds: string[] };

export async function loadPeopleData(userId: string): Promise<{
  people: PersonWithOrg[];
  orgs: OrganisationRow[];
  groups: OrganisationRow[];
}> {
  const [personRows, orgRows, groupRows, membershipRows, meetingRows] =
    await Promise.all([
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
    db
      .select({
        id: groups.id,
        name: groups.name,
        notes: groups.notes,
      })
      .from(groups)
      .where(eq(groups.userId, userId))
      .orderBy(asc(groups.name)),
    db
      .select({
        personId: personGroups.personId,
        groupId: groups.id,
        groupName: groups.name,
      })
      .from(personGroups)
      .innerJoin(groups, eq(personGroups.groupId, groups.id))
      .where(eq(groups.userId, userId))
      .orderBy(asc(groups.name)),
    db
      .select({
        personId: meetingAttendees.personId,
        id: meetings.id,
        title: meetings.title,
        meetingDate: meetings.meetingDate,
        status: meetings.status,
      })
      .from(meetingAttendees)
      .innerJoin(meetings, eq(meetingAttendees.meetingId, meetings.id))
      .where(eq(meetings.userId, userId))
      .orderBy(desc(meetings.meetingDate), desc(meetings.createdAt)),
  ]);

  const meetingsByPerson = new Map<string, PersonMeeting[]>();
  for (const m of meetingRows) {
    const list = meetingsByPerson.get(m.personId) ?? [];
    if (list.length < RECENT_MEETINGS_PER_PERSON) {
      list.push({
        id: m.id,
        title: m.title,
        meetingDate: m.meetingDate,
        status: m.status,
      });
    }
    meetingsByPerson.set(m.personId, list);
  }

  const groupsByPerson = new Map<string, ContactOption[]>();
  for (const m of membershipRows) {
    const list = groupsByPerson.get(m.personId) ?? [];
    list.push({ id: m.groupId, name: m.groupName });
    groupsByPerson.set(m.personId, list);
  }

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
      groups: groupsByPerson.get(r.person.id) ?? [],
      meetings: meetingsByPerson.get(r.person.id) ?? [],
    })),
    orgs: orgRows,
    groups: groupRows,
  };
}

export async function loadGroupOptions(
  userId: string,
): Promise<GroupOption[]> {
  const [groupRows, membershipRows] = await Promise.all([
    db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(eq(groups.userId, userId))
      .orderBy(asc(groups.name)),
    db
      .select({ groupId: personGroups.groupId, personId: personGroups.personId })
      .from(personGroups)
      .innerJoin(groups, eq(personGroups.groupId, groups.id))
      .where(eq(groups.userId, userId)),
  ]);

  const membersByGroup = new Map<string, string[]>();
  for (const m of membershipRows) {
    const list = membersByGroup.get(m.groupId) ?? [];
    list.push(m.personId);
    membersByGroup.set(m.groupId, list);
  }

  return groupRows.map((g) => ({
    id: g.id,
    name: g.name,
    memberIds: membersByGroup.get(g.id) ?? [],
  }));
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
