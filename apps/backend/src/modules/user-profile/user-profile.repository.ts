import type { UserProfile } from "@sara/shared-types";
import { db } from "../../database/client";
import type { UpdateUserProfileInput } from "./user-profile.schemas";

const LOCAL_USER_ID = "local-user";

interface UserProfileRow {
  id: string;
  display_name: string;
  preferred_name: string | null;
  full_name: string | null;
  email: string | null;
  locale: string;
  timezone: string;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

function mapUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    preferredName: row.preferred_name,
    fullName: row.full_name,
    email: row.email,
    locale: row.locale,
    timezone: row.timezone,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class UserProfileRepository {
  findById(id: string): UserProfile | null {
    const row = db
      .prepare(
        `
        SELECT
          id,
          display_name,
          preferred_name,
          full_name,
          email,
          locale,
          timezone,
          birth_date,
          created_at,
          updated_at
        FROM user_profile
        WHERE id = ?
      `
      )
      .get(id) as UserProfileRow | undefined;

    return row ? mapUserProfile(row) : null;
  }

  ensureLocalProfile(): UserProfile {
    const existing = this.findById(LOCAL_USER_ID);

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO user_profile (
        id, display_name, preferred_name, full_name, email, locale, timezone, birth_date, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      LOCAL_USER_ID,
      "Local User",
      "Local User",
      "Local User",
      null,
      "pt-BR",
      "America/Sao_Paulo",
      null,
      now,
      now
    );

    return this.findById(LOCAL_USER_ID)!;
  }

  updateLocalProfile(input: UpdateUserProfileInput): UserProfile {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.displayName !== undefined) {
      fields.push("display_name = ?");
      values.push(input.displayName);
    }

    if (input.preferredName !== undefined) {
      fields.push("preferred_name = ?");
      values.push(input.preferredName);
    }

    if (input.fullName !== undefined) {
      fields.push("full_name = ?");
      values.push(input.fullName);
    }

    if (input.email !== undefined) {
      fields.push("email = ?");
      values.push(input.email);
    }

    if (input.locale !== undefined) {
      fields.push("locale = ?");
      values.push(input.locale);
    }

    if (input.timezone !== undefined) {
      fields.push("timezone = ?");
      values.push(input.timezone);
    }

    if (input.birthDate !== undefined) {
      fields.push("birth_date = ?");
      values.push(input.birthDate);
    }

    if (fields.length > 0) {
      fields.push("updated_at = ?");
      values.push(new Date().toISOString(), LOCAL_USER_ID);

      db.prepare(
        `
        UPDATE user_profile
        SET ${fields.join(", ")}
        WHERE id = ?
      `
      ).run(...values);
    }

    return this.findById(LOCAL_USER_ID)!;
  }
}
