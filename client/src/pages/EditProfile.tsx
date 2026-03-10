import { useState, useRef } from "react";
import { ArrowLeft, Camera, Save, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import { QuantumBluffLogo, defaultAvatarUrl } from "../assets/logo";
import { getUserProfile, saveUserProfile } from "../utils/userProfile";

export function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les données du profil depuis localStorage
  const currentProfile = getUserProfile();

  // État du formulaire
  const [formData, setFormData] = useState({
    username: currentProfile.username,
    email: currentProfile.email,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // État de la photo de profil - Utiliser defaultAvatarUrl si pas d'avatar
  const [profileImage, setProfileImage] = useState<string>(currentProfile.avatar || defaultAvatarUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // États pour afficher/masquer les mots de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // État de sauvegarde
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Gestion du changement de photo
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("La taille du fichier ne doit pas dépasser 5MB !");
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

  // Gestion de la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Validation
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert("Les nouveaux mots de passe ne correspondent pas !");
      setIsSaving(false);
      return;
    }

    // Validation du mot de passe (minimum 6 caractères)
    if (formData.newPassword && formData.newPassword.length < 6) {
      alert("Le nouveau mot de passe doit contenir au moins 6 caractères !");
      setIsSaving(false);
      return;
    }

    // Sauvegarder les modifications dans localStorage
    setTimeout(() => {
      saveUserProfile({
        username: formData.username,
        email: formData.email,
        avatar: profileImage,
      });

      setIsSaving(false);
      setSuccessMessage("Profil mis à jour avec succès !");
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    }, 1000);
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour au profil</span>
          </button>
          <div className="flex items-center gap-3">
            <QuantumBluffLogo className="w-12 h-12 drop-shadow-2xl" />
            <span className="text-2xl font-bold text-white">Quantum Bluff</span>
          </div>
        </div>

        {/* Message de succès */}
        {successMessage && (
          <div className="bg-green-600/20 border border-green-500 text-green-400 px-6 py-4 rounded-xl mb-6 text-center font-semibold">
            {successMessage}
          </div>
        )}

        {/* Formulaire d'édition */}
        <form onSubmit={handleSubmit}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-8">
            <h1 className="text-3xl font-bold text-white mb-6">Éditer le profil</h1>

            {/* Section Photo de profil */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Photo de profil</h2>
              <div className="flex items-center gap-6">
                {/* Aperçu de la photo */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-600 to-green-800 border-4 border-yellow-400 overflow-hidden flex items-center justify-center shadow-2xl">
                  <img
                    src={profileImage}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Bouton pour changer la photo */}
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
                    Choisir une photo
                  </button>
                  <p className="text-gray-400 text-sm mt-2">
                    JPG, PNG ou GIF • Max 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Section Informations de base */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Informations de base</h2>
              <div className="space-y-4">
                {/* Nom d'utilisateur */}
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="Votre nom d'utilisateur"
                  />
                </div>

                {/* Adresse email */}
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Section Sécurité */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Sécurité</h2>
              <div className="space-y-4">
                {/* Mot de passe actuel */}
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors pr-12"
                      placeholder="Entrez votre mot de passe actuel"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Nouveau mot de passe */}
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors pr-12"
                      placeholder="Entrez un nouveau mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Laissez vide si vous ne souhaitez pas changer
                  </p>
                </div>

                {/* Confirmer le nouveau mot de passe */}
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 transition-colors pr-12"
                      placeholder="Confirmez votre nouveau mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-700">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}