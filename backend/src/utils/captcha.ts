import crypto from 'crypto';

interface CaptchaChallenge {
  question: string;
  answer: number;
  expiresAt: number;
}

// In-memory store for captcha challenges (keyed by token)
const captchaStore = new Map<string, CaptchaChallenge>();

// Clean up expired captchas every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, challenge] of captchaStore) {
    if (challenge.expiresAt < now) {
      captchaStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a simple math captcha challenge.
 * Returns a token (to identify the challenge) and the question string.
 */
export function generateCaptchaChallenge(): { token: string; question: string } {
  const operators = ['+', '-', '×'] as const;
  const op = operators[Math.floor(Math.random() * operators.length)];

  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1;  // 1-50
      b = Math.floor(Math.random() * 50) + 1;  // 1-50
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 10; // 10-59
      b = Math.floor(Math.random() * a);        // 0 to a-1 (result always positive)
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 12) + 2;  // 2-13
      b = Math.floor(Math.random() * 12) + 2;  // 2-13
      answer = a * b;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  const question = `${a} ${op} ${b} = ?`;
  const token = crypto.randomBytes(16).toString('hex');

  captchaStore.set(token, {
    question,
    answer,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  return { token, question };
}

/**
 * Verify a captcha answer against a stored challenge.
 * Single-use: the challenge is deleted after verification regardless of result.
 */
export function verifyCaptcha(token: string, userAnswer: number): boolean {
  const challenge = captchaStore.get(token);
  if (!challenge) return false;

  // Delete immediately (single-use)
  captchaStore.delete(token);

  // Check expiry
  if (challenge.expiresAt < Date.now()) return false;

  return challenge.answer === userAnswer;
}
