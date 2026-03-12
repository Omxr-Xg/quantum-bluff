export const useUser = () => {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  
  return { userId, username };
};
