import { randomUUID } from "crypto";
import { google } from "googleapis";

const CALENDAR_TIME_ZONE = "America/Sao_Paulo";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state: string): string {
  const client = createOAuth2Client();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function getRefreshTokenFromCode(code: string): Promise<string> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("Google não retornou um refresh token.");
  }

  return tokens.refresh_token;
}

export interface CreateMeetEventParams {
  refreshToken: string;
  titulo: string;
  descricao?: string;
  inicio: Date;
  fim: Date;
  participantes: string[];
}

export interface CreateMeetEventResult {
  meetLink: string;
  eventId: string;
}

export async function createMeetEvent({
  refreshToken,
  titulo,
  descricao,
  inicio,
  fim,
  participantes,
}: CreateMeetEventParams): Promise<CreateMeetEventResult> {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: client });

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: titulo,
      description: descricao,
      start: { dateTime: inicio.toISOString(), timeZone: CALENDAR_TIME_ZONE },
      end: { dateTime: fim.toISOString(), timeZone: CALENDAR_TIME_ZONE },
      attendees: participantes.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  if (!data.hangoutLink || !data.id) {
    throw new Error("Não foi possível gerar o link do Google Meet.");
  }

  return { meetLink: data.hangoutLink, eventId: data.id };
}
