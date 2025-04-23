import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { NestFastifyApplication } from '@nestjs/platform-fastify';

/**
 * Sets up password-protected swagger documentation for the application
 */
export const setupSwagger = (app: NestFastifyApplication) => {
  const options = new DocumentBuilder()
    .setTitle('App API')
    .setDescription('API docs')
    .setVersion('1.0')
    .build();

  const appDocument = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('docs', app, appDocument, {
    jsonDocumentUrl: '/docs/json',
    explorer: true,
    swaggerOptions: {
      urls: [
        {
          name: 'API',
          url: '/docs/json',
        },
      ],
    },
  });
};
