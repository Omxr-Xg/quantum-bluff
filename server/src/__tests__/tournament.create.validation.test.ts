import {
  normalizeTournamentMaxPlayers,
  validateTournamentGameParams,
} from '../tournament/tournament.create.validation.js'

describe('validateTournamentGameParams', () => {
  const future = () => new Date(Date.now() + 60_000)

  it('accepte une config standard', () => {
    expect(() =>
      validateTournamentGameParams({
        initialStack: 2000,
        blindSmall: 10,
        blindBig: 20,
        startAt: future(),
      }),
    ).not.toThrow()
  })

  it('rejette une date invalide', () => {
    expect(() =>
      validateTournamentGameParams({
        initialStack: 2000,
        blindSmall: 10,
        blindBig: 20,
        startAt: new Date('invalid'),
      }),
    ).toThrow('Date de départ invalide')
  })

  it('rejette startAt trop dans le passé', () => {
    expect(() =>
      validateTournamentGameParams({
        initialStack: 2000,
        blindSmall: 10,
        blindBig: 20,
        startAt: new Date(Date.now() - 120_000),
      }),
    ).toThrow('futur')
  })

  it('rejette petite blind > grosse blind', () => {
    expect(() =>
      validateTournamentGameParams({
        initialStack: 2000,
        blindSmall: 50,
        blindBig: 20,
        startAt: future(),
      }),
    ).toThrow('petite blind')
  })

  it('rejette stack trop faible', () => {
    expect(() =>
      validateTournamentGameParams({
        initialStack: 50,
        blindSmall: 1,
        blindBig: 2,
        startAt: future(),
      }),
    ).toThrow('Stack initiale')
  })
})

describe('normalizeTournamentMaxPlayers', () => {
  it('accepte 4 et 20', () => {
    expect(normalizeTournamentMaxPlayers(4)).toBe(4)
    expect(normalizeTournamentMaxPlayers(20)).toBe(20)
  })

  it('tronque les décimales vers le bas dans la plage', () => {
    expect(normalizeTournamentMaxPlayers(8.9)).toBe(8)
  })

  it('rejette moins de 4 ou plus de 20', () => {
    expect(() => normalizeTournamentMaxPlayers(3)).toThrow('Nombre de joueurs')
    expect(() => normalizeTournamentMaxPlayers(21)).toThrow('Nombre de joueurs')
    expect(() => normalizeTournamentMaxPlayers(NaN)).toThrow('Nombre de joueurs')
  })
})
