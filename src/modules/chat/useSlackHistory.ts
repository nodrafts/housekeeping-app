// src/modules/chat/useSlackHistory.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const BACKEND_BASE_URL = 'http://localhost:4000'; 

export function useSlackHistory() {
  return useQuery({
    queryKey: ['slack', 'history'],
    queryFn: async () => {
      const res = await axios.get(`${BACKEND_BASE_URL}/api/slack/history`);
      return res.data.messages;
    },
  });
}