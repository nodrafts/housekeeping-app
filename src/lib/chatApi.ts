import axios from 'axios';

export const chatApi = axios.create({
  baseURL: 'https://nodrafts-chat-dev.fly.dev/api/v1',
});

export function setChatToken(token: string | null) {
  if (token) {
    chatApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete chatApi.defaults.headers.common.Authorization;
  }
}
