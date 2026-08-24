import * as React from "react";
import { cn } from "@/lib/cn";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import {
  ORDER_STATUS_LABEL, STATUS_TONE, TONE_CLASS,
  PAYMENT_TONE, PAYMENT_STATUS_LABEL,
} from "@/lib/status";

/* ------------------------------------------------------------------ Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent-600 text-white hover:bg-accent-700 disabled:bg-accent-300",
  secondary: "bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 disabled:text-ink-400",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  // 44px tall: comfortably tappable on a phone, which is where most
  // bookings and nearly all staff queue taps happen.
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary", size = "md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors disabled:cursor-not-allowed",
        BUTTON_VARIANT[variant], BUTTON_SIZE[size], className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className, children, ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-ink-200 bg-white p-5 sm:p-6", className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className, children, ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-ink-900", className)} {...props}>
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  className, children, ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-xs font-medium whitespace-nowrap", className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge className={TONE_CLASS[STATUS_TONE[status]]}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

/* ------------------------------------------------------------------- Input */

const FIELD_BASE =
  "w-full rounded-lg border border-ink-200 bg-white px-3 text-ink-900 " +
  "placeholder:text-ink-400 focus:border-accent-500 focus:outline-none " +
  "focus:ring-2 focus:ring-accent-500/20 disabled:bg-ink-50 disabled:text-ink-400";

export function Input({
  className, ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  // 16px on mobile stops iOS Safari zooming in when the field is focused.
  return <input className={cn(FIELD_BASE, "h-11 text-base sm:text-sm", className)} {...props} />;
}

export function Textarea({
  className, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_BASE, "min-h-24 py-2.5 text-base sm:text-sm", className)}
      {...props}
    />
  );
}

export function Select({
  className, children, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD_BASE, "h-11 text-base sm:text-sm", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label, hint, error, required, children, className,
}: {
  label: string; hint?: string; error?: string; required?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-sm font-medium text-ink-800">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-ink-500">{hint}</span>}
      {error && <span className="block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ Layout */

export function PageHeader({
  title, description, action,
}: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title, description, action,
}: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-ink-200 px-6 py-12 text-center">
      <p className="font-medium text-ink-800">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Horizontally scrollable wrapper so wide tables never break the page. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <div className="inline-block min-w-full align-middle px-5 sm:px-0">{children}</div>
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="min-w-full text-left text-sm">{children}</table>;
}

export function Th({
  children, className,
}: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn(
      "whitespace-nowrap border-b border-ink-200 px-3 py-2.5",
      "text-xs font-semibold uppercase tracking-wide text-ink-500", className,
    )}>
      {children}
    </th>
  );
}

export function Td({
  children, className,
}: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-ink-100 px-3 py-3 align-middle", className)}>
      {children}
    </td>
  );
}

export function Alert({
  tone = "info", children,
}: { tone?: "info" | "warn" | "error" | "success"; children: React.ReactNode }) {
  const tones = {
    info: "bg-sky-50 text-sky-900 border-sky-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
    error: "bg-rose-50 text-rose-900 border-rose-200",
    success: "bg-accent-50 text-accent-900 border-accent-200",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}
