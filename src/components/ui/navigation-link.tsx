"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { NavigationFeedback } from "./navigation-feedback";

function LinkFeedback() {
  const { pending } = useLinkStatus();
  return <NavigationFeedback pending={pending} />;
}

export default function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<LinkFeedback /></Link>;
}
