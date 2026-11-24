import nodemailer from 'nodemailer';
import type { Config } from './config';

export interface Sender {
  sms(phone: string, code: string): Promise<void>;
  email(to: string, code: string): Promise<void>;
}

/** Messages sent by the console sender (development and tests only). */
export const outbox: { to: string; code: string }[] = [];

export function makeSender(cfg: Config): Sender {
  const transport =
    cfg.smtp.host && cfg.smtp.user
      ? nodemailer.createTransport({
          host: cfg.smtp.host,
          port: cfg.smtp.port,
          secure: cfg.smtp.port === 465,
          auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
        })
      : null;

  const consoleSend = async (to: string, code: string) => {
    outbox.push({ to, code });
    if (outbox.length > 50) outbox.shift();
    if (!cfg.production) console.log(`[dev OTP] ${to}: ${code}`);
  };

  return {
    async sms(phone, code) {
      if (cfg.sms.provider === 'msg91') {
        // MSG91 OTP API (India; needs a DLT-approved template with ##OTP##).
        const url = new URL('https://control.msg91.com/api/v5/otp');
        url.searchParams.set('template_id', cfg.sms.msg91Template);
        url.searchParams.set('mobile', phone.replace(/^\+/, ''));
        url.searchParams.set('otp', code);
        const r = await fetch(url, {
          method: 'POST',
          headers: { authkey: cfg.sms.msg91Key, 'content-type': 'application/json' },
        });
        if (!r.ok) throw new Error(`MSG91 error ${r.status}`);
        return;
      }
      if (cfg.sms.provider === 'twilio') {
        const body = new URLSearchParams({
          To: phone,
          From: cfg.sms.twilioFrom,
          Body: `${code} is your Nutwise login code. It expires in 5 minutes.`,
        });
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sms.twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            authorization: 'Basic ' + Buffer.from(`${cfg.sms.twilioSid}:${cfg.sms.twilioToken}`).toString('base64'),
          },
          body,
        });
        if (!r.ok) throw new Error(`Twilio error ${r.status}`);
        return;
      }
      await consoleSend(phone, code);
    },
    async email(to, code) {
      if (!transport) return consoleSend(to, code);
      await transport.sendMail({
        from: cfg.smtp.from,
        to,
        subject: `${code} is your Nutwise login code`,
        text: `Your Nutwise login code is ${code}.\nIt expires in 5 minutes. If you did not ask for it, ignore this email.`,
      });
    },
  };
}
