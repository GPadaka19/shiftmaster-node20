"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, FormMessage, NativeSelect, PinInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { useFormAction } from "@/hooks/use-form-action";
import { DEFAULT_PIN } from "@/lib/auth/constants";
import { usesPin, type Role } from "@/lib/auth/roles";
import type { FormState } from "@/lib/forms";
import { POOL_LABEL, type Pool } from "@/lib/members/labels";
import { NEWCOMER_WEEKS } from "@/lib/roster/newcomer";
import { resetMemberPin, setMemberActive } from "./actions";

export type MemberDefaults = {
  nickname: string;
  fullName: string;
  email: string;
  role: Role;
  pool: Pool | "none";
  dutyLabel: string;
  startedOn: string;
};

export const EMPTY_MEMBER: MemberDefaults = { nickname: "", fullName: "", email: "", role: "staff", pool: "lab", dutyLabel: "", startedOn: "" };

export function MemberForm({
  action,
  defaults = EMPTY_MEMBER,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: MemberDefaults;
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const [role, setRole] = useState(defaults.role);
  const [pool, setPool] = useState(defaults.pool);
  const errors = state.fieldErrors ?? {};
  const invalid = (name: string) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nickname" htmlFor="nickname" error={errors.nickname} hint="Dipakai untuk login staf.">
          <Input id="nickname" name="nickname" defaultValue={defaults.nickname} required className="h-11" {...invalid("nickname")} />
        </Field>
        <Field label="Nama lengkap" htmlFor="fullName" error={errors.fullName}>
          <Input id="fullName" name="fullName" defaultValue={defaults.fullName} required className="h-11" {...invalid("fullName")} />
        </Field>
        <Field label="Peran" htmlFor="role" error={errors.role}>
          <NativeSelect
            id="role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as MemberDefaults["role"])}
          >
            <option value="staff">Staf (login PIN)</option>
            <option value="admin">Admin (login Google)</option>
            <option value="superadmin">Superadmin (login Google)</option>
          </NativeSelect>
        </Field>
        <Field label="Pool roster" htmlFor="pool" error={errors.pool} hint="Menentukan di mana anggota dijadwalkan.">
          <NativeSelect id="pool" name="pool" value={pool} onChange={(event) => setPool(event.target.value as MemberDefaults["pool"])}>
            {Object.entries(POOL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            <option value="none">Tidak masuk roster</option>
          </NativeSelect>
        </Field>
        <Field
          label={usesPin(role) ? "Email (opsional)" : "Email Google"}
          htmlFor="email"
          error={errors.email}
          hint={usesPin(role) ? undefined : "Harus sama dengan akun Google yang dipakai login."}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={defaults.email}
            required={!usesPin(role)}
            className="h-11"
            {...invalid("email")}
          />
        </Field>
        <Field label="Jabatan (opsional)" htmlFor="dutyLabel" error={errors.dutyLabel} hint='Misalnya "Admin Gedung 2".'>
          <Input id="dutyLabel" name="dutyLabel" defaultValue={defaults.dutyLabel} className="h-11" />
        </Field>
        {pool === "lab" && (
          <Field
            label="Mulai bertugas"
            htmlFor="startedOn"
            error={errors.startedOn}
            hint={`Staf Lab baru hanya ditempatkan di Gedung 7 selama ${NEWCOMER_WEEKS} minggu roster pertama. Kosongkan untuk staf lama.`}
          >
            <Input id="startedOn" name="startedOn" type="date" defaultValue={defaults.startedOn} className="h-11" {...invalid("startedOn")} />
          </Field>
        )}
      </div>

      <FormMessage error={state.error} success={state.success} />

      <Button type="submit" disabled={pending} className="h-11 justify-self-start px-4">
        {pending ? "Menyimpan…" : submitLabel}
      </Button>
    </form>
  );
}

export function PinForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid max-w-sm gap-4">
      <Field label="PIN baru" htmlFor="pin" error={state.fieldErrors?.pin} hint="Atau atur PIN tertentu (6–8 angka). Anggota tetap wajib menggantinya saat login.">
        <PinInput id="pin" name="pin" autoComplete="new-password" />
      </Field>
      <FormMessage error={state.error} success={state.success} />
      <Button type="submit" disabled={pending} className="h-11 justify-self-start px-4">
        {pending ? "Menyimpan…" : "Atur PIN"}
      </Button>
    </form>
  );
}

/** For a staff member who forgot their PIN: back to the default, to be replaced at sign-in. */
export function ResetPinButton({ memberId }: { memberId: number }) {
  const { pending, state, run } = useAction();

  return (
    <div className="grid gap-3">
      <ConfirmButton
        variant="outline"
        disabled={pending}
        className="h-11 justify-self-start px-4"
        question="Anggota ini akan keluar dari semua perangkat."
        confirmLabel="Reset PIN"
        onConfirm={() => run(() => resetMemberPin(memberId))}
      >
        {pending ? "Menyimpan…" : `Reset ke PIN awal (${DEFAULT_PIN})`}
      </ConfirmButton>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

export function ActiveToggle({ memberId, active }: { memberId: number; active: boolean }) {
  const { pending, state, run } = useAction();

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant={active ? "destructive" : "outline"}
        disabled={pending}
        className="h-11 justify-self-start px-4"
        onClick={() => run(() => setMemberActive(memberId, !active))}
      >
        {pending ? "Menyimpan…" : active ? "Nonaktifkan anggota" : "Aktifkan lagi"}
      </Button>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
