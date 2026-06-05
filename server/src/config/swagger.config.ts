import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Quantum Bluff API',
      version: '1.0.0',
      description: 'API du jeu de poker Quantum Bluff - authentification, parties, amis, invitations',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Dev' },
      { url: 'https://mai-projet-integrateur.u-strasbg.fr', description: 'Prod' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            chips: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/swagger.docs.ts'],
};

let cachedSpec: ReturnType<typeof swaggerJsdoc> | null = null

/** Génération paresseuse — évite de charger tous les fichiers routes en prod. */
export function getSwaggerSpec(): ReturnType<typeof swaggerJsdoc> {
  if (!cachedSpec) {
    cachedSpec = swaggerJsdoc(options)
  }
  return cachedSpec
}
