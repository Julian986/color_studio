import twilio from "twilio";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

let cachedClient = null;

export function getTwilioClient() {
  if (cachedClient) return cachedClient;

  const accountSid = getRequiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = getRequiredEnv("TWILIO_AUTH_TOKEN");

  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}
