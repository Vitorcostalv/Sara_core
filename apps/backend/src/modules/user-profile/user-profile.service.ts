import type { UserProfile } from "@sara/shared-types";
import { logger } from "../../logging/logger";
import { UserProfileRepository } from "./user-profile.repository";
import type { UpdateUserProfileInput } from "./user-profile.schemas";

const userProfileLogger = logger.child({ module: "user-profile-service" });

export interface UserProfileRepositoryContract {
  ensureLocalProfile(): Promise<UserProfile>;
  updateLocalProfile(input: UpdateUserProfileInput): Promise<UserProfile>;
}

export class UserProfileService {
  constructor(private readonly repository: UserProfileRepositoryContract) {}

  async getLocalProfile(): Promise<UserProfile> {
    return this.repository.ensureLocalProfile();
  }

  async updateLocalProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    userProfileLogger.debug({ fields: Object.keys(input) }, "Updating local user profile");
    await this.repository.ensureLocalProfile();
    return this.repository.updateLocalProfile(input);
  }
}

export const userProfileService = new UserProfileService(new UserProfileRepository());
