"use client";

import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, NativeSelect } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { FormState } from "@/lib/forms";
import { NEWCOMER_WEEKS } from "@/lib/roster/newcomer";
import { setMemberActive } from "./actions";

export type MemberDefaults = {
  nickname: string;
  fullName: string;
  email: string;
  role: "staff" | "admin" | "superadmin";
  pool: "lab" | "studio" | "pkl" | "none";
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
            <option value="lab">Lab (Gedung 2 & 7)</option>
            <option value="studio">Studio</option>
            <option value="pkl">PKL</option>
            <option value="none">Tidak masuk roster</option>
          </NativeSelect>
        </Field>
        <Field
          label={role === "staff" ? "Email (opsional)" : "Email Google"}
          htmlFor="email"
          error={errors.email}
          hint={role === "staff" ? undefined : "Harus sama dengan akun Google yang dipakai login."}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={defaults.email}
            required={role !== "staff"}
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
      <Field label="PIN baru" htmlFor="pin" error={state.fieldErrors?.pin} hint="4–8 angka. Anggota bisa menggantinya sendiri nanti.">
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={8}
          autoComplete="new-password"
          required
          className="h-11"
        />
      </Field>
      <FormMessage error={state.error} success={state.success} />
      <Button type="submit" disabled={pending} className="h-11 justify-self-start px-4">
        {pending ? "Menyimpan…" : "Atur PIN"}
      </Button>
    </form>
  );
}

export function ActiveToggle({ memberId, active }: { memberId: number; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({});

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant={active ? "destructive" : "outline"}
        disabled={pending}
        className="h-11 justify-self-start px-4"
        onClick={() => startTransition(async () => setState(await setMemberActive(memberId, !active)))}
      >
        {pending ? "Menyimpan…" : active ? "Nonaktifkan anggota" : "Aktifkan lagi"}
      </Button>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
