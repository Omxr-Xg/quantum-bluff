import { getPlayerAvatar } from "@/utils/avatars";

interface AvatarGalleryProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export function AvatarGallery({ selectedAvatar, onSelect }: AvatarGalleryProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
      {avatars.map((avatar, index) => {
        const isSelected = selectedAvatar === avatar;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(avatar)}
            className={`p-2 rounded-2xl border-2 transition-all duration-200 flex items-center justify-center
              ${
                isSelected
                  ? "border-green-500 bg-green-500/10 scale-105"
                  : "border-slate-600 bg-slate-800 hover:border-slate-400 hover:scale-105"
              }
            `}
          >
            <img
              src={avatar}
              alt={`Avatar ${index + 1}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}