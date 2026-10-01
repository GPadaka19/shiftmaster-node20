"use client";

import { Field, FormMessage, NativeSelect } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { Pool } from "@/lib/members/labels";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/time";
import { saveDefaultMaxG2, saveMemberRules } from "./actions";

export type DayRule = { shift: string; area: string; lock: boolean };

type Option = { code: string; label: string };

export function DefaultMaxG2Form({ value }: { value: number }) {
  const [state, onSubmit, pending] = useFormAction(saveDefaultMaxG2);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Batas G2 per minggu" htmlFor="default-maxG2" error={state.fieldErrors?.maxG2} className="w-48">
        <Input id="default-maxG2" name="maxG2" type="number" min={0} max={5} defaultValue={value} required className="h-10" />
      </Field>
      <Button type="submit" disabled={pending} className="h-10 px-4">
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>
      <div className="basis-full">
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}

export function MemberRuleForm({
  memberId,
  nickname,
  pool,
  days,
  maxG2,
  defaultMaxG2,
  shifts,
  buildings,
}: {
  memberId: number;
  nickname: string;
  pool: Pool;
  days: Record<number, DayRule>;
  maxG2: number | null;
  defaultMaxG2: number;
  shifts: Option[];
  buildings: Option[];
}) {
  const [state, onSubmit, pending] = useFormAction(saveMemberRules.bind(null, memberId));
  const id = (name: string) => `m${memberId}-${name}`;

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-3 px-4 py-3 lg:grid-cols-[9rem_repeat(5,minmax(0,1fr))_6rem]">
      <div className="grid gap-2">
        <span className="font-medium">{nickname}</span>
        {pool === "lab" && (
          <label className="grid gap-1 text-xs text-muted-foreground" htmlFor={id("maxG2")}>
            Batas G2
            <Input
              id={id("maxG2")}
              name="maxG2"
              type="number"
              min={0}
              max={5}
              placeholder={`${defaultMaxG2} (default)`}
              defaultValue={maxG2 ?? ""}
              aria-invalid={state.fieldErrors?.maxG2 ? true : undefined}
              className="h-9 w-full"
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((weekday) => {
          const day = days[weekday] ?? { shift: "", area: "", lock: false };
          return (
            <fieldset key={weekday} className="grid gap-1.5">
              <legend className="mb-1 text-xs text-muted-foreground lg:sr-only">{WEEKDAY_NAMES[weekday]}</legend>
              <NativeSelect
                name={`shift-${weekday}`}
                defaultValue={day.shift}
                aria-label={`Shift ${nickname} hari ${WEEKDAY_NAMES[weekday]}`}
                className="h-9"
              >
                <option value="">Libur</option>
                {shifts.map((shift) => (
                  <option key={shift.code} value={shift.code}>
                    {shift.label}
                  </option>
                ))}
              </NativeSelect>
              {pool === "pkl" && (
                <NativeSelect
                  name={`area-${weekday}`}
                  defaultValue={day.area}
                  aria-label={`Gedung ${nickname} hari ${WEEKDAY_NAMES[weekday]}`}
                  className="h-9"
                >
                  <option value="">Gedung…</option>
                  {buildings.map((building) => (
                    <option key={building.code} value={building.code}>
                      {building.label}
                    </option>
                  ))}
                </NativeSelect>
              )}
              {pool === "lab" && (
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" name={`lock-${weekday}`} defaultChecked={day.lock} className="size-4 accent-foreground" />
                  Kunci G2
                  <span className="sr-only"> hari {WEEKDAY_SHORT[weekday]}</span>
                </label>
              )}
            </fieldset>
          );
        })}
      </div>

      <Button type="submit" variant="outline" disabled={pending} className="h-9 px-3 lg:justify-self-end">
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>

      {(state.error || state.success || state.fieldErrors?.maxG2) && (
        <div className="lg:col-span-7">
          <FormMessage error={state.error ?? state.fieldErrors?.maxG2} success={state.success} />
        </div>
      )}
    </form>
  );
}
