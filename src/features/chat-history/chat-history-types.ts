export type ChatSessionSummary = {
  session_id: string;
  preview: string;
  message_count: number;
  started_at: string;
  updated_at: string;
};

export type ChatSessionMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  created_at: string;
};

export type ChatSessionDetail = {
  session_id: string;
  messages: ChatSessionMessage[];
};
