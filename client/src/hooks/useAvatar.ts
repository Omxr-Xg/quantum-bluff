import { useEffect, useState } from "react";

const DEFAULT_AVATAR =
  "https://api.dicebear.com/7.x/adventurer/svg?seed=default-player";

const STORAGE_KEY = "selectedAvatar";

export function useAvatar() {
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR);

  useEffect(() => {
    const savedAvatar = localStorage.getItem(STORAGE_KEY);
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, []);

  const updateAvatar = (newAvatar: string) => {
    setAvatar(newAvatar);
    localStorage.setItem(STORAGE_KEY, newAvatar);
  };

  return {
    avatar,
    setAvatar: updateAvatar,
    defaultAvatar: DEFAULT_AVATAR,
  };
}