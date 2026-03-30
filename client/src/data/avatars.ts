export const getPlayerAvatar = (id: number | string) => {
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${id}`;
  };