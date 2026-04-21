import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Camera, Save, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import { QuantumBluffLogo, defaultAvatarUrl } from "../assets/logo";
import { getUserProfile, saveUserProfile } from "../utils/userProfile";
import { AvatarGallery } from "../components/AvatarGallery";
import { useUpdateProfileAvatarMutation } from "../services/api";

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t("editProfile.fileTooBig"));
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      saveUserProfile({
        username: formData.username,
        email: formData.email,
        avatar: profileImage,
      });
      const token = localStorage.getItem("token");
      if (token) {
        await updateProfileAvatar({ avatarUrl: profileImage }).unwrap();
      }
      setSuccessMessage(t("editProfile.profileUpdated"));
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch {
      setSuccessMessage("");
      alert(t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="size-full app-shell-bg overflow-auto">
      <div className="w-full min-w-0 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t("editProfile.backToProfile")}</span>
          </button>

          <div className="flex items-center gap-3">
            <QuantumBluffLogo className="w-12 h-12 drop-shadow-2xl" />
            <span className="text-2xl font-bold text-white">{t("lobby.title")}</span>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-600/20 border border-green-500 text-green-400 px-6 py-4 rounded-xl mb-6 text-center font-semibold">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-8">
            <h1 className="text-3xl font-bold text-white mb-6">
              {t("editProfile.editProfileTitle")}
            </h1>

            <div className="mb-8 pb-8 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                {t("editProfile.profilePhotoSection")}
              </h2>

              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-600 to-green-800 border-4 border-yellow-400 overflow-hidden flex items-center justify-center shadow-2xl">
                  <img
                    src={profileImage}
                    alt={t("editProfile.profilePreviewAlt")}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
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
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
                  >
                    <Camera className="w-5 h-5" />
                    {t("editProfile.choosePhoto")}
                  </button>
                  <p className="text-gray-400 text-sm mt-2">{t("editProfile.photoFormatsHint")}</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {t("editProfile.avatarGalleryLabel")}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{t("editProfile.avatarPresetHint")}</p>
                <AvatarGallery
                  selectedAvatar={profileImage}
                  onSelect={handleAvatarSelect}
                />
              </div>
            </div>

            <div className="mb-8 pb-8 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                {t("editProfile.basicInfoSection")}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    {t("editProfile.usernameLabel")}
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                    placeholder={t("editProfile.usernamePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    {t("editProfile.emailLabel")}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                    placeholder={t("editProfile.emailPlaceholder")}
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                {t("editProfile.securitySection")}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    {t("editProfile.currentPasswordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, currentPassword: e.target.value })
                      }
                      className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors pr-12"
                      placeholder={t("editProfile.currentPasswordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    {t("editProfile.newPasswordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, newPassword: e.target.value })
                      }
                      className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors pr-12"
                      placeholder={t("editProfile.newPasswordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {t("editProfile.newPasswordOptionalHint")}
                  </p>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    {t("editProfile.confirmPasswordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors pr-12"
                      placeholder={t("editProfile.confirmPasswordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-700">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-all"
              >
                {t("common.cancel")}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {isSaving ? t("editProfile.saving") : t("editProfile.saveChanges")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}