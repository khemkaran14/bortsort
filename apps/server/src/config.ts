/** Server settings from environment variables (see apps/server/.env.example). */
export interface Config {
  port: number;
  /** Public base URL of this server, e.g. https://api.example.com (used for image and click links). */
  publicUrl: string;
  dbPath: string;
  uploadDir: string;
  /** Secret mixed into OTP hashes. Must be long and random in production. */
  otpSecret: string;
  admin: { email: string; password: string; passwordHash: string };
  /** 'console' prints codes to the server log (development only). */
  sms: {
    provider: 'console' | 'msg91' | 'twilio';
    msg91Key: string;
    msg91Template: string;
    twilioSid: string;
    twilioToken: string;
    twilioFrom: string;
  };
  smtp: { host: string; port: number; user: string; pass: string; from: string };
  /** Origins allowed to call the API from a browser (the app runs on capacitor/localhost origins). */
  corsOrigins: string[];
  production: boolean;
  /** OAuth client ids whose Google ID tokens we accept (web, Android and iOS clients). Empty = Google login off. */
  googleClientIds: string[];
}

export function loadConfig(env = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const cfg: Config = {
    port: Number(env.PORT ?? 3200),
    publicUrl: (env.PUBLIC_URL ?? 'http://localhost:3200').replace(/\/$/, ''),
    dbPath: env.DB_PATH ?? 'data/boltsort.db',
    uploadDir: env.UPLOAD_DIR ?? 'data/uploads',
    otpSecret: env.OTP_SECRET ?? 'dev-only-secret-change-me',
    admin: {
      email: (env.ADMIN_EMAIL ?? '').toLowerCase(),
      password: env.ADMIN_PASSWORD ?? '',
      passwordHash: env.ADMIN_PASSWORD_HASH ?? '',
    },
    sms: {
      provider: (env.SMS_PROVIDER as Config['sms']['provider']) ?? 'console',
      msg91Key: env.MSG91_AUTH_KEY ?? '',
      msg91Template: env.MSG91_TEMPLATE_ID ?? '',
      twilioSid: env.TWILIO_ACCOUNT_SID ?? '',
      twilioToken: env.TWILIO_AUTH_TOKEN ?? '',
      twilioFrom: env.TWILIO_FROM ?? '',
    },
    smtp: {
      host: env.SMTP_HOST ?? '',
      port: Number(env.SMTP_PORT ?? 587),
      user: env.SMTP_USER ?? '',
      pass: env.SMTP_PASS ?? '',
      from: env.SMTP_FROM ?? 'Nutwise <no-reply@example.com>',
    },
    corsOrigins: (
      env.CORS_ORIGINS ??
      'https://localhost,capacitor://localhost,http://localhost,http://localhost:5173,http://localhost:4173'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    production,
    googleClientIds: (env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  if (production) {
    const problems: string[] = [];
    if (cfg.otpSecret.length < 32 || cfg.otpSecret.startsWith('dev-'))
      problems.push('OTP_SECRET (32+ random characters)');
    if (!cfg.admin.email || (!cfg.admin.password && !cfg.admin.passwordHash))
      problems.push('ADMIN_EMAIL and ADMIN_PASSWORD_HASH');
    if (cfg.admin.password && cfg.admin.password.length < 12) problems.push('ADMIN_PASSWORD (12+ characters)');
    if (cfg.sms.provider === 'console') problems.push('SMS_PROVIDER (msg91 or twilio)');
    if (!cfg.publicUrl.startsWith('https://')) problems.push('PUBLIC_URL (https)');
    if (problems.length)
      throw new Error(
        'NODE_ENV=production needs these settings in apps/server/.env: ' +
          problems.join(', ') +
          '. For testing on your own computer, remove the NODE_ENV=production line.',
      );
  }
  return cfg;
}
