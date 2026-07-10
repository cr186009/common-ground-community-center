export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getGreetingLabel(date: Date) {
  const hour = date.getHours();

  if (hour < 12) {
    return {
      kicker: "Morning check-in",
      headline: "Good morning. The house is mostly behaving.",
    };
  }

  if (hour < 18) {
    return {
      kicker: "Afternoon check-in",
      headline: "Good afternoon. Here’s the signal without the noise.",
    };
  }

  return {
    kicker: "Evening check-in",
    headline: "Good evening. Time to see what still needs a pulse check.",
  };
}

export function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
