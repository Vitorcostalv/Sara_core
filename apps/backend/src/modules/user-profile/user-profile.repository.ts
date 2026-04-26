import type { UserProfile } from "@sara/shared-types";
import { query } from "../../database/postgres";
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
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `
  id, display_name, preferred_name, full_name, email, locale, timezone, birth_date, created_at, updated_at
`;

export class UserProfileRepository {
  async findById(id: string): Promise<UserProfile | null> {
    const result = await query<UserProfileRow>(
      `SELECT ${SELECT_COLUMNS} FROM user_profile WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? mapUserProfile(row) : null;
  }

  async ensureLocalProfile(): Promise<UserProfile> {
    const existing = await this.findById(LOCAL_USER_ID);
    if (existing) return existing;

    const now = new Date().toISOString();
    await query(
      `INSERT INTO user_profile (id, display_name, preferred_name, full_name, email, locale, timezone, birth_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [LOCAL_USER_ID, "Local User", "Local User", "Local User", null, "pt-BR", "America/Sao_Paulo", null, now, now]
    );

    return (await this.findById(LOCAL_USER_ID))!;
  }

  async updateLocalProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.displayName !== undefined) { fields.push(`display_name = $${idx++}`); values.push(input.displayName); }
    if (input.preferredName !== undefined) { fields.push(`preferred_name = $${idx++}`); values.push(input.preferredName); }
    if (input.fullName !== undefined) { fields.push(`full_name = $${idx++}`); values.push(input.fullName); }
    if (input.email !== undefined) { fields.push(`email = $${idx++}`); values.push(input.email); }
    if (input.locale !== undefined) { fields.push(`locale = $${idx++}`); values.push(input.locale); }
    if (input.timezone !== undefined) { fields.push(`timezone = $${idx++}`); values.push(input.timezone); }
    if (input.birthDate !== undefined) { fields.push(`birth_date = $${idx++}`); values.push(input.birthDate); }

    if (fields.length > 0) {
      fields.push(`updated_at = $${idx++}`);
      values.push(new Date().toISOString());
      values.push(LOCAL_USER_ID);
      await query(
        `UPDATE user_profile SET ${fields.join(", ")} WHERE id = $${idx}`,
        values
      );
    }

    return (await this.findById(LOCAL_USER_ID))!;
  }
}
