
import { BaseAIProvider, type CommandDescriptor } from './provider.interface';
import type { IntentResult, ProviderChatMessage, ProviderChatResult } from '../../types';

/**
 * Offline engine supporting both English and Natural Bangladeshi Bengali.
 */
export class LocalProvider extends BaseAIProvider {
  readonly id = 'local';
  readonly label = 'Local Engine (Bilingual)';
  readonly model = 'offline-multi-v1';

  isConfigured(): boolean {
    return true;
  }

  async chat(messages: ProviderChatMessage[]): Promise<ProviderChatResult> {
    console.log('[AI] Request started');
    console.log(`[AI] Provider: ${this.label} (${this.model})`);

    const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
    const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
    const lastUser = userMessages[userMessages.length - 1] ?? '';
    const previousUser = userMessages.length > 1 ? userMessages[userMessages.length - 2] : '';

    const isExplicitBangla =
      systemPrompt.includes('natural Bangladeshi Bengali') ||
      systemPrompt.includes('বাংলা') ||
      /[\u0980-\u09FF]/.test(lastUser) ||
      /\b(kemon|acho|achen|ki khobor|bhalo|amar|apni|tumi|dhonnobad)\b/i.test(lastUser);

    const reply = isExplicitBangla
      ? this.composeBanglaReply(lastUser, previousUser)
      : this.composeEnglishReply(lastUser, previousUser);

    console.log(`[AI] Parsed full response: "${reply}"`);
    console.log(`[AI] Response length: ${reply.length}`);

    return { text: reply, model: this.model };
  }

  async detectIntent(input: { text: string; commands: CommandDescriptor[] }): Promise<IntentResult> {
    this.currentOriginal = input.text;
    const text = input.text.trim().toLowerCase();
    if (!text) return { kind: 'reply', confidence: 1 };

    if (
      /^(what is|who is|explain|tell me|how to|why is|কেমন আছো|কেমন আছেন|তুমি কে|তোমার নাম কি|ফেসবুক কি|ফেসবুক কী|গল্প বলো|একটা গল্প বলো)\b/i.test(text) ||
      /\?$/.test(text)
    ) {
      return { kind: 'reply', confidence: 1 };
    }

    const explicit = /\b(run|execute|please run|চালু করো|ওপেন করো|খুলো)\b/i.test(text);

    let best: { command: string; score: number; arguments: Record<string, unknown> } | null = null;

    for (const command of input.commands) {
      const score = this.score(text, command, explicit);
      if (score > 0 && (!best || score > best.score)) {
        best = { command: command.name, score, arguments: this.extractArguments(text, command) };
      }
    }

    if (!best) return { kind: 'reply', confidence: 1 };
    return { kind: 'command', command: best.command, arguments: best.arguments, confidence: Math.min(1, best.score) };
  }

  private score(text: string, command: CommandDescriptor, explicit: boolean): number {
    const quoted = new RegExp(`\\b${command.name.replace(/_/g, '[ _-]?')}\\b`, 'i');
    if (quoted.test(text)) return 0.95;

    let best = 0;
    for (const pattern of command.patterns ?? []) {
      try {
        const re = new RegExp(pattern, 'i');
        if (re.test(text)) best = Math.max(best, re.source.includes('^') ? 0.8 : 0.75);
      } catch {}
    }
    if (best === 0) return 0;
    if (explicit) best = Math.min(1, best + 0.15);
    return best;
  }

