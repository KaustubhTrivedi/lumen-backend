    // src/health/health.controller.ts
    import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
    import { InjectDataSource } from '@nestjs/typeorm';
    import { DataSource } from 'typeorm';
    import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'; // Use Terminus for standard health checks

    @Controller('health')
    export class HealthController {
      constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        @InjectDataSource() // Inject the default DataSource
        private defaultDataSource: DataSource,
        // Add other datasources here if you have multiple connections
      ) {}

      @Get()
      @HealthCheck() // Use the @HealthCheck decorator from @nestjs/terminus
      check() {
        // Check various services. Here we only check the default database connection.
        return this.health.check([
          // Check database connection using TypeOrmHealthIndicator
          () => this.db.pingCheck('database', { timeout: 300}),
          // () => this.db.pingCheck('database-read-replica', { timeout: 300, dataSource: this.readReplicaSource }), // Example if you had another connection
        ]);
      }

      // Optional: A more manual check if you don't want to use Terminus initially
      @Get('db-manual')
      async checkDbManual() {
        try {
          // Use the injected DataSource to run a simple query
          await this.defaultDataSource.query('SELECT 1');
          return { status: 'ok', message: 'Database connection successful' };
        } catch (error) {
          // If the query fails, throw an HTTP exception
          throw new HttpException(
            {
              status: 'error',
              message: 'Database connection failed',
              error: error.message,
            },
            HttpStatus.SERVICE_UNAVAILABLE, // 503 status code
          );
        }
      }
    }
    