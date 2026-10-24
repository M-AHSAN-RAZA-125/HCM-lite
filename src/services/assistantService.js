const ASSISTANT_ENDPOINT = '/api/v1/assistant/chat';

export class AssistantServiceError extends Error {
  constructor(userMessage, status = null) {
    super(userMessage);
    this.name = 'AssistantServiceError';
    this.userMessage = userMessage;
    this.status = status;
  }
}

/**
 * Sends one message to the authenticated server assistant.
 * Request: POST { message: string }
 * Success: { reply: string }
 * The server must derive identity and permissions from the authenticated session.
 */
export async function requestAssistantReply(message) {
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  if (!cleanMessage || cleanMessage.length > 4000) {
    throw new AssistantServiceError('Enter a message of 1 to 4,000 characters.');
  }

  let response;
  try {
    response = await fetch(ASSISTANT_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: cleanMessage }),
    });
  } catch {
    throw new AssistantServiceError(
      'The assistant service could not be reached. No answer was generated. Check that the authenticated backend is running, then retry.'
    );
  }

  if (!response.ok) {
    const messagesByStatus = {
      401: 'Your session is not authenticated. Sign in again before using the assistant.',
      403: 'Your account is not authorized to access this information.',
      404: 'The assistant service is not configured on the server yet. No answer was generated.',
      413: 'This message is too large for the assistant service. Shorten it and retry.',
      429: 'The assistant is receiving too many requests. Wait a moment and retry.',
      501: 'The assistant service is not configured on the server yet. No answer was generated.',
      503: 'The assistant service is temporarily unavailable or not configured. No answer was generated.',
    };
    throw new AssistantServiceError(
      messagesByStatus[response.status] || 'The assistant could not complete this request. No answer was generated.',
      response.status
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new AssistantServiceError('The assistant service returned an invalid response. Please retry.', response.status);
  }

  if (typeof result?.reply !== 'string' || !result.reply.trim()) {
    throw new AssistantServiceError('The assistant service returned no answer. Please retry.', response.status);
  }

  return result.reply.trim();
}