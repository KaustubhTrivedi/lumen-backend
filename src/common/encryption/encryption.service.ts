// src/common/encryption/encryption.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm'; // Recommended algorithm
  private readonly ivLength = 16; // Initialization Vector length for GCM
  private readonly authTagLength = 16; // Authentication Tag length for GCM

  constructor(private configService: ConfigService) {
    const keyHex = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      this.logger.error(
        'TOKEN_ENCRYPTION_KEY is missing, invalid, or not 64 hex characters (32 bytes) long in .env',
      );
      throw new InternalServerErrorException(
        'Encryption key configuration error.',
      );
    }
    // Convert hex key to Buffer
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypts plain text using AES-256-GCM.
   * @param text The plain text string to encrypt.
   * @returns A string containing iv:authTag:encryptedData, base64 encoded. Returns null if input is null/undefined.
   */
  encrypt(text: string | null | undefined): string | null {
    if (text == null) {
      // Checks for both null and undefined
      return null;
    }
    try {
      const iv = crypto.randomBytes(this.ivLength); // Generate random Initialization Vector
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag(); // Get the authentication tag

      // Prepend IV and AuthTag to the encrypted data (colon-separated, then base64)
      // Store IV and AuthTag with ciphertext for decryption
      const combined = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
      return Buffer.from(combined).toString('base64'); // Base64 encode the whole thing for safe storage
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Encryption process failed.');
    }
  }

  /**
   * Decrypts text encrypted with AES-256-GCM.
   * Expects input format from encrypt method (base64 encoded iv:authTag:encryptedData).
   * @param encryptedText The base64 encoded encrypted string.
   * @returns The original plain text string. Returns null if input is null/invalid.
   */
  decrypt(encryptedText: string | null | undefined): string | null {
    if (encryptedText == null) {
      return null;
    }
    try {
      // Decode the combined base64 string
      const combined = Buffer.from(encryptedText, 'base64').toString('utf8');
      const parts = combined.split(':');

      // Ensure we have exactly three parts: IV, AuthTag, EncryptedData
      if (parts.length !== 3) {
        this.logger.error(
          'Decryption failed: Invalid encrypted text format (expected 3 parts).',
        );
        // Handle error appropriately, maybe return null or throw specific error
        return null; // Or throw new InternalServerErrorException('Invalid encrypted data format.');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encryptedData = parts[2];

      // Verify IV and AuthTag lengths
      if (
        iv.length !== this.ivLength ||
        authTag.length !== this.authTagLength
      ) {
        this.logger.error('Decryption failed: Invalid IV or AuthTag length.');
        return null; // Or throw new InternalServerErrorException('Invalid encryption metadata.');
      }

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag); // Set the authentication tag for verification

      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Errors typically occur here if the key is wrong or the data/authTag is tampered with
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      // Return null or throw specific error, avoid leaking details
      return null; // Indicate decryption failure
      // Or: throw new InternalServerErrorException('Decryption process failed (invalid key or data).');
    }
  }
}
