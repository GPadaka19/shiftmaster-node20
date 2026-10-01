"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, NativeSelect } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { FormState } from "@/lib/forms";
import type { Mode } from "@/lib/period/resolve";
import { saveHoliday, savePeriod } from "./actions";

export type PeriodDefaults = { id?: number; name: string; mode: Mode; startDate: string; endDate: string };

export function PeriodForm({ defaults }: { defaults?: PeriodDefaults }) {
  const [state, onSubmit, pending] = useFormAction(savePeriod);
  const errors = state.fieldErrors ?? {};
  const [mode, setMode] = useState(defaults?.mode ?? "lecture");

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama periode" htmlFor="name" error={errors.name} className="sm:col-span-2">
          <Input id="name" name="name" placeholder="Ganjil 2026/2027" defaultValue={defaults?.name} required className="h-11" />
        </Field>
        <Field label="Mode" htmlFor="mode" error={errors.mode} className="sm:col-span-2">
          <NativeSelect id="mode" name="mode" value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="lecture">Masa Kuliah (lecture)</option>
            <option value="maintenance">Libur Semester (maintenance)</option>
          </NativeSelect>
        </Field>
        <Field label="Mulai" htmlFor="startDate" error={errors.startDate}>
          <Input id="startDate" name="startDate" type="date" defaultValue={defaults?.startDate} required className="h-11" />
        </Field>
        <Field label="Selesai" htmlFor="endDate" error={errors.endDate}>
          <Input id="endDate" name="endDate" type="date" defaultValue={defaults?.endDate} required className="h-11" />
        </Field>
      </div>
      <FormMessage error={state.error} success={state.success} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11 px-4">
          {pending ? "Menyimpan…" : defaults?.id ? "Simpan perubahan" : "Tambah periode"}
        </Button>
        {defaults?.id && (
          <Button asChild variant="ghost" className="h-11 px-4">
            <Link href="/admin/calendar">Batal</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

export function HolidayForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHoliday, {});
  const errors = state.fieldErrors ?? {};
  const value = (name: string) => state.values?.[name] ?? "";

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <Field label="Tanggal" htmlFor="holiday-date" error={errors.date}>
          <Input id="holiday-date" name="date" type="date" defaultValue={value("date")} required className="h-11" />
        </Field>
        <Field label="Nama libur" htmlFor="holiday-name" error={errors.name}>
          <Input id="holiday-name" name="name" placeholder="Hari Raya Natal" defaultValue={value("name")} required className="h-11" />
        </Field>
        <Field label="Keterangan (opsional)" htmlFor="holiday-description" error={errors.description} className="sm:col-span-2">
          <Input id="holiday-description" name="description" defaultValue={value("description")} className="h-11" />
        </Field>
      </div>
      <FormMessage error={state.error} success={state.success} />
      <Button type="submit" disabled={pending} className="h-11 justify-self-start px-4">
        {pending ? "Menyimpan…" : "Tambah libur"}
      </Button>
    </form>
  );
}

/** Asks before deleting; the action re-renders the page. */
export function DeleteButton({ label, confirmText, onDelete }: { label: string; confirmText: string; onDelete: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={label}
      title={label}
      className="size-10 text-muted-foreground hover:text-destructive"
      onClick={() => {
        if (window.confirm(confirmText)) startTransition(onDelete);
      }}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );
}
