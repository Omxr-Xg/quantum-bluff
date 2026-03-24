export const useUser = () => {
  const rawUserId = localStorage.getItem('userId') ?? localStorage.getItem('userid')
  const rawUsername = localStorage.getItem('username')

  const userId =
    rawUserId && rawUserId !== 'undefined' && rawUserId !== 'null'
      ? rawUserId
      : null

  const username =
    rawUsername && rawUsername !== 'undefined' && rawUsername !== 'null'
      ? rawUsername
      : null

  return { userId, username }
}