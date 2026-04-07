/**
 * Runway Team Member Reference Data
 *
 * Easy-to-edit reference for team members, roles, and account assignments.
 * Used by the bot system prompt builder and workload tools.
 * Update this file as team members come and go.
 */

export type RoleCategory =
  | "creative"
  | "dev"
  | "am"
  | "pm"
  | "leadership"
  | "community";

export interface TeamMemberReference {
  fullName: string;
  firstName: string;
  nicknames: string[];
  slackUserId: string;
  roleCategory: RoleCategory;
  accountsLed: string[];
  title: string;
}

export const TEAM_REFERENCES: TeamMemberReference[] = [
  {
    fullName: "Kathy Horn",
    firstName: "Kathy",
    nicknames: [],
    slackUserId: "",
    roleCategory: "leadership",
    accountsLed: ["convergix"],
    title: "Creative Director / Copywriter",
  },
  {
    fullName: "Jason Burks",
    firstName: "Jason",
    nicknames: [],
    slackUserId: "",
    roleCategory: "leadership",
    accountsLed: ["tap"],
    title: "TAP / Strategy",
  },
  {
    fullName: "Jill Runyon",
    firstName: "Jill",
    nicknames: [],
    slackUserId: "",
    roleCategory: "am",
    accountsLed: ["beyond-petro", "bonterra", "ag1", "edf", "abm"],
    title: "Director of Client Experience",
  },
  {
    fullName: "Allison Shannon",
    firstName: "Allison",
    nicknames: ["Allie"],
    slackUserId: "",
    roleCategory: "am",
    accountsLed: ["wilsonart", "dave-asprey"],
    title: "Account Manager",
  },
  {
    fullName: "Lane Jordan",
    firstName: "Lane",
    nicknames: [],
    slackUserId: "",
    roleCategory: "creative",
    accountsLed: [],
    title: "Creative Director",
  },
  {
    fullName: "Leslie Crosby",
    firstName: "Leslie",
    nicknames: [],
    slackUserId: "",
    roleCategory: "dev",
    accountsLed: [],
    title: "Developer",
  },
  {
    fullName: "Ronan Lane",
    firstName: "Ronan",
    nicknames: [],
    slackUserId: "",
    roleCategory: "pm",
    accountsLed: ["hopdoddy", "lppc", "soundly"],
    title: "Senior PM",
  },
  {
    fullName: "Sami Blumenthal",
    firstName: "Sami",
    nicknames: [],
    slackUserId: "",
    roleCategory: "community",
    accountsLed: [],
    title: "Community Manager",
  },
];

/** Find a team member by first name (case-insensitive). */
export function findTeamMemberByFirstName(
  firstName: string
): TeamMemberReference | undefined {
  const lower = firstName.toLowerCase();
  return TEAM_REFERENCES.find((m) => m.firstName.toLowerCase() === lower);
}

/** Find a team member by full name (case-insensitive). */
export function findTeamMemberByFullName(
  fullName: string
): TeamMemberReference | undefined {
  const lower = fullName.toLowerCase();
  return TEAM_REFERENCES.find((m) => m.fullName.toLowerCase() === lower);
}

/** Find a team member by any name: first name, full name, or nickname (case-insensitive). */
export function findTeamMember(
  name: string
): TeamMemberReference | undefined {
  const lower = name.toLowerCase();
  return TEAM_REFERENCES.find(
    (m) =>
      m.firstName.toLowerCase() === lower ||
      m.fullName.toLowerCase() === lower ||
      m.nicknames.some((n) => n.toLowerCase() === lower)
  );
}

/** Get all team members with a specific role category. */
export function getTeamByRole(role: RoleCategory): TeamMemberReference[] {
  return TEAM_REFERENCES.filter((m) => m.roleCategory === role);
}
