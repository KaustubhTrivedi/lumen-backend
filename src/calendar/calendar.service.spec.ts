// src/calendar/calendar.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CalendarService } from './calendar.service';
import { google, Auth, calendar_v3 } from 'googleapis';
import {
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

// --- Mocking googleapis ---
// Create mock functions for the methods we expect to call
const mockGenerateAuthUrl = jest.fn();
const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockEventsList = jest.fn();

// Mock the OAuth2 client instance and its methods
const mockOAuth2ClientInstance = {
  generateAuthUrl: mockGenerateAuthUrl,
  getToken: mockGetToken,
  setCredentials: mockSetCredentials,
  credentials: null as Auth.Credentials | null, // To simulate credential state
};

// Mock the calendar API and its methods
const mockCalendarApi = {
  events: {
    list: mockEventsList,
  },
};

// Use jest.mock to replace the actual 'googleapis' module
jest.mock('googleapis', () => ({
  google: {
    // Mock the constructor for OAuth2
    auth: {
      OAuth2: jest.fn().mockImplementation(() => mockOAuth2ClientInstance),
    },
    // Mock the function that returns the calendar API instance
    calendar: jest.fn().mockImplementation(() => mockCalendarApi),
  },
}));
// --- End Mocking googleapis ---

describe('CalendarService', () => {
  let service: CalendarService;
  let configService: ConfigService;

  // Mock ConfigService values
  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'GOOGLE_CLIENT_ID':
          return 'mockClientId';
        case 'GOOGLE_CLIENT_SECRET':
          return 'mockClientSecret';
        case 'GOOGLE_REDIRECT_URI':
          return 'mockRedirectUri';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockOAuth2ClientInstance.credentials = null; // Reset credentials state

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: ConfigService,
          useValue: mockConfigService, // Provide the mock ConfigService
        },
        // Logger can often be omitted or mocked if specific log checks are needed
        // { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } }
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize OAuth2Client on construction with valid config', () => {
    // Check if the constructor was called with the mock config values
    expect(google.auth.OAuth2).toHaveBeenCalledWith(
      'mockClientId',
      'mockClientSecret',
      'mockRedirectUri',
    );
    // Check if the internal client was set (accessing private member for test is sometimes necessary, or add getter)
    expect((service as any).oauth2Client).toBeDefined();
  });

  describe('generateAuthUrl', () => {
    it('should generate an auth URL with correct scopes', () => {
      const dummyUrl = 'http://dummy.auth.url';
      mockGenerateAuthUrl.mockReturnValue(dummyUrl); // Configure the mock method

      const result = service.generateAuthUrl();

      // Check if the mock generateAuthUrl was called with expected options
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        include_granted_scopes: true,
      });
      expect(result).toBe(dummyUrl);
    });

    it('should throw if OAuth2 client is not initialized', () => {
      // Simulate missing config by creating service instance without proper setup
      // (This requires more complex setup or testing constructor logic separately)
      // Alternatively, manually set the internal client to null/undefined for this test case if possible
      (service as any).oauth2Client = null;
      expect(() => service.generateAuthUrl()).toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getTokensFromCode', () => {
    const authCode = 'testCode';
    const mockTokens: Auth.Credentials = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expiry_date: Date.now() + 3600000,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
    };

    it('should exchange code for tokens and set credentials', async () => {
      // Mock getToken to resolve successfully
      mockGetToken.mockResolvedValue({ tokens: mockTokens });

      const result = await service.getTokensFromCode(authCode);

      expect(mockGetToken).toHaveBeenCalledWith(authCode);
      expect(mockSetCredentials).toHaveBeenCalledWith(mockTokens);
      expect((service as any).tempTokens).toEqual(mockTokens); // Check temporary storage
      expect(result).toEqual(mockTokens);
    });

    it('should throw InternalServerErrorException if getToken fails', async () => {
      const error = new Error('Google API Error');
      mockGetToken.mockRejectedValue(error); // Mock getToken to reject

      await expect(service.getTokensFromCode(authCode)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockSetCredentials).not.toHaveBeenCalled();
    });
  });

  describe('listUpcomingEvents', () => {
    const mockEvent: calendar_v3.Schema$Event = {
      id: '1',
      summary: 'Test Event',
    };

    it('should list upcoming events if authenticated', async () => {
      // Simulate that tokens were obtained and credentials set
      mockOAuth2ClientInstance.credentials = {
        access_token: 'mock_access_token',
      };
      (service as any).tempTokens = mockOAuth2ClientInstance.credentials; // Ensure getOAuthClient sets credentials

      // Mock the calendar API response
      mockEventsList.mockResolvedValue({ data: { items: [mockEvent] } });

      // Call the service method being tested
      const result = await service.listUpcomingEvents(5); // Pass maxResults: 5

      // Check if google.calendar was called correctly
      expect(google.calendar).toHaveBeenCalledWith({
        version: 'v3',
        auth: mockOAuth2ClientInstance,
      });

      // **** CORRECTED ASSERTION ****
      // Check if events.list was called with correct parameters matching the call above
      expect(mockEventsList).toHaveBeenCalledWith({
        calendarId: 'primary', // Expect 'primary'
        timeMin: expect.any(String), // Check that a date string was passed
        maxResults: 5, // Expect 5 because we called service.listUpcomingEvents(5)
        singleEvents: true,
        orderBy: 'startTime',
      });
      // **** END CORRECTION ****

      expect(result).toEqual([mockEvent]);
    });

    it('should throw UnauthorizedException if credentials are not set', async () => {
      // Ensure no credentials are set
      mockOAuth2ClientInstance.credentials = null;
      (service as any).tempTokens = null;

      // This test expects the service call to reject
      await expect(service.listUpcomingEvents(5)).rejects.toThrow(
        UnauthorizedException,
      );
      // Ensure the actual API call was not made if unauthorized
      expect(mockEventsList).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if calendar API fails', async () => {
      // Simulate valid credentials being set
      mockOAuth2ClientInstance.credentials = {
        access_token: 'mock_access_token',
      };
      (service as any).tempTokens = mockOAuth2ClientInstance.credentials;

      // Mock the underlying API call to reject
      const error = new Error('API Error');
      mockEventsList.mockRejectedValue(error);

      // Expect the service method to reject with the correct NestJS exception
      await expect(service.listUpcomingEvents(5)).rejects.toThrow(
        InternalServerErrorException,
      );
      // Ensure the API call was attempted
      expect(mockEventsList).toHaveBeenCalled();
    });
  });
});
