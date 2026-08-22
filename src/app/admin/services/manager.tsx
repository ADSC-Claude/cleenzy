"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import { saveService, toggleService } from "../actions";
import { peso } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/status";
import {
  Alert, Badge, Button, Card, CardTitle, Field, Input, Select, Textarea,
} from "@/components/ui";
import type { Service, ServiceUnit } from "@/lib/types";

const UNITS: ServiceUnit[] = ["per_kg", "per_piece", "per_pair", "per_load"];

interface Draft {
  name: string; description: string; price: string; unit: ServiceUnit;
  turnaround_hours: string; min_quantity: string; sort_order: string;
  is_active: boolean;
}

const blank: Draft = {
  name: "", description: "", price: "", unit: "per_kg",
  turnaround_hours: "24", min_quantity: "1", sort_order: "99", is_active: true,
};

function toDraft(s: Service): Draft {
  return {
    name: s.name,
    description: s.description,
    price: String(s.price),
    unit: s.unit,
    turnaround_hours: String(s.turnaround_hours),
    min_quantity: String(s.min_quantity),
    sort_order: String(s.sort_order),
    is_active: s.is_active,
  };
}

export function ServicesManager({ services }: { services: Service[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function beginEdit(s: Service) {
    setCreating(false); setEditingId(s.id); setDraft(toDraft(s));
    setError(null); setNotice(null);
  }

  function beginCreate() {
    setEditingId(null); setCreating(true); setDraft(blank);
    setError(null); setNotice(null);
  }

  function cancel() { setEditingId(null); setCreating(false); setError(null); }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveService(editingId, {
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: Number(draft.price) || 0,
        unit: draft.unit,
        turnaround_hours: Number(draft.turnaround_hours) || 24,
        min_quantity: Number(draft.min_quantity) || 1,
        sort_order: Number(draft.sort_order) || 0,
        is_active: draft.is_active,
      });
      if (result.ok) {
        setNotice("Saved. The change is live on the website now.");
        cancel();
      } else {
        setError(result.error);
      }
    });
  }

  const editor = (
    <Card className="border-accent-300 bg-accent-50/40">
      <CardTitle>{creating ? "New service" : "Edit service"}</CardTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">
          <Input value={draft.name}
                 onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                 placeholder="Wash & Fold" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Shown on the services page." />
        </Field>
        <Field label="Price" required>
          <Input type="number" min={0} step={1} value={draft.price}
                 onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        </Field>
        <Field label="Unit" required>
          <Select value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value as ServiceUnit })}>
            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </Select>
        </Field>
        <Field label="Turnaround (hours)" hint="24 shows as next day.">
          <Input type="number" min={1} step={1} value={draft.turnaround_hours}
                 onChange={(e) => setDraft({ ...draft, turnaround_hours: e.target.value })} />
        </Field>
        <Field label="Minimum quantity" hint="Customers below this are charged the minimum.">
          <Input type="number" min={0} step={0.5} value={draft.min_quantity}
                 onChange={(e) => setDraft({ ...draft, min_quantity: e.target.value })} />
        </Field>
        <Field label="Sort order">
          <Input type="number" step={1} value={draft.sort_order}
                 onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
        </Field>
        <Field label="Visible on the website">
          <Select
            value={draft.is_active ? "yes" : "no"}
            onChange={(e) => setDraft({ ...draft, is_active: e.target.value === "yes" })}
          >
            <option value="yes">Yes</option>
            <option value="no">Hidden</option>
          </Select>
        </Field>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={save} disabled={pending || !draft.name.trim()}>
          {pending ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                   : <><Save size={16} /> Save</>}
        </Button>
        <Button variant="secondary" onClick={cancel} disabled={pending}>
          <X size={16} /> Cancel
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {!creating && !editingId && (
        <Button onClick={beginCreate}><Plus size={17} /> Add service</Button>
      )}
      {creating && editor}

      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((s) =>
          editingId === s.id ? (
            <div key={s.id} className="sm:col-span-2">{editor}</div>
          ) : (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{s.name}</p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {peso(s.price)} {UNIT_LABEL[s.unit]}
                  </p>
                </div>
                {!s.is_active && (
                  <Badge className="bg-ink-100 text-ink-600">Hidden</Badge>
                )}
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-ink-600">{s.description}</p>

              <p className="mt-2 text-xs text-ink-500">
                {s.turnaround_hours <= 24 ? "Next day" : `${Math.ceil(s.turnaround_hours / 24)} days`}
                {Number(s.min_quantity) > 1 && ` · min ${Number(s.min_quantity)}`}
              </p>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => beginEdit(s)}>
                  Edit
                </Button>
                <Button
                  size="sm" variant="ghost" disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await toggleService(s.id, !s.is_active);
                      if (!r.ok) setError(r.error);
                    })
                  }
                >
                  {s.is_active ? "Hide" : "Show"}
                </Button>
              </div>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
