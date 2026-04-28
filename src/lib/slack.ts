const SLACK_WEBHOOK_URL =
  '';

interface IncidentNotificationPayload {
  incidentId: string;
  roomNumber: string;
  issue: string;
}

export async function sendIncidentNotification(
  payload: IncidentNotificationPayload,
) {
  const text = `Incident ${payload.incidentId} created for Room ${payload.roomNumber} on issue ${payload.issue}.`;

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('Failed to send Slack notification');
  }
}

export async function sendChatMessageToSlack(params: {
  fromEmail?: string | null;
  text: string;
}) {
  const prefix = params.fromEmail ? `[Mobile] ${params.fromEmail}: ` : '[Mobile] ';
  const bodyText = `${prefix}${params.text}`;

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: bodyText }),
  });

  if (!response.ok) {
    throw new Error('Failed to send Slack chat message');
  }
}



