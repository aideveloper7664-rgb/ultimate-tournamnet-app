export function notifyAndroid(title, message) {
  if (typeof window.Android !== 'undefined') {
    window.Android.showNotification(title, message);
  }
}

export function notifyTournament(name) {
  if (typeof window.Android !== 'undefined') {
    window.Android.showTournamentNotification("🏆 New Tournament!", name + " added!");
  }
}

export function notifyMessage(sender, text) {
  if (typeof window.Android !== 'undefined') {
    window.Android.showMessageNotification("💬 " + sender, text);
  }
}
