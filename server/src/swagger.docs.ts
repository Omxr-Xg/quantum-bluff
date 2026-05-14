/**
 * Fichier de documentation OpenAPI pour swagger-jsdoc.
 * Les définitions sont parsées automatiquement.
 */

/**
 * @swagger
 * /api/auth/check-email:
 *   post:
 *     tags: [Auth]
 *     summary: Vérifie si un email existe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: object, properties: { exists: { type: boolean } } } } } }
 *       400: { description: Email invalide }
 */
void 0;

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, username, dateOfBirth, secretQuestionId, secretAnswer]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               username: { type: string }
 *               dateOfBirth: { type: string, description: "AAAA-MM-JJ" }
 *               secretQuestionId: { type: integer }
 *               secretAnswer: { type: string }
 *     responses:
 *       201: { description: Compte créé, retourne token et user }
 *       400: { description: Validation échouée, âge insuffisant, ou email/username déjà utilisé }
 *       403: { description: Juridiction interdite (jeux d'argent non autorisés) }
 *       429: { description: Trop de tentatives }
 */
void 0;

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: OK, retourne token et user }
 *       401: { description: Email ou mot de passe incorrect }
 *       429: { description: Trop de tentatives }
 */
void 0;

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Déconnexion - invalide le token côté serveur
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK, token révoqué }
 *       401: { description: Non authentifié }
 */
void 0;

/**
 * @swagger
 * /api/auth/2fa/enable:
 *   post:
 *     tags: [Auth]
 *     summary: Active la 2FA - génère secret et QR code
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK, retourne secret et qrCode (data URL) }
 *       400: { description: 2FA déjà activé }
 */
void 0;

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Vérifie le code TOTP et active la 2FA
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { code: { type: string }, secret: { type: string } } }
 *     responses:
 *       200: { description: 2FA activé }
 *       400: { description: Code incorrect }
 */
void 0;

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Désactive la 2FA (requiert code actuel)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { code: { type: string } } }
 *     responses:
 *       200: { description: 2FA désactivé }
 *       400: { description: Code incorrect }
 */
void 0;

/**
 * @swagger
 * /api/auth/balance:
 *   get:
 *     tags: [Auth]
 *     summary: Récupère la balance (jetons) de l'utilisateur
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { type: object, properties: { chips: { type: number } } } } } }
 *       401: { description: Non authentifié }
 */
void 0;

/**
 * Démarrage partie cash : POST /api/waiting-room/{roomId}/start (body userId hôte)
 */

/**
 * @swagger
 * /api/game/{gameId}:
 *   get:
 *     tags: [Game]
 *     summary: État d'une partie
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: État de la partie }
 *       404: { description: Partie introuvable }
 */
void 0;

/**
 * @swagger
 * /api/game/{gameId}/action:
 *   post:
 *     tags: [Game]
 *     summary: Effectuer une action (CHECK, CALL, RAISE, FOLD)
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerId: { type: string }
 *               action: { type: string, enum: [CHECK, CALL, RAISE, FOLD] }
 *               amount: { type: number, description: Requis pour RAISE }
 *     responses:
 *       200: { description: Action effectuée }
 *       400: { description: Action invalide }
 *       404: { description: Partie introuvable }
 */
void 0;

/**
 * @swagger
 * /api/waiting-room/:
 *   get:
 *     tags: [WaitingRoom]
 *     summary: Liste des salles d'attente
 *   post:
 *     tags: [WaitingRoom]
 *     summary: Créer une salle
 */
void 0;
