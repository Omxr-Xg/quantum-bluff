import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Camera, Save, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import { defaultAvatarUrl } from "../assets/logo";
import { getUserProfile, saveUserProfile } from "../utils/userProfile";
import { AvatarGallery } from "../components/AvatarGallery";
import { useUpdateProfileAvatarMutation } from "../services/api";
import { fileToAvatarDataUrl, presetAvatarToDataUrl } from "../utils/avatarUpload";
import { avatarPresetIdFromUrl } from "../utils/avatars";
import { getAuthItem, setAuthItem } from "../utils/authStorage";

const editGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const editInnerCard =
  "rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md";
const editInputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-blue-200/45 focus:ring-1 focus:ring-blue-300/25";
const editPrimaryButton =
  "rounded-full border border-blue-300/20 bg-blue-950/75 font-semibold text-white shadow-lg shadow-black/20 transition hover:border-blue-200/35 hover:bg-blue-900/85 disabled:cursor-not-allowed disabled:opacity-50";
const editMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";

export function EditProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProfile = getUserProfile();

  const [formData, setFormData] = useState({
    username: currentProfile.username,
    email: currentProfile.email,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileImage, setProfileImage] = useState<string>(
    currentProfile.avatar || defaultAvatarUrl
  );
  const [_imageFile, setImageFile] = useState<File | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [updateProfileAvatar] = useUpdateProfileAvatarMutation();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t("editProfile.fileTooBig"));
      return;
    }
    setImageFile(file);
    try {
      const dataUrl = await fileToAvatarDataUrl(file, 512, 0.88);
      setProfileImage(dataUrl);
    } catch {
      alert(t("common.error"));
    }
  };

  const handleAvatarSelect = (avatar: string) => {
    setProfileImage(avatar);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert(t("editProfile.passwordMismatch"));
      setIsSaving(false);
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      alert(t("editProfile.passwordMinLength"));
      setIsSaving(false);
      return;
    }

    try {
      const token = getAuthItem("token");
      let avatarToPersist = profileImage;
      let usernameToPersist = formData.username.trim();
      let emailToPersist = formData.email.trim();
      if (token) {
        /* Les presets sont des URLs Vite bundlées (ex. /assets/FA1-abc123.png) :
         * `sanitizePublicAvatarUrl` côté serveur ne les accepte pas (uniquement
         * data:, http(s):, ou /api/auth/avatars/{uuid}). On les convertit donc
         * en data URL avant l'envoi pour que le serveur puisse les ingérer. */
        const avatarUrlForApi = await presetAvatarToDataUrl(profileImage);
        const avatarPresetId = avatarPresetIdFromUrl(profileImage) ?? undefined;
        const result = await updateProfileAvatar({
          avatarUrl: avatarUrlForApi,
          avatarPresetId,
          username: usernameToPersist,
          email: emailToPersist,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }).unwrap();
        if (typeof result?.avatarUrl === "string" && result.avatarUrl.trim() !== "") {
          avatarToPersist = result.avatarUrl.trim();
        }
        usernameToPersist = result.username;
        emailToPersist = result.email;
      }
      saveUserProfile({
        username: usernameToPersist,
        email: emailToPersist,
        avatar: avatarToPersist,
      });
      setAuthItem("username", usernameToPersist);
      setAuthItem("quantum_bluff_username", usernameToPersist);
      setAuthItem("quantum_bluff_email", emailToPersist);
      window.dispatchEvent(new Event("auth-changed"));
      setSuccessMessage(t("editProfile.profileUpdated"));
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (err: unknown) {
      setSuccessMessage("");
      let message = t("common.error");
      if (typeof err === "object" && err !== null && "data" in err) {
        const d = (err as { data?: { error?: string } }).data;
        if (typeof d?.error === "string" && d.error.trim() !== "") message = d.error;
      }
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-full w-full overflow-hidden bg-[#020716] text-slate-100">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_40%,rgba(14,116,144,0.10),transparent_48%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-950/40 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-700/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-950/28 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.26) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.55),transparent_58%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 p-3 sm:p-6">
        <div className="mb-6 flex items-start justify-between">
          <button
            onClick={() => navigate("/profile")}
            className={`flex w-fit items-center gap-2 px-3 py-2 text-sm sm:px-4 ${editMutedButton}`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("editProfile.backToProfile")}</span>
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-6 py-4 text-center font-semibold text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.10)]">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={`p-5 sm:p-7 ${editGlassCard}`}>
            <h1 className="mb-2 bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {t("editProfile.editProfileTitle")}
            </h1>
            <p className="mb-7 max-w-2xl text-sm text-slate-400">
              {t("editProfile.profilePhotoSection")} · {t("editProfile.basicInfoSection")} · {t("editProfile.securitySection")}
            </p>

            <div className={`mb-5 p-4 sm:p-5 ${editInnerCard}`}>
              <h2 className="mb-4 text-xl font-semibold text-white">
                {t("editProfile.profilePhotoSection")}
              </h2>

              <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-blue-200/25 bg-blue-950/55 shadow-[0_0_44px_rgba(59,130,246,0.20)]">
                  <img
                    src={profileImage}
                    alt={t("editProfile.profilePreviewAlt")}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-6 py-3 ${editPrimaryButton}`}
                  >
                    <Camera className="h-5 w-5" />
                    {t("editProfile.choosePhoto")}
                  </button>
                  <p className="mt-2 text-sm text-slate-400">{t("editProfile.photoFormatsHint")}</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold text-white">
                  {t("editProfile.avatarGalleryLabel")}
                </h3>
                <p className="mb-4 text-sm text-slate-400">{t("editProfile.avatarPresetHint")}</p>
                <AvatarGallery
                  selectedAvatar={profileImage}
                  onSelect={handleAvatarSelect}
                />
              </div>
            </div>

            <div className={`mb-5 p-4 sm:p-5 ${editInnerCard}`}>
              <h2 className="mb-4 text-xl font-semibold text-white">
                {t("editProfile.basicInfoSection")}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-400">
                    {t("editProfile.usernameLabel")}
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className={editInputClass}
                    placeholder={t("editProfile.usernamePlaceholder")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-400">
                    {t("editProfile.emailLabel")}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={editInputClass}
                    placeholder={t("editProfile.emailPlaceholder")}
                  />
                </div>
              </div>
            </div>

            <div className={`mb-5 p-4 sm:p-5 ${editInnerCard}`}>
              <h2 className="mb-4 text-xl font-semibold text-white">
                {t("editProfile.securitySection")}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-400">
                    {t("editProfile.currentPasswordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, currentPassword: e.target.value })
                      }
                      className={`${editInputClass} pr-12`}
                      placeholder={t("editProfile.currentPasswordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-400">
                    {t("editProfile.newPasswordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, newPassword: e.target.value })
                      }
                      className={`${editInputClass} pr-12`}
                      placeholder={t("editProfile.newPasswordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("editProfile.newPasswordOptionalHint")}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-400">
                    {t("editProfile.confirmPasswordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className={`${editInputClass} pr-12`}
                      placeholder={t("editProfile.confirmPasswordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-end gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className={`px-8 py-3 ${editMutedButton}`}
              >
                {t("common.cancel")}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-8 py-3 ${editPrimaryButton}`}
              >
                <Save className="h-5 w-5" />
                {isSaving ? t("editProfile.saving") : t("editProfile.saveChanges")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
