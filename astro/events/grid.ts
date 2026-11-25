/**
 * Month grid and date formatting for the event views. Moved from the Astro showcase
 * (examples/astro-events/src/lib/calendar.ts); calendar links and ICS now come from Core's feed.
 */
import type { PublicEvent } from "../feed";
import { civilDate } from "../event-list";

const SUNDAY_FIRST_REGIONS = new Set(["US", "CA", "JP", "KR", "TW", "IL", "SA", "PH"]);

export interface CalendarCell {
	date: string;
	inMonth: boolean;
	dayNumber: number;
	events: PublicEvent[];
}

export function normalizeLocale(value: string | undefined): string {
	try {
		return Intl.getCanonicalLocales(value || "en-GB")[0] ?? "en-GB";
	} catch {
		return "en-GB";
	}
}

export function normalizeTimeZone(value: string | undefined): string {
	try {
		new Intl.DateTimeFormat("en", { timeZone: value || "UTC" });
		return value || "UTC";
	} catch {
		return "UTC";
	}
}

export function isMonthKey(value: string | null | undefined): value is string {
	return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1000);
}

export function addMonths(value: string, amount: number): string {
	const [year, month] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year!, month! - 1 + amount, 1));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The month a given instant falls in, in a time zone ("2026-11"). */
export function monthOf(now: Date, timeZone: string): string {
	return localDate(now.toISOString(), timeZone).slice(0, 7);
}

/** Whole weeks around a month, starting on the locale's first day of the week. */
export function calendarRange(month: string, locale: string): { from: string; through: string } {
	const [year, monthNumber] = month.split("-").map(Number);
	const first = new Date(Date.UTC(year!, monthNumber! - 1, 1));
	const last = new Date(Date.UTC(year!, monthNumber!, 0));
	const offset = (first.getUTCDay() - firstDayOfWeek(locale) + 7) % 7;
	const from = new Date(Date.UTC(year!, monthNumber! - 1, 1 - offset));
	const cells = Math.ceil((offset + last.getUTCDate()) / 7) * 7;
	const through = new Date(from);
	through.setUTCDate(through.getUTCDate() + cells - 1);
	return { from: dateKey(from), through: dateKey(through) };
}

export function monthDateRange(month: string): { from: string; through: string } {
	const [year, monthNumber] = month.split("-").map(Number);
	const last = new Date(Date.UTC(year!, monthNumber!, 0));
	return {
		from: `${month}-01`,
		through: `${month}-${String(last.getUTCDate()).padStart(2, "0")}`,
	};
}

/** 0 = Sunday … 6 = Saturday. */
export function firstDayOfWeek(locale: string): number {
	try {
		const localeObject = new Intl.Locale(locale) as Intl.Locale & {
			getWeekInfo?: () => { firstDay: number };
			weekInfo?: { firstDay: number };
		};
		const firstDay = localeObject.getWeekInfo?.().firstDay ?? localeObject.weekInfo?.firstDay;
		if (firstDay && firstDay >= 1 && firstDay <= 7) return firstDay % 7;
		const region = localeObject.region?.toUpperCase();
		if (region && SUNDAY_FIRST_REGIONS.has(region)) return 0;
	} catch {
		// Invalid locales use the documented Monday-first fallback.
	}
	return 1;
}

export function weekdayHeadings(locale: string, width: "short" | "long" = "short"): string[] {
	const first = firstDayOfWeek(locale);
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(Date.UTC(2023, 0, 1 + first + index));
		return new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(date);
	});
}

export function buildCalendar(month: string, locale: string, events: PublicEvent[]): CalendarCell[][] {
	const range = calendarRange(month, locale);
	const [year, monthNumber] = month.split("-").map(Number);
	const first = new Date(`${range.from}T00:00:00Z`);
	const last = new Date(`${range.through}T00:00:00Z`);
	const days = Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;
	const cells: CalendarCell[] = [];
	for (let index = 0; index < days; index += 1) {
		const date = new Date(first);
		date.setUTCDate(first.getUTCDate() + index);
		const key = dateKey(date);
		cells.push({
			date: key,
			inMonth: date.getUTCMonth() === monthNumber! - 1 && date.getUTCFullYear() === year,
			dayNumber: date.getUTCDate(),
			events: events.filter((event) => eventTouchesDate(event, key)),
		});
	}
	const weeks: CalendarCell[][] = [];
	for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
	return weeks;
}

export function eventTouchesDate(event: PublicEvent, date: string): boolean {
	const start = eventStartDate(event);
	const end = eventEndDate(event);
	return Boolean(start && end && start <= date && end >= date);
}

/** The event's first and last calendar day where it takes place (all-day ends are inclusive). */
export function eventStartDate(event: PublicEvent): string {
	return event.allDay ? event.start.slice(0, 10) : localDate(event.start, event.timezone);
}

export function eventEndDate(event: PublicEvent): string {
	return event.allDay ? event.end.slice(0, 10) : localDate(event.end, event.timezone);
}

export function displayDate(value: string, locale: string, timeZone: string, allDay: boolean, style: "medium" | "full" = "medium"): string {
	const date = allDay ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : new Date(value);
	try {
		return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: allDay ? "UTC" : timeZone }).format(date);
	} catch {
		return value.slice(0, 10);
	}
}

/** "18:15–19:15 CET"; empty for all-day events. Each end shows its zone when the two differ. */
export function eventTimeRange(event: PublicEvent, locale: string): string {
	if (event.allDay) return "";
	try {
		const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: event.timezone });
		const zoneFormat = new Intl.DateTimeFormat(locale, { timeZone: event.timezone, timeZoneName: "short" });
		const start = new Date(event.start);
		const end = new Date(event.end);
		const zoneName = (date: Date) => zoneFormat.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? event.timezone;
		const startZone = zoneName(start);
		const endZone = zoneName(end);
		return startZone === endZone
			? `${time.format(start)}–${time.format(end)} ${startZone}`
			: `${time.format(start)} ${startZone}–${time.format(end)} ${endZone}`;
	} catch {
		return "";
	}
}

export function monthLabel(month: string, locale: string): string {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
		.format(new Date(Date.UTC(year!, monthNumber! - 1, 1)));
}

export function addCalendarDay(value: string): string {
	const date = new Date(`${value}T00:00:00Z`);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime())) return "";
	date.setUTCDate(date.getUTCDate() + 1);
	return dateKey(date);
}

function localDate(instant: string, timezone: string): string {
	if (!Number.isFinite(new Date(instant).getTime())) return "";
	try {
		return civilDate(instant, timezone);
	} catch {
		return "";
	}
}

export function dateKey(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
