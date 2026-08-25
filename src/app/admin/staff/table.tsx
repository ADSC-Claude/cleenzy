"use client";

import { useState, useTransition } from "react";
import { updateStaffRole, setStaffActive } from "../actions";
import { ROLE_LABEL } from "@/lib/roles";
import { phDate, phPhone } from "@/lib/format";
import {
  Alert, Badge, Button, Card, Select, Table, TableWrap, Td, Th,
} from "@/components/ui";
import type { Profile, UserRole } from "@/lib/types";

const ASSIGNABLE: UserRole[] = [
  "owner", "manager", "cashier", "laundry_staff", "rider", "customer",
];

const ROLE_SCOPE: Record<UserRole, string> = {
  owner: "Everything, including settings",
  manager: "Orders, customers, reports, staff",
  cashier: "Orders and payments",
  laundry_staff: "Laundry queue only",
  rider: "Own pickups and deliveries only",
  customer: "Nothing — waiting for a role",
};

export function StaffTable({
  people, currentUserId, currentRole,
}: { people: Profile[]; currentUserId: string; currentRole: UserRole }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function act(
    id: string,
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
  ) {
    setError(null); setNotice(null); setBusyId(id);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) setNotice(done); else setError(result.error);
      setBusyId(null);
    });
  }

  return (
    <>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}

      <Card className="p-0 sm:p-0">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th><Th>Role</Th><Th>Can reach</Th>
                <Th>Joined</Th><Th className="text-right">Account</Th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const isSelf = p.id === currentUserId;
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className="hover:bg-ink-50">
                    <Td>
                      <span className="font-medium text-ink-900">
                        {p.full_name || "—"}
                        {isSelf && (
                          <Badge className="ml-2 bg-accent-100 text-accent-800">You</Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {p.email}{p.phone ? ` · ${phPhone(p.phone)}` : ""}
                      </span>
                    </Td>
                    <Td>
                      <Select
                        className="h-9 w-40 text-xs"
                        value={p.role}
                        disabled={busy || isSelf}
                        title={isSelf ? "You cannot change your own role" : undefined}
                        onChange={(e) =>
                          act(p.id,
                              () => updateStaffRole(p.id, e.target.value as UserRole),
                              `${p.full_name || "Account"} is now ${ROLE_LABEL[e.target.value as UserRole]}.`)
                        }
                      >
                        {ASSIGNABLE
                          .filter((r) => r !== "owner" || currentRole === "owner")
                          .map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                      </Select>
                    </Td>
                    <Td className="text-xs text-ink-600">{ROLE_SCOPE[p.role]}</Td>
                    <Td className="text-xs text-ink-600">{phDate(p.created_at)}</Td>
                    <Td className="text-right">
                      {p.is_active ? (
                        <Button
                          size="sm" variant="ghost" disabled={busy || isSelf}
                          onClick={() =>
                            act(p.id, () => setStaffActive(p.id, false),
                                `${p.full_name || "Account"} deactivated.`)
                          }
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="secondary" disabled={busy}
                          onClick={() =>
                            act(p.id, () => setStaffActive(p.id, true),
                                `${p.full_name || "Account"} reactivated.`)
                          }
                        >
                          Reactivate
                        </Button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </>
  );
}
