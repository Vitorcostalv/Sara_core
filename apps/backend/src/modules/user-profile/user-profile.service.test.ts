import assert from "node:assert/strict";
import test from "node:test";
import type { UserProfile } from "@sara/shared-types";
import { UserProfileService, type UserProfileRepositoryContract } from "./user-profile.service";

function makeUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "local-user",
    displayName: "Local User",
    preferredName: "Local User",
    fullName: "Local User",
    email: null,
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    birthDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("UserProfileService.getLocalProfile ensures and returns local user profile", async () => {
  const expected = makeUserProfile();

  const repository: UserProfileRepositoryContract = {
    ensureLocalProfile: () => Promise.resolve(expected),
    updateLocalProfile: () => Promise.resolve(expected),
  };

  const service = new UserProfileService(repository);
  const profile = await service.getLocalProfile();

  assert.equal(profile.id, "local-user");
});

test("UserProfileService.updateLocalProfile updates only provided fields", async () => {
  const updated = makeUserProfile({ preferredName: "Sara", displayName: "Sara Core" });

  let ensureCalled = false;
  let updateCalled = false;

  const repository: UserProfileRepositoryContract = {
    ensureLocalProfile: () => {
      ensureCalled = true;
      return Promise.resolve(makeUserProfile());
    },
    updateLocalProfile: (input) => {
      updateCalled = true;
      assert.equal(input.preferredName, "Sara");
      return Promise.resolve(updated);
    },
  };

  const service = new UserProfileService(repository);
  const profile = await service.updateLocalProfile({ preferredName: "Sara" });

  assert.equal(ensureCalled, true);
  assert.equal(updateCalled, true);
  assert.equal(profile.preferredName, "Sara");
});
