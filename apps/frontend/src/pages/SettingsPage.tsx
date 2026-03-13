import { useCallback, useEffect, useState } from "react";
import { Gear, UserCircle } from "@phosphor-icons/react";
import type { UpdateUserProfileRequest, UserProfile } from "@sara/shared-types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Input,
  LoadingBlock,
  PageHeader,
  ProfileField,
  Section
} from "../components/ui";
import { getApiErrorMessage, userProfileApi } from "../services/api/client";
import { useUiStore } from "../state/ui.store";
import { formatDate, formatDateTime } from "../utils/format";

interface UserProfileForm {
  displayName: string;
  preferredName: string;
  fullName: string;
  email: string;
  locale: string;
  timezone: string;
  birthDate: string;
}

const initialForm: UserProfileForm = {
  displayName: "",
  preferredName: "",
  fullName: "",
  email: "",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  birthDate: ""
};

function toForm(profile: UserProfile): UserProfileForm {
  return {
    displayName: profile.displayName,
    preferredName: profile.preferredName ?? "",
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    locale: profile.locale,
    timezone: profile.timezone,
    birthDate: profile.birthDate ?? ""
  };
}

export function SettingsPage() {
  const { apiBaseUrl, setApiBaseUrl } = useUiStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfileForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await userProfileApi.get();
      setProfile(response.data);
      setForm(toForm(response.data));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSaveProfile = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload: UpdateUserProfileRequest = {
      displayName: form.displayName.trim(),
      preferredName: form.preferredName.trim() || null,
      fullName: form.fullName.trim() || null,
      email: form.email.trim() || null,
      locale: form.locale.trim(),
      timezone: form.timezone.trim(),
      birthDate: form.birthDate.trim() || null
    };

    try {
      const response = await userProfileApi.update(payload);
      setProfile(response.data);
      setForm(toForm(response.data));
      setSuccessMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Profile & Settings"
        description="Manage local profile fields and frontend API configuration."
        icon={<Gear weight="duotone" />}
      />

      {errorMessage ? <ErrorState message={errorMessage} onRetry={() => void loadProfile()} /> : null}

      {isLoading ? (
        <LoadingBlock label="Loading profile..." />
      ) : (
        <>
          <Section title="Local Profile" subtitle="Backed by GET/PATCH /user-profile contracts.">
            <Card>
              <CardHeader>
                <CardTitle>
                  <UserCircle weight="duotone" /> Profile Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="stack-sm">
                <div className="form-grid">
                  <Input
                    label="Display name"
                    value={form.displayName}
                    onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  />
                  <Input
                    label="Preferred name"
                    value={form.preferredName}
                    onChange={(event) => setForm((current) => ({ ...current, preferredName: event.target.value }))}
                  />
                  <Input
                    label="Full name"
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                  <Input
                    label="Email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                  <Input
                    label="Locale"
                    value={form.locale}
                    onChange={(event) => setForm((current) => ({ ...current, locale: event.target.value }))}
                  />
                  <Input
                    label="Timezone"
                    value={form.timezone}
                    onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                  />
                  <Input
                    label="Birth date"
                    value={form.birthDate}
                    onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="form-actions">
                  <Button variant="primary" onClick={() => void onSaveProfile()} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Profile"}
                  </Button>
                  {successMessage ? <span className="form-feedback">{successMessage}</span> : null}
                </div>
              </CardContent>
            </Card>

            {profile ? (
              <Card>
                <CardHeader>
                  <CardTitle>Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="ui-profile-grid">
                  <ProfileField label="Profile ID" value={profile.id} />
                  <ProfileField label="Created at" value={formatDateTime(profile.createdAt)} />
                  <ProfileField label="Updated at" value={formatDateTime(profile.updatedAt)} />
                  <ProfileField label="Birth date" value={formatDate(profile.birthDate)} />
                </CardContent>
              </Card>
            ) : null}
          </Section>

          <Section title="Frontend API Configuration" subtitle="Controls which backend URL the frontend uses.">
            <Card>
              <CardContent className="stack-sm">
                <Input
                  label="API Base URL"
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  placeholder="http://localhost:3333/api/v1"
                />
              </CardContent>
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}
