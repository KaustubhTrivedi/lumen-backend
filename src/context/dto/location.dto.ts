    // src/context/dto/location.dto.ts
    import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsPositive } from 'class-validator';

    export class LocationDto {
      @IsLatitude() // Validates if the number is a valid latitude (-90 to 90)
      latitude: number;

      @IsLongitude() // Validates if the number is a valid longitude (-180 to 180)
      longitude: number;

      @IsNumber()
      @IsPositive() // Accuracy should be a positive number
      @IsOptional() // Make accuracy optional
      accuracy?: number; // Accuracy in meters

      // You could add other fields like timestamp, altitude, etc. if needed
      // @IsISO8601()
      // @IsOptional()
      // timestamp?: string;
    }
    