import { useState, useCallback } from 'react';

/**
 * Rate limiting hook to prevent spam submissions
 * @param {number} maxAttempts - Max attempts allowed in time window
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} cooldownMs - Cooldown after max attempts reached
 */
export function useRateLimit(maxAttempts = 5, windowMs = 60000, cooldownMs = 300000) {
  const [attempts, setAttempts] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockUntil, setBlockUntil] = useState(null);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    // Check if currently blocked
    if (blockUntil && now < blockUntil) {
      const remainingSeconds = Math.ceil((blockUntil - now) / 1000);
      return {
        allowed: false,
        message: `Quá nhiều lần thử! Vui lòng đợi ${remainingSeconds} giây.`
      };
    }
    
    // Reset block if cooldown expired
    if (blockUntil && now >= blockUntil) {
      setIsBlocked(false);
      setBlockUntil(null);
      setAttempts([]);
    }
    
    // Filter attempts within window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      const newBlockUntil = now + cooldownMs;
      setIsBlocked(true);
      setBlockUntil(newBlockUntil);
      return {
        allowed: false,
        message: `Quá nhiều lần thử! Vui lòng đợi ${Math.ceil(cooldownMs / 1000)} giây.`
      };
    }
    
    return { allowed: true };
  }, [attempts, blockUntil, maxAttempts, windowMs, cooldownMs]);

  const recordAttempt = useCallback(() => {
    setAttempts(prev => [...prev, Date.now()]);
  }, []);

  const getRemainingAttempts = useCallback(() => {
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    return Math.max(0, maxAttempts - recentAttempts.length);
  }, [attempts, maxAttempts, windowMs]);

  return {
    checkRateLimit,
    recordAttempt,
    getRemainingAttempts,
    isBlocked
  };
}

/**
 * Honeypot hook for bot detection
 * Bots typically fill all fields, including hidden ones
 */
export function useHoneypot() {
  const [honeypotValue, setHoneypotValue] = useState('');

  const isBot = useCallback(() => {
    // If honeypot field is filled, it's likely a bot
    return honeypotValue.length > 0;
  }, [honeypotValue]);

  const HoneypotField = useCallback(() => (
    <input
      type="text"
      name="website_url"
      value={honeypotValue}
      onChange={(e) => setHoneypotValue(e.target.value)}
      autoComplete="off"
      tabIndex={-1}
      style={{
        position: 'absolute',
        left: '-9999px',
        opacity: 0,
        height: 0,
        width: 0,
        zIndex: -1
      }}
      aria-hidden="true"
    />
  ), [honeypotValue]);

  return { isBot, HoneypotField, honeypotValue };
}

/**
 * Combined anti-spam hook
 */
export function useAntiSpam(rateConfig = {}) {
  const { 
    maxAttempts = 5, 
    windowMs = 60000, 
    cooldownMs = 300000 
  } = rateConfig;

  const rateLimit = useRateLimit(maxAttempts, windowMs, cooldownMs);
  const honeypot = useHoneypot();

  const validateSubmission = useCallback(() => {
    // Check honeypot first
    if (honeypot.isBot()) {
      console.warn('Bot detected via honeypot');
      return {
        valid: false,
        error: 'Có lỗi xảy ra. Vui lòng thử lại sau.'
      };
    }

    // Check rate limit
    const rateLimitResult = rateLimit.checkRateLimit();
    if (!rateLimitResult.allowed) {
      return {
        valid: false,
        error: rateLimitResult.message
      };
    }

    return { valid: true };
  }, [honeypot, rateLimit]);

  return {
    validateSubmission,
    recordAttempt: rateLimit.recordAttempt,
    HoneypotField: honeypot.HoneypotField,
    isBlocked: rateLimit.isBlocked,
    getRemainingAttempts: rateLimit.getRemainingAttempts
  };
}
