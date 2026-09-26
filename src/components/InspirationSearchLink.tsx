import React from "react";
import type { AnchorHTMLAttributes } from "react";
import { isMobileDevice } from "../services/platformService";

type InspirationSearchLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * HTTPS links can hand off to provider apps through Universal Links / App Links.
 * Keep mobile navigation in the current context; desktop opens a new tab.
 */
export const InspirationSearchLink: React.FC<InspirationSearchLinkProps> = ({
  children,
  ...props
}) => {
  const mobile = isMobileDevice();

  return (
    <a
      {...props}
      target={mobile ? undefined : "_blank"}
      rel={mobile ? undefined : "noopener noreferrer"}
    >
      {children}
    </a>
  );
};
