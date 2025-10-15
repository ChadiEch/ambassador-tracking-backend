import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface InstagramConfig {
  verifyToken: string;
  pageAccessToken: string;
}

export interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export default registerAs('app', () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secretKey',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  instagram: {
    verifyToken: process.env.META_VERIFY_TOKEN,
    pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
  },
  mailer: {
    host: process.env.SMTP_HOST || 'smtp.yourprovider.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.MAILER_FROM || '"Ambassador Tracking" <no-reply@yourdomain.com>',
  },
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
}));