  private extractArguments(text: string, command: CommandDescriptor): Record<string, unknown> {
    const original = this.currentOriginal ?? text;
    const args: Record<string, unknown> = {};

    const quoted = [...original.matchAll(/["“']([^"“”']{2,80})["”']/g)].map((m) => m[1].trim());
    const stringParams = Object.entries(command.parameters)
      .filter(([, spec]) => spec.type === 'string' && spec.required)
      .map(([name]) => name);

    for (let i = 0; i < stringParams.length; i += 1) {
      if (quoted[i]) {
        args[stringParams[i]] = quoted[i];
        continue;
      }
      const rest = original
        .replace(/^\s*(please\s+|দয়া করে\s+)?/i, '')
        .replace(new RegExp(`^(open|launch|start|search( the web)?( for)?|create|make|set|add|list|show|get|remind me to|খুলো|ওপেন করো|খুঁজো|সার্চ করো)\\b`, 'i'), '')
        .replace(/["“”']/g, '')
        .trim();
      if (rest) args[stringParams[i]] = rest.slice(0, 160);
      break;
    }
    return args;
  }

  private currentOriginal: string | undefined;

  setOriginalUtterance(text: string): void {
    this.currentOriginal = text;
  }

  private composeEnglishReply(userText: string, previousUserText = ''): string {
    const text = userText.trim().toLowerCase();
    const prev = previousUserText.trim().toLowerCase();
    if (!text) return "I didn't catch that. Could you please say that again?";

    if (/\b(how are you|how're you|how is it going)\b/i.test(text)) {
      return "I'm doing great, thank you! How can I assist you today?";
    }
    if (/^(hi|hello|hey)\b/i.test(text)) {
      return "Hello! I'm ready to help. What can I do for you?";
    }
    if (/\b(what is facebook|tell me about facebook|explain facebook)\b/i.test(text)) {
      return "Facebook is a social media platform that allows people to connect with friends and family, share photos and videos, and communicate through messages.";
    }
    if (/\b(tell me a (short )?story|story)\b/i.test(text)) {
      return "Once upon a time in a small coastal village, an old fisherman found a glowing bottle tangled in his net. Inside was a map leading to ancient books of wisdom.";
    }
    if (/\b(laptop.*(slow|lag|freeze|hang)|computer.*(slow|lag))\b/i.test(text)) {
      return "I can help with that. First, check if background apps or excessive tabs are running, and consider a quick restart.";
    }
    if (/\b(what is python|tell me about python)\b/i.test(text)) {
      return "Python is a high-level programming language widely used for web development, data science, AI, and automation.";
    }
    if (/\b(who created (it|python|javascript|linux))\b/i.test(text)) {
      if (prev.includes('python') || text.includes('python')) return "Python was created by Guido van Rossum in 1991.";
      if (prev.includes('javascript') || text.includes('javascript')) return "JavaScript was created by Brendan Eich in 1995.";
      if (prev.includes('linux') || text.includes('linux')) return "Linux was created by Linus Torvalds in 1991.";
    }
    if (/\b(who are you|what is your name)\b/i.test(text)) {
      return "I am your AI voice assistant. Feel free to ask me anything!";
    }
    return "I understand. How can I help you explore this further?";
  }

  private composeBanglaReply(userText: string, previousUserText = ''): string {
    const text = userText.trim().toLowerCase();
    const prev = previousUserText.trim().toLowerCase();
    if (!text) return 'আমি শুনতে পাইনি। অনুগ্রহ করে আবার বলুন।';

    if (/\b(kemon acho|kemon achen|কেমন আছো|কেমন আছেন|ki khobor|কী খবর)\b/i.test(text)) {
      return 'আমি ভালো আছি। তুমি কেমন আছো?';
    }
    if (/^(hi|hello|hey|হে|হ্যালো|হাই|সালাম|assalamu alaikum|assalamualaikum)\b/i.test(text)) {
      return 'আসসালামু আলাইকুম! আমি প্রস্তুত আছি। কীভাবে সাহায্য করতে পারি?';
    }
    if (/\b(facebook ki|facebook কী|ফেসবুক কি|ফেসবুক কী|what is facebook)\b/i.test(text)) {
      return 'ফেসবুক একটি সামাজিক যোগাযোগমাধ্যম, যার মাধ্যমে মানুষ পরিবার ও বন্ধুদের সাথে যুক্ত হতে পারে, ছবি ও ভিডিও শেয়ার করতে পারে এবং মেসেজের মাধ্যমে যোগাযোগ করতে পারে।';
    }
    if (/\b(গল্প বলো|একটা গল্প বলো|story)\b/i.test(text)) {
      return 'একবার এক কৃষক ও তার পোষা কুকুরের মধ্যে গভীর বন্ধুত্ব ছিল। একদিন কৃষক মাঠে কাজ করার সময় বৃষ্টি নামল, আর কুকুরটি দ্রুত গিয়ে কৃষকের ছাতা নিয়ে এলো। ভালোবাসা ও দায়িত্ববোধ শুধু মানুষের নয়, প্রাণীদেরও থাকে।';
    }
    if (/\b(laptop.*(slow|hang)|ল্যাপটপ.*(স্লো|হ্যাং)|computer.*slow)\b/i.test(text)) {
      return 'অবশ্যই সাহায্য করছি। ল্যাপটপে ব্যাকগ্রাউন্ডে বেশি অ্যাপ বা ক্রোম ট্যাব খোলা থাকলে সেগুলো বন্ধ করে দেখতে পারো।';
    }
    if (/\b(what is python|python ki|পাইথন কী|পাইথন কি)\b/i.test(text)) {
      return 'পাইথন হলো একটি সহজ ও শক্তিশালী প্রোগ্রামিং ল্যাঙ্গুয়েজ। এটি ওয়েব ডেভেলপমেন্ট, এআই ও অটোমেশনে ব্যবহৃত হয়।';
    }
    if (/\b(who created it|ke banaise|কে বানাইছে|কে তৈরি করেছে|কে বানিয়েছে)\b/i.test(text)) {
      if (prev.includes('python') || prev.includes('পাইথন')) return 'পাইথন ১৯৯১ সালে গুইডো ভ্যান রসাম তৈরি করেছিলেন।';
      if (prev.includes('javascript') || prev.includes('জাভাস্ক্রিপ্ট')) return 'জাভাস্ক্রিপ্ট ১৯৯৫ সালে ব্রেন্ডন আইক তৈরি করেছিলেন।';
      if (prev.includes('linux') || prev.includes('লিনাক্স')) return 'লিনাক্স ১৯৯১ সালে লিনাস টরভাল্ডস তৈরি করেছিলেন।';
    }
    if (/\b(who are you|tumi ke|তুমি কে|তোমার নাম কি)\b/i.test(text)) {
      return 'আমি আপনার এআই ভয়েস অ্যাসিস্ট্যান্ট। আপনি যে কোনো প্রশ্ন করতে পারেন।';
    }
    return `আমি আপনার কথা বুঝতে পেরেছি। এ বিষয়ে আর কী জানতে চান বলুন?`;
  }
}
