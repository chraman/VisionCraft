import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createLogger } from '@ai-platform/utils';

const logger = createLogger('auth-service');

export interface GoogleProfile {
  provider: 'google';
  id: string;
  email: string;
  name: string | undefined;
  avatarUrl: string | undefined;
}

export function configurePassport(): void {
  const clientID = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  const callbackURL =
    process.env['GOOGLE_CALLBACK_URL'] ?? 'http://localhost:3001/api/v1/auth/google/callback';

  if (!clientID || !clientSecret) {
    logger.warn('Google OAuth credentials not configured — Google login will return 501', {
      action: 'passport_skip',
    });
    return;
  }

  passport.use(
    new GoogleStrategy(
      { clientID, clientSecret, callbackURL },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Google account has no email address'));
        }

        const googleProfile: GoogleProfile = {
          provider: 'google',
          id: profile.id,
          email,
          name: profile.displayName ?? undefined,
          avatarUrl: profile.photos?.[0]?.value ?? undefined,
        };

        done(null, googleProfile);
      }
    )
  );

  logger.info('Passport Google strategy configured', { action: 'passport_init' });
}

export { passport };
