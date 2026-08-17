import { AppSettings } from '../types';

export function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatDate(timestamp?: number | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatFullDateTime(timestamp?: number | null): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function getTimeRemaining(startTime?: number | null): string {
  if (!startTime) return 'TBA';
  const now = Date.now();
  const diff = startTime - now;
  if (diff <= 0) {
    return 'Starting Soon';
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  let o = '';
  if (days > 0) o += `${days}d `;
  if (hours > 0 || days > 0) o += `${hours}h `;
  o += `${minutes}m `;
  if (days === 0 && hours === 0) o += `${seconds}s`;
  return o.trim() || 'Now';
}

export function copyToClipboard(text: string): Promise<void> {
  if (!text || text === 'N/A' || text.includes('placeholder')) {
    alert('Nothing to copy.');
    return Promise.reject('Nothing to copy');
  }
  return navigator.clipboard.writeText(text).then(() => {
    alert('Copied!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy.');
  });
}

export function shareReferral(code: string, appSettings: AppSettings): void {
  if (!code || code === 'N/A') {
    alert('Referral code not available.');
    return;
  }
  const appName = "Gaming Tournament";
  const signupBonus = appSettings.signupBonus || 10;
  const referralBonus = appSettings.referralBonus || 5;

  const shareUrl = window.location.origin;
  const shareText = `🎮 Join eSports Tournaments on ${appName}!

💰 Sign up Bonus: ₹${signupBonus}
🎁 Per Refer Bonus: ₹${referralBonus}
🔥 Fast & Free Custom Matches!

Use my Referral Code: ${code}

Join here 👇
${shareUrl}`;

  if (navigator.share) {
    navigator.share({
      title: `Join ${appName}!`,
      text: shareText
    }).catch((error) => console.log('Error sharing', error));
  } else {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  }
}
