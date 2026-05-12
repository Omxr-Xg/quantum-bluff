import { registerSchema, loginSchema, resetPasswordSchema } from '../validation/auth.validation.js'
import { gameActionSchema, botActionSchema } from '../validation/game.validation.js'
import { searchUserSchema, friendRequestSchema, updateRequestSchema } from '../validation/friends.validation.js'
import { gameRatingSchema } from '../validation/feedback.validation.js'
import { playerReportCreateSchema } from '../validation/playerReport.validation.js'

describe('validation schemas', () => {
  describe('auth.validation', () => {
    it('registerSchema accepts valid payload', () => {
      const r = registerSchema.safeParse({
        email: 'a@b.co',
        username: 'alice',
        password: 'secret12',
        secretQuestionId: 1,
        secretAnswer: 'Paris',
      })
      expect(r.success).toBe(true)
    })
    it('registerSchema rejects invalid email', () => {
      expect(
        registerSchema.safeParse({
          email: 'bad',
          username: 'alice',
          password: 'secret12',
          secretQuestionId: 1,
          secretAnswer: 'Paris',
        }).success,
      ).toBe(false)
    })
    it('loginSchema', () => {
      expect(loginSchema.safeParse({ email: 'x@y.z', password: '123456' }).success).toBe(true)
      expect(loginSchema.safeParse({ email: 'x', password: '123456' }).success).toBe(false)
    })
    it('resetPasswordSchema', () => {
      expect(
        resetPasswordSchema.safeParse({
          email: 'a@b.co',
          secretAnswer: 'x',
          newPassword: '123456',
        }).success,
      ).toBe(true)
    })
  })

  describe('game.validation', () => {
    it('gameActionSchema', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      expect(
        gameActionSchema.safeParse({ playerId: id, action: 'FOLD' }).success,
      ).toBe(true)
      expect(gameActionSchema.safeParse({ playerId: 'nope', action: 'FOLD' }).success).toBe(false)
    })
    it('botActionSchema', () => {
      expect(
        botActionSchema.safeParse({
          gameId: 'g1',
          playerId: 'p1',
          action: 'CHECK',
        }).success,
      ).toBe(true)
    })
  })

  describe('friends.validation', () => {
    it('searchUserSchema', () => {
      expect(searchUserSchema.safeParse({ query: 'ab' }).success).toBe(true)
      expect(searchUserSchema.safeParse({ query: 'a' }).success).toBe(false)
    })
    it('friendRequestSchema', () => {
      expect(friendRequestSchema.safeParse({ receiverUsername: 'bob' }).success).toBe(true)
    })
    it('updateRequestSchema', () => {
      expect(updateRequestSchema.safeParse({ status: 'ACCEPTED' }).success).toBe(true)
    })
  })

  describe('feedback.validation', () => {
    it('gameRatingSchema trims empty message to undefined', () => {
      const r = gameRatingSchema.safeParse({ stars: 5, message: '   ' })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.message).toBeUndefined()
    })
  })

  describe('playerReport.validation', () => {
    it('playerReportCreateSchema', () => {
      const uid = '550e8400-e29b-41d4-a716-446655440001'
      expect(
        playerReportCreateSchema.safeParse({
          reportedUserId: uid,
          reason: 'OTHER',
          detail: null,
        }).success,
      ).toBe(true)
    })
  })
})
