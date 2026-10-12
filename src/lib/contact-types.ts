import { installations } from './service-types.ts';
export const contactTopics = ['Wycena instalacji', ...installations, 'Współpraca', 'Inne pytanie'] as const;
export interface ContactSubmission { name: string; email: string; phone: string; topic: string; message: string; privacy: boolean; website: string; }
