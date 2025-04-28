// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/tasks.module';
import { HealthModule } from './health/health.module';
import { Task } from './tasks/entities/task.entity';
import { CalendarModule } from './calendar/calendar.module';
import { AuthModule } from './auth/auth.module';
import { OAuthTokenModule } from './oauth-token/oauth-token.module';
import { OAuthToken } from './oauth-token/entities/oauth-token.entity';
import { ContextModule } from './context/context.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
      envFilePath: '.env', // Specify the path to your .env file
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule here
      inject: [ConfigService], // Inject ConfigService to use it
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'), // Get from .env or default
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        logging: true,
        entities: [Task, OAuthToken, User], // Automatically loads entities
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false), // Default to false (safer), enable via .env for dev if needed
        // ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false, // Example for enabling SSL if needed
      }),
    }),
    TasksModule,
    HealthModule,
    CalendarModule,
    AuthModule,
    OAuthTokenModule,
    ContextModule,
    UsersModule,
    // Other modules will go here later
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
