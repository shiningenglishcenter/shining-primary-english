"use client";

import { useLinkStatus } from "next/link";

/**
 * Put inside a <Link>: while its page loads, the link pulses with a small
 * spinner, its siblings fade and a bar runs along the top (CSS in globals.css,
 * `.kid-link-pending`). Always rendered, so nothing shifts.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className="kid-link-pending" data-pending={pending ? "true" : undefined} />;
}

/** Thin bar along the top of student pages while any link's page loads. */
export function TopBar() {
  return <div aria-hidden="true" className="kid-topbar" />;
}
